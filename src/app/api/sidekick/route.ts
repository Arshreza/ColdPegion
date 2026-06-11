import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { getSessionUser } from '@/lib/org';
import { buildSidekickTools } from '@/lib/sidekick/tools';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { NextResponse } from 'next/server';

// Detect provider from baseURL and return the correct model instance.
function resolveModel(baseUrl: string, apiKey: string, modelName: string) {
  if (baseUrl.includes('googleapis.com') || baseUrl.includes('generativelanguage')) {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelName);
  }
  const openai = createOpenAI({ baseURL: baseUrl, apiKey });
  return openai.chat(modelName);
}

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceRateLimit(req, 'sidekick', 30, 60_000);
  if (limited) return limited;

  const { messages, page, conversationId } = await req.json();

  const llmConfig = await db.llmConfig.findUnique({ where: { userId: me.id } });
  if (!llmConfig || !llmConfig.apiKey) {
    return NextResponse.json(
      { error: 'Please configure your API keys in Settings before using the AI Sidekick.' },
      { status: 400 }
    );
  }

  const model = resolveModel(
    llmConfig.apiBaseUrl || 'https://api.openai.com/v1',
    decrypt(llmConfig.apiKey),
    llmConfig.modelName || 'gpt-4o'
  );

  const tools = buildSidekickTools({ userId: me.id, organizationId: me.organizationId, role: me.role, page });
  const modelMessages = await convertToModelMessages(messages);

  // Persist conversation history (best-effort — never blocks the response).
  const convoId = await persistUserTurn(me.id, conversationId, messages, page);

  const result = streamText({
    model,
    messages: modelMessages,
    // Agentic multi-step loop: the model can call tools, read results, and keep
    // going (e.g. find leads -> create list -> create agent -> launch) until the
    // task is done.
    stopWhen: stepCountIs(12),
    tools,
    system: `You are the ColdPigeon Sidekick — an autonomous operator embedded in the user's cold-email platform.
You can run the entire product through tools: read stats, manage products, prospects & lists, find leads, build & launch AI agents, check deliverability, sync the inbox, manage the company profile and team, and adjust limits.

OPERATING PRINCIPLES:
- Be proactive and agentic: chain multiple tools to complete a goal end-to-end. If something is missing (e.g. no list before creating an agent), create it.
- Always inspect first when unsure (use list_/get_ tools) so you reference real ids/names.
- Confirm BEFORE destructive actions (delete_product) — call the tool with confirm:false to surface a confirmation, and only proceed after the user agrees.
- After acting, briefly summarize what you did and the concrete result (ids, counts).
- Respect permissions: team/invite actions require an admin; relay the tool's error if not allowed.
- For how-to, setup, billing, deliverability, or troubleshooting questions, call get_help_guide (or list_help_topics) and answer from the official guides — never guess at product behavior. Offer to perform the documented steps yourself when your tools allow it.
- Be concise and professional. Never invent data — rely on tool outputs.
${page ? `\nCONTEXT: The user is currently on the "${page}" page, so prioritize actions relevant to it.` : ''}`,
    onFinish: async ({ text }) => {
      if (convoId && text?.trim()) {
        await db.sidekickMessage
          .create({ data: { conversationId: convoId, role: 'ASSISTANT', content: text } })
          .catch(() => {});
        await db.sidekickConversation.update({ where: { id: convoId }, data: { updatedAt: new Date() } }).catch(() => {});
      }
    },
  });

  return result.toUIMessageStreamResponse({ headers: convoId ? { 'X-Conversation-Id': convoId } : undefined });
}

/** Extract plain text from a UIMessage's parts. */
function textOf(message: any): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ').trim();
  }
  return '';
}

/**
 * Ensure a conversation exists and store the latest user turn. Returns the
 * conversation id, or null if persistence isn't possible.
 */
async function persistUserTurn(
  userId: string,
  conversationId: string | undefined,
  messages: any[],
  page?: string | null
): Promise<string | null> {
  try {
    const last = Array.isArray(messages) ? messages[messages.length - 1] : null;
    const userText = textOf(last);

    let convo = conversationId
      ? await db.sidekickConversation.findFirst({ where: { id: conversationId, userId } })
      : null;
    if (!convo) {
      convo = await db.sidekickConversation.create({
        data: {
          ...(conversationId ? { id: conversationId } : {}),
          userId,
          title: userText.slice(0, 60) || 'New conversation',
        },
      });
    }
    if (userText) {
      await db.sidekickMessage.create({ data: { conversationId: convo.id, role: 'USER', content: userText, pageContext: page || null } });
    }
    return convo.id;
  } catch {
    return null;
  }
}
