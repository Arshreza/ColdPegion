import { db } from "@/lib/db";
import type { EmailAccount } from "@prisma/client";

export function domainOf(account: { domain?: string | null; emailAddress: string }): string {
  return (account.domain || account.emailAddress.split("@")[1] || "unknown").toLowerCase();
}

/**
 * Org-level load balancing.
 *
 * Given the candidate sender mailboxes for a launch and how many emails we need
 * to send, return an array of accountId assignments (length = count) that:
 *  - never exceeds a mailbox's daily limit (uses the live `sentToday` counter,
 *    which reflects ALL campaigns org-wide — so usage is shared automatically),
 *  - de-weights mailboxes with a poor recent bounce rate (deliverability),
 *  - spreads volume evenly across distinct sending DOMAINS so no single domain
 *    gets hammered into spam folders.
 *
 * Strategy: greedy "least-loaded first" — each slot goes to the healthy mailbox
 * on the least-loaded domain with the most remaining headroom.
 */
export async function buildBalancedAssignments(accounts: EmailAccount[], count: number): Promise<string[]> {
  if (accounts.length === 0 || count <= 0) return [];

  // Recent bounce rate per candidate mailbox (last ~30 days of activity).
  const ids = accounts.map((a) => a.id);
  const grouped = await db.email.groupBy({
    by: ["emailAccountId", "status"],
    where: { emailAccountId: { in: ids }, direction: "SENT", isWarmup: false },
    _count: { status: true },
  });
  const sent: Record<string, number> = {};
  const bounced: Record<string, number> = {};
  for (const row of grouped) {
    const c = row._count.status;
    if (row.status === "BOUNCED" || row.status === "FAILED") bounced[row.emailAccountId] = (bounced[row.emailAccountId] || 0) + c;
    else sent[row.emailAccountId] = (sent[row.emailAccountId] || 0) + c;
  }

  // Per-mailbox effective capacity and projected load.
  type Slot = {
    id: string;
    domain: string;
    projected: number; // emails already counted toward today's limit
    effLimit: number; // daily limit reduced by bounce penalty
  };
  const slots: Slot[] = accounts.map((a) => {
    const total = (sent[a.id] || 0) + (bounced[a.id] || 0);
    const bounceRate = total > 0 ? (bounced[a.id] || 0) / total : 0;
    const healthFactor = Math.max(0.1, 1 - Math.min(0.9, bounceRate));
    return {
      id: a.id,
      domain: domainOf(a),
      projected: a.sentToday,
      effLimit: Math.max(1, Math.floor(a.dailyLimit * healthFactor)),
    };
  });

  const domainLoad: Record<string, number> = {};
  for (const s of slots) domainLoad[s.domain] = (domainLoad[s.domain] || 0) + s.projected;

  const assignments: string[] = [];
  for (let i = 0; i < count; i++) {
    // Candidates with remaining headroom; if none, allow overflow (worker will
    // reschedule to tomorrow) but still pick the least-loaded.
    const withRoom = slots.filter((s) => s.projected < s.effLimit);
    const pool = withRoom.length ? withRoom : slots;

    pool.sort((a, b) => {
      // Prefer the least-loaded domain, then the mailbox with the most headroom.
      if (domainLoad[a.domain] !== domainLoad[b.domain]) return domainLoad[a.domain] - domainLoad[b.domain];
      const aHead = a.effLimit - a.projected;
      const bHead = b.effLimit - b.projected;
      return bHead - aHead;
    });

    const chosen = pool[0];
    assignments.push(chosen.id);
    chosen.projected += 1;
    domainLoad[chosen.domain] = (domainLoad[chosen.domain] || 0) + 1;
  }

  return assignments;
}
