import { db } from "@/lib/db";

export type PlanId = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface PlanLimits {
  id: PlanId;
  label: string;
  priceMonthly: number; // USD, display only
  dailyEmails: number; // max emails/day across the org (Infinity = unlimited)
  mailboxes: number; // max connected mailboxes
  seats: number; // max members
  leadDatabase: boolean;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  FREE: { id: "FREE", label: "Free", priceMonthly: 0, dailyEmails: 50, mailboxes: 1, seats: 1, leadDatabase: true },
  STARTER: { id: "STARTER", label: "Starter", priceMonthly: 39, dailyEmails: 500, mailboxes: 5, seats: 3, leadDatabase: true },
  PRO: { id: "PRO", label: "Pro", priceMonthly: 99, dailyEmails: 5000, mailboxes: 25, seats: 10, leadDatabase: true },
  ENTERPRISE: { id: "ENTERPRISE", label: "Enterprise", priceMonthly: 0, dailyEmails: Infinity, mailboxes: Infinity, seats: Infinity, leadDatabase: true },
};

export function getPlanLimits(plan?: string | null): PlanLimits {
  return PLANS[(plan as PlanId) || "FREE"] || PLANS.FREE;
}

/** Resolve a user's org plan limits (defaults to FREE when there's no org). */
export async function getUserPlan(userId: string): Promise<{ plan: PlanId; limits: PlanLimits; organizationId: string | null }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
  if (!user?.organizationId) return { plan: "FREE", limits: PLANS.FREE, organizationId: null };
  const org = await db.organization.findUnique({ where: { id: user.organizationId }, select: { plan: true } });
  const plan = (org?.plan as PlanId) || "FREE";
  return { plan, limits: getPlanLimits(plan), organizationId: user.organizationId };
}

/** Plan limits for an org id directly (used by the sending worker). */
export async function getOrgPlanLimits(organizationId: string | null | undefined): Promise<PlanLimits> {
  if (!organizationId) return PLANS.FREE;
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { plan: true } });
  return getPlanLimits(org?.plan);
}
