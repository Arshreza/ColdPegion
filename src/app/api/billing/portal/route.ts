import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { appUrl } from "@/lib/email/transactional";

/** POST /api/billing/portal — open the Stripe customer portal to manage/cancel. */
export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.organizationId || !isAdminRole(me.role)) return NextResponse.json({ error: "Only admins can manage billing." }, { status: 403 });
  if (!isStripeConfigured()) return NextResponse.json({ error: "Billing isn't configured." }, { status: 503 });

  const org = await db.organization.findUnique({ where: { id: me.organizationId } });
  if (!org?.stripeCustomerId) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${appUrl()}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Portal failed" }, { status: 500 });
  }
}
