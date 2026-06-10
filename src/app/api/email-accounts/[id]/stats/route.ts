import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/email-accounts/[id]/stats
 * Returns computed statistics for a specific email account
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const account = await db.emailAccount.findUnique({
      where: { id: params.id, userId: session.user.id },
      select: {
        id: true,
        emailAddress: true,
        displayName: true,
        provider: true,
        status: true,
        dailyLimit: true,
        sentToday: true,
      }
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
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
          emailAccountId: params.id,
          direction: "SENT",
          status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED", "BOUNCED"] },
        },
      }),
      db.email.count({
        where: {
          emailAccountId: params.id,
          direction: "SENT",
          status: { in: ["DELIVERED", "OPENED", "CLICKED", "REPLIED"] },
        },
      }),
      db.email.count({
        where: {
          emailAccountId: params.id,
          direction: "SENT",
          openedAt: { not: null },
        },
      }),
      db.email.count({
        where: {
          emailAccountId: params.id,
          direction: "SENT",
          clickedAt: { not: null },
        },
      }),
      db.email.count({
        where: {
          emailAccountId: params.id,
          direction: "SENT",
          repliedAt: { not: null },
        },
      }),
      db.email.count({
        where: {
          emailAccountId: params.id,
          direction: "SENT",
          bouncedAt: { not: null },
        },
      }),
      db.email.count({
        where: {
          emailAccountId: params.id,
          direction: "SENT",
          status: "FAILED",
        },
      }),
    ]);

    return NextResponse.json({
      account,
      stats: {
        sent: sentCount,
        delivered: deliveredCount,
        opened: openedCount,
        clicked: clickedCount,
        replied: repliedCount,
        bounced: bouncedCount,
        failed: failedCount,
        sentToday: account.sentToday,
        dailyLimit: account.dailyLimit,
        dailyUsagePct: account.dailyLimit > 0 ? Math.round((account.sentToday / account.dailyLimit) * 100) : 0,
      },
      rates: {
        openRate: sentCount > 0 ? ((openedCount / sentCount) * 100).toFixed(1) : "0",
        clickRate: sentCount > 0 ? ((clickedCount / sentCount) * 100).toFixed(1) : "0",
        replyRate: sentCount > 0 ? ((repliedCount / sentCount) * 100).toFixed(1) : "0",
        bounceRate: sentCount > 0 ? ((bouncedCount / sentCount) * 100).toFixed(1) : "0",
      }
    });
  } catch (error) {
    console.error("Account stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
