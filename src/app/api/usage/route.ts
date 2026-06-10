import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/org";
import { getUserPlan } from "@/lib/billing/plans";

/** GET /api/usage — real usage for the sidebar widget (today's sends vs limit). */
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, limits } = await getUserPlan(me.id);
  const settings = await db.globalSettings.findUnique({ where: { userId: me.id } });
  const planDaily = limits.dailyEmails === Infinity ? Number.MAX_SAFE_INTEGER : limits.dailyEmails;
  const dailyLimit = Math.min(settings?.dailyEmailLimit ?? 500, planDaily);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const sentToday = await db.email.count({
    where: {
      emailAccount: { userId: me.id },
      direction: "SENT",
      isWarmup: false,
      sentAt: { gte: startOfDay },
    },
  });

  return NextResponse.json({
    sentToday,
    dailyLimit,
    unlimited: limits.dailyEmails === Infinity,
    plan,
    planLabel: limits.label,
  });
}
