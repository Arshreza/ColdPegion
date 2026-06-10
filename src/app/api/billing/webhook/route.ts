import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured, planForPriceId } from "@/lib/billing/stripe";
import type { PlanId } from "@/lib/billing/plans";

// Stripe webhooks must read the raw body for signature verification.
export const dynamic = "force-dynamic";

/** POST /api/billing/webhook — sync subscription state from Stripe. */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  const stripe = getStripe();
  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const obj: any = event.data.object;
        const customerId = obj.customer as string;
        const org = await db.organization.findFirst({ where: { stripeCustomerId: customerId } });
        if (org) {
          // Resolve plan from the subscription's price (fetch if needed).
          let plan: PlanId | null = null;
          let subscriptionId: string | undefined;
          let status: string | undefined;
          let renewsAt: Date | undefined;

          if (event.type === "checkout.session.completed") {
            subscriptionId = obj.subscription as string;
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            plan = planForPriceId(sub.items.data[0]?.price?.id);
            status = sub.status;
            renewsAt = (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : undefined;
          } else {
            subscriptionId = obj.id;
            plan = planForPriceId(obj.items?.data?.[0]?.price?.id);
            status = obj.status;
            renewsAt = obj.current_period_end ? new Date(obj.current_period_end * 1000) : undefined;
          }

          await db.organization.update({
            where: { id: org.id },
            data: {
              ...(plan ? { plan } : {}),
              planStatus: status,
              stripeSubscriptionId: subscriptionId,
              planRenewsAt: renewsAt,
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const obj: any = event.data.object;
        const org = await db.organization.findFirst({ where: { stripeCustomerId: obj.customer as string } });
        if (org) {
          await db.organization.update({
            where: { id: org.id },
            data: { plan: "FREE", planStatus: "canceled", stripeSubscriptionId: null, planRenewsAt: null },
          });
        }
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
