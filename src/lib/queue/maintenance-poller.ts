import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "./connection";
import { db } from "@/lib/db";

const connection = getRedisConnection();
const QUEUE_NAME = "maintenance-queue";

export const maintenanceQueue = new Queue(QUEUE_NAME, { connection });

let maintenanceWorker: Worker | null = null;

/**
 * Hourly maintenance: reset daily send counters for any agent/mailbox whose
 * last reset was before today (UTC). The worker also resets per-job, but this
 * keeps idle accounts' usage accurate (e.g. the sidebar widget) even when no
 * campaign is actively sending.
 */
export async function initDailyMaintenance(intervalMinutes = 60) {
  if (maintenanceWorker) return maintenanceWorker;

  await maintenanceQueue.add(
    "reset-counters",
    {},
    { repeat: { every: intervalMinutes * 60_000 }, removeOnComplete: true, removeOnFail: true }
  );

  maintenanceWorker = new Worker(
    QUEUE_NAME,
    async () => {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const now = new Date();
      const [agents, accounts, warmups] = await Promise.all([
        db.agent.updateMany({ where: { lastResetDate: { lt: startOfDay } }, data: { sentToday: 0, lastResetDate: now } }),
        db.emailAccount.updateMany({ where: { lastResetDate: { lt: startOfDay } }, data: { sentToday: 0, lastResetDate: now } }),
        db.emailAccount.updateMany({ where: { warmupLastReset: { lt: startOfDay } }, data: { warmupSentToday: 0, warmupLastReset: now } }),
      ]);
      if (agents.count || accounts.count || warmups.count) {
        console.log(`[maintenance] reset ${agents.count} agents, ${accounts.count} mailboxes, ${warmups.count} warmup counters`);
      }

      // Deliverability guardrail: auto-pause mailboxes with a dangerous bounce
      // rate (>= 8% over a meaningful volume) so a bad inbox can't torch the
      // whole sending reputation. Excludes warmup mail.
      const paused = await autoPauseHighBounceMailboxes();

      return { agents: agents.count, accounts: accounts.count, paused };
    },
    { connection, concurrency: 1 }
  );

  maintenanceWorker.on("failed", (_job, err) => console.error("[maintenance] failed:", err.message));
  console.log(`Daily maintenance initialized (every ${intervalMinutes}m).`);
  return maintenanceWorker;
}

const BOUNCE_PAUSE_THRESHOLD = 0.08; // 8%
const MIN_ATTEMPTS = 20;

async function autoPauseHighBounceMailboxes(): Promise<number> {
  const active = await db.emailAccount.findMany({
    where: { isActive: true, status: { not: "DISCONNECTED" } },
    select: { id: true, emailAddress: true },
  });
  if (active.length === 0) return 0;

  const grouped = await db.email.groupBy({
    by: ["emailAccountId", "status"],
    where: { emailAccountId: { in: active.map((a) => a.id) }, direction: "SENT", isWarmup: false },
    _count: { _all: true },
  });

  const sent: Record<string, number> = {};
  const bounced: Record<string, number> = {};
  for (const r of grouped) {
    const c = r._count._all;
    if (r.status === "BOUNCED" || r.status === "FAILED") bounced[r.emailAccountId] = (bounced[r.emailAccountId] || 0) + c;
    else sent[r.emailAccountId] = (sent[r.emailAccountId] || 0) + c;
  }

  let paused = 0;
  for (const acc of active) {
    const s = sent[acc.id] || 0;
    const b = bounced[acc.id] || 0;
    const attempts = s + b;
    if (attempts >= MIN_ATTEMPTS && b / attempts >= BOUNCE_PAUSE_THRESHOLD) {
      await db.emailAccount.update({
        where: { id: acc.id },
        data: { isActive: false, status: "ERROR", lastError: `Auto-paused: bounce rate ${((b / attempts) * 100).toFixed(1)}% exceeded ${BOUNCE_PAUSE_THRESHOLD * 100}%.` },
      });
      console.warn(`[maintenance] auto-paused ${acc.emailAddress} (bounce ${((b / attempts) * 100).toFixed(1)}%)`);
      paused++;
    }
  }
  return paused;
}
