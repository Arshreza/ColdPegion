import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** POST /api/agents/[id]/clone — duplicate an agent's config as a new DRAFT. */
export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const source = await db.agent.findUnique({
    where: { id: params.id, userId: session.user.id },
    include: { products: true, prospectLists: true, emailAccounts: true },
  });
  if (!source) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const clone = await db.agent.create({
    data: {
      userId: session.user.id,
      name: `Copy of ${source.name}`,
      description: source.description,
      productMode: source.productMode,
      sequenceMode: source.sequenceMode,
      guidelines: source.guidelines,
      staticSequence: source.staticSequence,
      sequenceSteps: source.sequenceSteps,
      dailyEmailLimit: source.dailyEmailLimit,
      minIntervalMinutes: source.minIntervalMinutes,
      maxIntervalMinutes: source.maxIntervalMinutes,
      randomDelayMax: source.randomDelayMax,
      scheduleTimezone: source.scheduleTimezone,
      scheduleStartHour: source.scheduleStartHour,
      scheduleEndHour: source.scheduleEndHour,
      scheduleDays: source.scheduleDays,
      trackOpens: source.trackOpens,
      trackClicks: source.trackClicks,
      status: "DRAFT",
      products: { create: source.products.map((p : any) => ({ productId: p.productId })) },
      prospectLists: { create: source.prospectLists.map((l : any) => ({ prospectListId: l.prospectListId })) },
      emailAccounts: { create: source.emailAccounts.map((a : any) => ({ emailAccountId: a.emailAccountId })) },
    },
  });

  return NextResponse.json({ id: clone.id, name: clone.name }, { status: 201 });
}
