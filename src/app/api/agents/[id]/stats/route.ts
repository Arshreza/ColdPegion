import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/agents/[id]/stats
 * Returns computed statistics for a specific agent
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agent = await db.agent.findUnique({
      where: { id: params.id, userId: session.user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const [
      sentCount,
      deliveredCount,
      openedCount,
      clickedCount,
      repliedCount,
      bouncedCount,
      failedCount,
    ] = await Promise.all([
      db.email.count({
        where: {
          agentId: params.id,
          direction: "SENT",
          status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED", "BOUNCED"] },
        },
      }),
      db.email.count({
        where: {
          agentId: params.id,
          direction: "SENT",
          status: { in: ["DELIVERED", "OPENED", "CLICKED", "REPLIED"] },
        },
      }),
      db.email.count({
        where: {
          agentId: params.id,
          direction: "SENT",
          openedAt: { not: null },
        },
      }),
      db.email.count({
        where: {
          agentId: params.id,
          direction: "SENT",
          clickedAt: { not: null },
        },
      }),
      db.email.count({
        where: {
          agentId: params.id,
          direction: "SENT",
          repliedAt: { not: null },
        },
      }),
      db.email.count({
        where: {
          agentId: params.id,
          direction: "SENT",
          bouncedAt: { not: null },
        },
      }),
      db.email.count({
        where: {
          agentId: params.id,
          direction: "SENT",
          status: "FAILED",
        },
      }),
    ]);

    // A/B variant performance: sent vs replied per variant.
    const variantRows = await db.email.groupBy({
      by: ["variantId", "status"],
      where: { agentId: params.id, direction: "SENT", variantId: { not: null }, isWarmup: false },
      _count: { _all: true },
    });
    const variantMap: Record<string, { sent: number; replied: number }> = {};
    for (const row of variantRows) {
      const key = row.variantId || "A";
      variantMap[key] = variantMap[key] || { sent: 0, replied: 0 };
      variantMap[key].sent += row._count._all;
      if (row.status === "REPLIED") variantMap[key].replied += row._count._all;
    }
    const variants = Object.entries(variantMap)
      .map(([label, v]) => ({ label, sent: v.sent, replied: v.replied, replyRate: v.sent > 0 ? ((v.replied / v.sent) * 100).toFixed(1) : "0" }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({
      agentId: params.id,
      agentName: agent.name,
      trackOpens: agent.trackOpens,
      trackClicks: agent.trackClicks,
      stats: {
        sent: sentCount,
        delivered: deliveredCount,
        opened: openedCount,
        clicked: clickedCount,
        replied: repliedCount,
        bounced: bouncedCount,
        failed: failedCount,
      },
      rates: {
        openRate: sentCount > 0 ? ((openedCount / sentCount) * 100).toFixed(1) : "0",
        clickRate: sentCount > 0 ? ((clickedCount / sentCount) * 100).toFixed(1) : "0",
        replyRate: sentCount > 0 ? ((repliedCount / sentCount) * 100).toFixed(1) : "0",
        bounceRate: sentCount > 0 ? ((bouncedCount / sentCount) * 100).toFixed(1) : "0",
      },
      variants,
    });
  } catch (error) {
    console.error("Agent stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/agents/[id]/stats
 * Toggle trackOpens / trackClicks
 */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = await db.agent.update({
      where: { id: params.id, userId: session.user.id },
      data: {
        trackOpens: body.trackOpens !== undefined ? Boolean(body.trackOpens) : undefined,
        trackClicks: body.trackClicks !== undefined ? Boolean(body.trackClicks) : undefined,
      },
    });

    return NextResponse.json({ trackOpens: updated.trackOpens, trackClicks: updated.trackClicks });
  } catch (error) {
    console.error("Agent patch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
