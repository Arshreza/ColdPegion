import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { generateGuidelines, generateSequence } from "@/lib/llm/author";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  type: z.enum(["guidelines", "sequence", "both"]),
  productIds: z.array(z.string()).optional(),
  campaignGoal: z.string().optional(),
});

/** POST /api/agents/generate — AI-author campaign guidelines and/or a sequence. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(request, "agent-generate", 15, 60_000);
  if (limited) return limited;

  try {
    const { type, productIds, campaignGoal } = schema.parse(await request.json());
    const result: { guidelines?: string; steps?: unknown } = {};

    if (type === "guidelines" || type === "both") {
      result.guidelines = await generateGuidelines({ userId: session.user.id, productIds, campaignGoal });
    }
    if (type === "sequence" || type === "both") {
      result.steps = await generateSequence({ userId: session.user.id, productIds, campaignGoal });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: (error as Error).message || "Generation failed" }, { status: 500 });
  }
}
