import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/agents/[id]/prepared — prepared (pre-written) emails for an agent. */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await db.agent.findUnique({ where: { id: params.id, userId: session.user.id } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const items = await db.preparedEmail.findMany({
    where: { agentId: params.id },
    orderBy: [{ step: "asc" }, { createdAt: "asc" }],
    take: 1000,
    include: { prospect: { select: { firstName: true, lastName: true, email: true, companyName: true } } },
  });

  const pending = items.filter((i) => i.status === "PENDING").length;
  return NextResponse.json({
    counts: { total: items.length, pending, sent: items.length - pending },
    sequenceMode: agent.sequenceMode,
    items: items.map((i) => ({
      id: i.id,
      step: i.step,
      subject: i.subject,
      body: i.body,
      status: i.status,
      prospect: {
        name: `${i.prospect.firstName ?? ""} ${i.prospect.lastName ?? ""}`.trim() || i.prospect.email,
        email: i.prospect.email,
        company: i.prospect.companyName,
      },
    })),
  });
}
