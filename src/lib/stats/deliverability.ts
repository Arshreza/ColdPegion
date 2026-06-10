import { db } from "@/lib/db";

export interface MailboxStat {
  id: string;
  emailAddress: string;
  displayName: string | null;
  domain: string;
  provider: string;
  status: string;
  dailyLimit: number;
  sentToday: number;
  utilization: number; // 0-100 % of today's limit used
  sent: number;
  delivered: number;
  replied: number;
  bounced: number;
  failed: number;
  received: number;
  replyRate: number; // %
  bounceRate: number; // %
}

const SENT_STATUSES = ["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED", "BOUNCED"];

/** Per-mailbox deliverability stats for an organization (or a single user). */
export async function computeMailboxStats(params: { organizationId?: string | null; userId: string }): Promise<MailboxStat[]> {
  const where = params.organizationId
    ? { organizationId: params.organizationId }
    : { userId: params.userId };

  const accounts = await db.emailAccount.findMany({
    where,
    select: {
      id: true,
      emailAddress: true,
      displayName: true,
      domain: true,
      provider: true,
      status: true,
      dailyLimit: true,
      sentToday: true,
    },
  });
  if (accounts.length === 0) return [];

  const ids = accounts.map((a) => a.id);
  const grouped = await db.email.groupBy({
    by: ["emailAccountId", "direction", "status"],
    where: { emailAccountId: { in: ids }, isWarmup: false },
    _count: { _all: true },
  });

  const agg: Record<string, { sent: number; delivered: number; replied: number; bounced: number; failed: number; received: number }> = {};
  for (const id of ids) agg[id] = { sent: 0, delivered: 0, replied: 0, bounced: 0, failed: 0, received: 0 };

  for (const row of grouped) {
    const a = agg[row.emailAccountId];
    if (!a) continue;
    const c = row._count._all;
    if (row.direction === "RECEIVED") {
      a.received += c;
      continue;
    }
    if (row.status === "BOUNCED") {
      a.bounced += c;
    } else if (row.status === "FAILED") {
      a.failed += c;
    }
    
    if (SENT_STATUSES.includes(row.status)) {
      a.sent += c;
      if (["DELIVERED", "OPENED", "CLICKED", "REPLIED"].includes(row.status)) {
        a.delivered += c;
      }
      if (row.status === "REPLIED") {
        a.replied += c;
      }
    }
  }

  return accounts.map((acc) => {
    const a = agg[acc.id];
    return {
      id: acc.id,
      emailAddress: acc.emailAddress,
      displayName: acc.displayName,
      domain: (acc.domain || acc.emailAddress.split("@")[1] || "unknown").toLowerCase(),
      provider: acc.provider,
      status: acc.status,
      dailyLimit: acc.dailyLimit,
      sentToday: acc.sentToday,
      utilization: acc.dailyLimit > 0 ? Math.round((acc.sentToday / acc.dailyLimit) * 100) : 0,
      sent: a.sent,
      delivered: a.delivered,
      replied: a.replied,
      bounced: a.bounced,
      failed: a.failed,
      received: a.received,
      replyRate: a.sent > 0 ? Math.round((a.replied / a.sent) * 1000) / 10 : 0,
      bounceRate: a.sent > 0 ? Math.round((a.bounced / a.sent) * 1000) / 10 : 0,
    };
  });
}

export interface DomainStat {
  domain: string;
  mailboxes: number;
  dailyLimit: number;
  sentToday: number;
  utilization: number;
  sent: number;
  replied: number;
  bounced: number;
  failed: number;
  received: number;
  replyRate: number;
  bounceRate: number;
}

/** Roll mailbox stats up to the sending-domain level. */
export function rollupByDomain(mailboxes: MailboxStat[]): DomainStat[] {
  const map = new Map<string, DomainStat>();
  for (const m of mailboxes) {
    const d = map.get(m.domain) || {
      domain: m.domain,
      mailboxes: 0,
      dailyLimit: 0,
      sentToday: 0,
      utilization: 0,
      sent: 0,
      replied: 0,
      bounced: 0,
      failed: 0,
      received: 0,
      replyRate: 0,
      bounceRate: 0,
    };
    d.mailboxes += 1;
    d.dailyLimit += m.dailyLimit;
    d.sentToday += m.sentToday;
    d.sent += m.sent;
    d.replied += m.replied;
    d.bounced += m.bounced;
    d.failed += m.failed;
    d.received += m.received;
    map.set(m.domain, d);
  }
  return Array.from(map.values())
    .map((d) => {
      return {
        ...d,
        utilization: d.dailyLimit > 0 ? Math.round((d.sentToday / d.dailyLimit) * 100) : 0,
        replyRate: d.sent > 0 ? Math.round((d.replied / d.sent) * 1000) / 10 : 0,
        bounceRate: d.sent > 0 ? Math.round((d.bounced / d.sent) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.sent - a.sent);
}
