import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { launchAgentCampaign, pauseAgentCampaign, LaunchError } from "@/lib/agents/launch";

/**
 * POST /api/agents/[id]/queue — Launch the agent (non-blocking).
 * Seeds the background queue with staggered, schedule-aware, org-load-balanced
 * jobs and returns immediately. The BullMQ worker sends over time.
 */
export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await launchAgentCampaign(params.id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LaunchError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Launch error:", error);
    return NextResponse.json(
      {
        error:
          "Could not reach the background queue (Redis). Set REDIS_URL and run the worker (`npm run worker`) for background sending.",
        detail: (error as Error)?.message,
      },
      { status: 503 }
    );
  }
}

/** DELETE /api/agents/[id]/queue — Pause the agent. */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await pauseAgentCampaign(params.id, session.user.id);
    return NextResponse.json({ ...result, status: "PAUSED" });
  } catch (error) {
    if (error instanceof LaunchError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Pause error:", error);
    return NextResponse.json({ error: "Failed to pause agent" }, { status: 500 });
  }
}
