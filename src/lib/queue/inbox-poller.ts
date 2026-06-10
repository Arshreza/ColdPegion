import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "./connection";
import { syncAllInboxes } from "@/lib/email/imap-sync";

const connection = getRedisConnection();
const QUEUE_NAME = "inbox-sync-queue";

// Repeatable poller that pulls inbound mail over IMAP for every account on a
// fixed cadence (Instantly-style polling). Replies are detected and matching
// sequences are auto-stopped inside syncAllInboxes().
export const inboxQueue = new Queue(QUEUE_NAME, { connection });

let inboxWorker: Worker | null = null;

export async function initInboxPoller(intervalMinutes = 5) {
  if (inboxWorker) return inboxWorker;

  // Seed the repeatable job (deduped by repeat key).
  await inboxQueue.add(
    "poll-inboxes",
    {},
    {
      repeat: { every: intervalMinutes * 60_000 },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );

  inboxWorker = new Worker(
    QUEUE_NAME,
    async () => {
      const res = await syncAllInboxes();
      console.log(`[inbox] synced ${res.accounts} accounts • ${res.fetched} new • ${res.replies} replies`);
      return res;
    },
    { connection, concurrency: 1 }
  );

  inboxWorker.on("failed", (_job, err) => console.error("[inbox] poll failed:", err.message));
  console.log(`Inbox poller initialized (every ${intervalMinutes}m).`);
  return inboxWorker;
}
