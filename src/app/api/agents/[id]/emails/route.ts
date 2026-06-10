import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/agents/[id]/emails — recent outbound emails for this agent. */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const agent = await db.agent.findUnique({ where: { id: params.id, userId: session.user.id } });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const emails = await db.email.findMany({
      where: { agentId: params.id },
      include: { prospect: { select: { firstName: true, lastName: true, email: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      emails.map((e) => ({
        id: e.id,
        subject: e.subject,
        body: e.body,
        status: e.status,
        toEmail: e.toEmail,
        sequenceStep: e.sequenceStep,
        sentAt: e.sentAt,
        createdAt: e.createdAt,
        prospect: e.prospect
          ? { name: `${e.prospect.firstName ?? ""} ${e.prospect.lastName ?? ""}`.trim() || e.prospect.email, company: e.prospect.companyName }
          : null,
      }))
    );
  } catch (error) {
    console.error("Agent emails error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
