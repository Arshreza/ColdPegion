import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePersonalizedEmail } from "@/lib/llm/generator";
import { sendViaAccount } from "@/lib/email/sender";
import { spin } from "@/lib/spintax";
import { z } from "zod";

/** POST /api/agents/[id]/test — send a preview of the agent's first email. */
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await db.agent.findUnique({
    where: { id: params.id, userId: session.user.id },
    include: { emailAccounts: { include: { emailAccount: true } } },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  try {
    const { toEmail } = z
      .object({ toEmail: z.string().email().optional() })
      .parse(await request.json().catch(() => ({})));
    const recipient = toEmail || session.user.email;
    if (!recipient) return NextResponse.json({ error: "No recipient email available." }, { status: 400 });

    const account = agent.emailAccounts.map((ea) => ea.emailAccount).find((a) => a.isActive && a.status !== "DISCONNECTED");
    if (!account) return NextResponse.json({ error: "Agent has no active sender mailbox." }, { status: 400 });

    // Use the first prospect in the agent's lists for a realistic render.
    const prospect = await db.prospect.findFirst({
      where: { userId: session.user.id, listEntries: { some: { prospectList: { agents: { some: { agentId: agent.id } } } } } },
    });

    let subject: string;
    let body: string;

    const prepared = prospect
      ? await db.preparedEmail.findUnique({ where: { agentId_prospectId_step: { agentId: agent.id, prospectId: prospect.id, step: 0 } } })
      : null;

    if (prepared) {
      subject = spin(prepared.subject);
      body = spin(prepared.body);
    } else if (agent.sequenceMode === "EXTERNAL") {
      return NextResponse.json({ error: "EXTERNAL agents send pre-written emails — prepare one (or add a prospect) to test." }, { status: 400 });
    } else if (!prospect) {
      return NextResponse.json({ error: "Add at least one prospect to this agent's list to generate a test." }, { status: 400 });
    } else {
      const gen = await generatePersonalizedEmail({ userId: session.user.id, agentId: agent.id, prospectId: prospect.id, sequenceStep: 0, senderName: account.displayName || undefined });
      subject = spin(gen.subject);
      body = spin(gen.body);
    }

    await sendViaAccount(account, { to: recipient, subject: `[TEST] ${subject}`, text: body });
    return NextResponse.json({ sent: true, to: recipient, from: account.emailAddress });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: (error as Error).message || "Test send failed" }, { status: 500 });
  }
}
