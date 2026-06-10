import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "./connection";
import { runWarmupCycle } from "@/lib/warmup/engine";

const connection = getRedisConnection();
const QUEUE_NAME = "warmup-queue";

// Repeatable warmup runner: every cycle, warmup-enabled mailboxes send a few
// friendly emails to each other (ramping to their daily max) to build sending
// reputation. Runs inside the worker process.
export const warmupQueue = new Queue(QUEUE_NAME, { connection });

let warmupWorker: Worker | null = null;

export async function initWarmupPoller(intervalMinutes = 30) {
  if (warmupWorker) return warmupWorker;

  await warmupQueue.add(
    "run-warmup",
    {},
    {
      repeat: { every: intervalMinutes * 60_000 },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );

  warmupWorker = new Worker(
    QUEUE_NAME,
    async () => {
      const res = await runWarmupCycle();
      if (res.sent) console.log(`[warmup] ${res.senders} mailbox(es) sent ${res.sent} warmup email(s)`);
      return res;
    },
    { connection, concurrency: 1 }
  );

  warmupWorker.on("failed", (_job, err) => console.error("[warmup] cycle failed:", err.message));
  console.log(`Warmup poller initialized (every ${intervalMinutes}m).`);
  return warmupWorker;
}
