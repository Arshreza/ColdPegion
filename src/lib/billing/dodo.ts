import DodoPayments from "dodopayments";
import type { PlanId } from "./plans";

let client: DodoPayments | null = null;

export function isDodoConfigured(): boolean {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY);
}

export function getDodoClient(): DodoPayments {
  if (!process.env.DODO_PAYMENTS_API_KEY) {
    throw new Error("Dodo Payments is not configured (DODO_PAYMENTS_API_KEY missing).");
  }
  if (!client) {
    client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: (process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode") as "test_mode" | "live_mode",
    });
  }
  return client;
}

export function priceIdForPlan(plan: PlanId): string | undefined {
  const map: Record<string, string | undefined> = {
    STARTER: process.env.DODO_PAYMENTS_PRICE_STARTER,
    PRO: process.env.DODO_PAYMENTS_PRICE_PRO,
  };
  return map[plan];
}

export function planForPriceId(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.DODO_PAYMENTS_PRICE_STARTER) return "STARTER";
  if (priceId === process.env.DODO_PAYMENTS_PRICE_PRO) return "PRO";
  return null;
}
