import { OpenAI } from "openai";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

interface AuthorContext {
  userId: string;
  productIds?: string[];
  campaignGoal?: string;
}

function getClient(apiBaseUrl: string, apiKey: string) {
  return new OpenAI({ baseURL: apiBaseUrl || "https://api.openai.com/v1", apiKey });
}

async function buildContext(userId: string, productIds?: string[]) {
  const [company, products] = await Promise.all([
    db.companyProfile.findUnique({ where: { userId } }),
    db.product.findMany({
      where: { userId, ...(productIds?.length ? { id: { in: productIds } } : {}) },
      take: 5,
    }),
  ]);
  const productText = products
    .map((p) => `- ${p.name}: ${p.description || ""} (USPs: ${p.usps || "n/a"}; ICP: ${p.icpPrompt || p.targetAudience || "n/a"})`)
    .join("\n");
  const companyText = company
    ? `Company: ${company.companyName}\nIndustry: ${company.industry || "n/a"}\nValue prop: ${company.valuePropositions || "n/a"}\nTone: ${company.toneOfVoice || "professional"}`
    : "No company profile set.";
  return { companyText, productText };
}

/** Generate concise campaign guidelines for the AI agent. */
export async function generateGuidelines({ userId, productIds, campaignGoal }: AuthorContext): Promise<string> {
  const cfg = await db.llmConfig.findUnique({ where: { userId } });
  if (!cfg?.apiKey) throw new Error("Configure your LLM API key in Settings first.");
  const openai = getClient(cfg.apiBaseUrl, decrypt(cfg.apiKey));
  const { companyText, productText } = await buildContext(userId, productIds);

  const completion = await openai.chat.completions.create({
    model: cfg.modelName || "gpt-4o",
    temperature: 0.6,
    max_tokens: 350,
    messages: [
      { role: "system", content: "You write tight, practical guardrails for an AI cold-email SDR. Output 5-8 short bullet rules. No preamble." },
      { role: "user", content: `${companyText}\n\nProducts:\n${productText}\n\nGoal: ${campaignGoal || "Book meetings with a clear, low-friction CTA."}\n\nWrite the agent guidelines as concise bullet rules (tone, length, personalization, what to avoid, CTA).` },
    ],
  });
  return completion.choices[0].message.content?.trim() || "";
}

export interface GeneratedStep {
  waitDays: number;
  subject: string;
  body: string;
}

/** Generate a multi-step cold-email sequence (subjects + bodies + cadence). */
export async function generateSequence({ userId, productIds, campaignGoal }: AuthorContext & { steps?: number }): Promise<GeneratedStep[]> {
  const cfg = await db.llmConfig.findUnique({ where: { userId } });
  if (!cfg?.apiKey) throw new Error("Configure your LLM API key in Settings first.");
  const openai = getClient(cfg.apiBaseUrl, decrypt(cfg.apiKey));
  const { companyText, productText } = await buildContext(userId, productIds);

  const messages = [
    {
      role: "system" as const,
      content:
        "You design high-converting cold-email sequences. Return ONLY raw JSON (no markdown, no code fences): " +
        `{"steps":[{"waitDays":0,"subject":"...","body":"..."}, ...]}. ` +
        "3-4 steps. Step 0 waitDays=0. Use {{firstName}}, {{companyName}}, {{jobTitle}} placeholders. " +
        "Keep each email under 120 words, plain text, one clear CTA. Follow-ups must add new angles, not repeat.",
    },
    { role: "user" as const, content: `${companyText}\n\nProducts:\n${productText}\n\nGoal: ${campaignGoal || "Book a quick call."}\n\nWrite the sequence as JSON.` },
  ];

  let raw = "{}";
  try {
    // Prefer JSON mode; fall back for providers that don't support it.
    const completion = await openai.chat.completions
      .create({ model: cfg.modelName || "gpt-4o", temperature: 0.7, max_tokens: 1200, response_format: { type: "json_object" }, messages })
      .catch(() => openai.chat.completions.create({ model: cfg.modelName || "gpt-4o", temperature: 0.7, max_tokens: 1200, messages }));
    raw = completion.choices[0].message.content || "{}";
  } catch (e) {
    throw new Error(`Sequence generation failed: ${(e as Error).message}`);
  }

  // Tolerate code fences / stray prose around the JSON.
  const jsonText = raw.replace(/```json|```/gi, "").trim();
  const match = jsonText.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(match ? match[0] : jsonText);
    const steps = Array.isArray(parsed.steps) ? parsed.steps : [];
    return steps.map((s: any, i: number) => ({
      waitDays: i === 0 ? 0 : Math.max(1, Number(s.waitDays) || 3),
      subject: String(s.subject || "").slice(0, 200),
      body: String(s.body || "").slice(0, 4000),
    }));
  } catch {
    throw new Error("The model returned an unparseable sequence. Try again.");
  }
}
