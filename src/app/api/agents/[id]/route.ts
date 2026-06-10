import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { MAX_RANDOM_DELAY_MINUTES } from "@/lib/queue/schedule";

const stepSchema = z.object({
  waitDays: z.coerce.number().int().min(0).max(120).default(0),
  subject: z.string().optional(),
  body: z.string().optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  guidelines: z.string().optional(),
  sequenceMode: z.enum(["AI_GENERATED", "STATIC", "HYBRID", "EXTERNAL"]).optional(),
  dailyEmailLimit: z.coerce.number().int().min(1).max(100000).optional(),
  minIntervalMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  maxIntervalMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  randomDelayMax: z.coerce.number().int().min(0).max(MAX_RANDOM_DELAY_MINUTES).optional(),
  scheduleTimezone: z.string().optional(),
  scheduleStartHour: z.coerce.number().int().min(0).max(23).optional(),
  scheduleEndHour: z.coerce.number().int().min(0).max(23).optional(),
  scheduleDays: z.string().optional(), // e.g. "1,2,3,4,5"
  steps: z.array(stepSchema).optional(),
  productIds: z.array(z.string()).optional(),
  includeUnsubscribe: z.boolean().optional(),
});

/** GET /api/agents/[id] — full agent with relations + parsed steps. */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await db.agent.findUnique({
    where: { id: params.id, userId: session.user.id },
    include: {
      products: { include: { product: { select: { id: true, name: true } } } },
      prospectLists: { include: { prospectList: { select: { id: true, name: true } } } },
      emailAccounts: { include: { emailAccount: { select: { id: true, emailAddress: true } } } },
    },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json(agent);
}

/** PATCH /api/agents/[id] — update settings, cadence, schedule, and sequence. */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.agent.findUnique({ where: { id: params.id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  try {
    const data = patchSchema.parse(await request.json());
    const { steps, productIds, ...scalar } = data;

    // Keep min <= max if both supplied.
    if (scalar.minIntervalMinutes !== undefined && scalar.maxIntervalMinutes !== undefined) {
      if (scalar.minIntervalMinutes > scalar.maxIntervalMinutes) {
        return NextResponse.json({ error: "Min interval cannot exceed max interval." }, { status: 400 });
      }
    }

    const updated = await db.agent.update({
      where: { id: params.id },
      data: {
        ...scalar,
        ...(steps ? { sequenceSteps: JSON.stringify(steps) } : {}),
      },
    });

    // Optionally replace assigned products.
    if (productIds) {
      await db.agentProduct.deleteMany({ where: { agentId: params.id } });
      if (productIds.length) {
        await db.agentProduct.createMany({
          data: productIds.map((productId) => ({ agentId: params.id, productId })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ id: updated.id, updated: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Agent update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/agents/[id] — delete an agent. */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await db.agent.findUnique({ where: { id: params.id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  await db.agent.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
