import Stripe from "stripe";
import type { PlanId } from "./plans";

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Map our plans to Stripe Price IDs via env (set these in your Stripe dashboard).
export function priceIdForPlan(plan: PlanId): string | undefined {
  const map: Record<string, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO: process.env.STRIPE_PRICE_PRO,
  };
  return map[plan];
}

export function planForPriceId(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "STARTER";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  return null;
}
