import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { getStripe, isStripeConfigured, priceIdForPlan } from "@/lib/billing/stripe";
import { appUrl } from "@/lib/email/transactional";
import { z } from "zod";

/** POST /api/billing/checkout — start a Stripe Checkout session for a plan. */
export async function POST(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Only admins can manage billing." }, { status: 403 });
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing isn't configured on this instance yet." }, { status: 503 });
  }

  try {
    const { plan } = z.object({ plan: z.enum(["STARTER", "PRO"]) }).parse(await request.json());
    const priceId = priceIdForPlan(plan);
    if (!priceId) return NextResponse.json({ error: `No Stripe price configured for ${plan}.` }, { status: 400 });

    const org = await db.organization.findUnique({ where: { id: me.organizationId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const stripe = getStripe();
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ name: org.name, email: me.email, metadata: { organizationId: org.id } });
      customerId = customer.id;
      await db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/dashboard/billing?status=success`,
      cancel_url: `${appUrl()}/dashboard/billing?status=cancel`,
      metadata: { organizationId: org.id, plan },
      subscription_data: { metadata: { organizationId: org.id } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Checkout error:", error);
    return NextResponse.json({ error: (error as Error).message || "Checkout failed" }, { status: 500 });
  }
}
