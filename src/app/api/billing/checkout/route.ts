import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { getDodoClient, isDodoConfigured, priceIdForPlan } from "@/lib/billing/dodo";
import { appUrl } from "@/lib/email/transactional";
import { z } from "zod";

/** POST /api/billing/checkout — start a Dodo Payments Checkout session for a plan. */
export async function POST(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Only admins can manage billing." }, { status: 403 });
  if (!isDodoConfigured()) {
    return NextResponse.json({ error: "Billing isn't configured on this instance yet." }, { status: 503 });
  }

  try {
    const { plan } = z.object({ plan: z.enum(["STARTER", "PRO"]) }).parse(await request.json());
    const priceId = priceIdForPlan(plan);
    if (!priceId) return NextResponse.json({ error: `No Dodo product configured for ${plan}.` }, { status: 400 });

    const org = await db.organization.findUnique({ where: { id: me.organizationId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const dodo = getDodoClient();

    // Create a checkout session using the Dodo Payments SDK
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: priceId, quantity: 1 }],
      customer: org.dodoCustomerId
        ? { customer_id: org.dodoCustomerId }
        : { email: me.email, name: me.name || undefined },
      return_url: `${appUrl()}/dashboard/billing?status=success`,
      metadata: { organizationId: org.id, plan },
    });

    return NextResponse.json({ url: session.checkout_url });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Checkout error:", error);
    return NextResponse.json({ error: (error as Error).message || "Checkout failed" }, { status: 500 });
  }
}
