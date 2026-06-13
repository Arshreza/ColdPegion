import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import DodoPayments from "dodopayments";
import { planForPriceId } from "@/lib/billing/dodo";

export const dynamic = "force-dynamic";

/** POST /api/billing/webhook — sync subscription state from Dodo Payments. */
export async function POST(request: Request) {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || process.env.DODO_PAYMENTS_WEBHOOK_KEY;

  if (!apiKey || !webhookKey) {
    console.error("Dodo Payments billing not configured in env");
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const signature = request.headers.get("webhook-signature");
  const webhookId = request.headers.get("webhook-id");
  const webhookTimestamp = request.headers.get("webhook-timestamp");

  if (!signature) {
    return NextResponse.json({ error: "Missing webhook-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  const dodo = new DodoPayments({
    bearerToken: apiKey,
    webhookKey: webhookKey,
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode") as "test_mode" | "live_mode",
  });

  let event: any;
  try {
    event = await dodo.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": webhookId || "",
        "webhook-timestamp": webhookTimestamp || "",
        "webhook-signature": signature,
      },
    });
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    const eventType = event.type;
    const data = event.data;

    if (!data) {
      return NextResponse.json({ error: "Empty event data" }, { status: 400 });
    }

    switch (eventType) {
      case "subscription.active":
      case "subscription.renewed":
      case "subscription.updated": {
        const customerId = data.customer?.id || data.customer_id;
        const customerEmail = data.customer?.email || data.customer_email;
        const subscriptionId = data.subscription_id;
        const status = data.status;
        const productId = data.product_id;
        const nextBillingDate = data.next_billing_date;

        const resolvedPlan = planForPriceId(productId);
        if (!resolvedPlan) {
          console.warn(`Unmapped Dodo product ID: ${productId}`);
          break;
        }

        // Find organization
        let org = null;
        if (customerId) {
          org = await db.organization.findUnique({ where: { dodoCustomerId: customerId } });
        }
        if (!org && customerEmail) {
          const user = await db.user.findFirst({
            where: { email: customerEmail },
            select: { organization: true },
          });
          org = user?.organization || null;
        }

        if (org) {
          await db.organization.update({
            where: { id: org.id },
            data: {
              plan: resolvedPlan,
              planStatus: status || "active",
              dodoSubscriptionId: subscriptionId || null,
              dodoCustomerId: customerId || org.dodoCustomerId,
              planRenewsAt: nextBillingDate ? new Date(nextBillingDate) : null,
            },
          });
          console.log(`Successfully updated organization ${org.id} plan to ${resolvedPlan} via webhook`);
        } else {
          console.warn(`Could not find organization for customer: ${customerId} / ${customerEmail}`);
        }
        break;
      }
      case "subscription.cancelled":
      case "subscription.expired": {
        const customerId = data.customer?.id || data.customer_id;
        const customerEmail = data.customer?.email || data.customer_email;

        // Find organization
        let org = null;
        if (customerId) {
          org = await db.organization.findUnique({ where: { dodoCustomerId: customerId } });
        }
        if (!org && customerEmail) {
          const user = await db.user.findFirst({
            where: { email: customerEmail },
            select: { organization: true },
          });
          org = user?.organization || null;
        }

        if (org) {
          await db.organization.update({
            where: { id: org.id },
            data: {
              plan: "FREE",
              planStatus: "canceled",
              dodoSubscriptionId: null,
              planRenewsAt: null,
            },
          });
          console.log(`Successfully downgraded organization ${org.id} to FREE via cancel/expiry webhook`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Dodo Webhook handler error:", error);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
