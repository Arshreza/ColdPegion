import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { PLANS, getPlanLimits } from "@/lib/billing/plans";
import { isDodoConfigured } from "@/lib/billing/dodo";

/** GET /api/billing — current plan, status, limits, current usage counts. */
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = me.organizationId ? await db.organization.findUnique({ where: { id: me.organizationId } }) : null;
  const plan = org?.plan || "FREE";
  const limits = getPlanLimits(plan);

  const [mailboxes, seats] = me.organizationId
    ? await Promise.all([
        db.emailAccount.count({ where: { organizationId: me.organizationId } }),
        db.user.count({ where: { organizationId: me.organizationId } }),
      ])
    : [await db.emailAccount.count({ where: { userId: me.id } }), 1];

  return NextResponse.json({
    plan,
    planStatus: org?.planStatus || null,
    planRenewsAt: org?.planRenewsAt || null,
    limits,
    usage: { mailboxes, seats },
    isAdmin: isAdminRole(me.role),
    dodoConfigured: isDodoConfigured(),
    plans: Object.values(PLANS).map((p) => ({
      id: p.id,
      label: p.label,
      priceMonthly: p.priceMonthly,
      dailyEmails: p.dailyEmails === Infinity ? "Unlimited" : p.dailyEmails,
      mailboxes: p.mailboxes === Infinity ? "Unlimited" : p.mailboxes,
      seats: p.seats === Infinity ? "Unlimited" : p.seats,
    })),
  });
}
