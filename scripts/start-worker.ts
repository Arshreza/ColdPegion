// Load .env BEFORE any imports that use env vars
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

// Error monitoring — initialize early so crashes in workers are captured.
import * as Sentry from "@sentry/node";
if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === "production") {
  Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 });
}

console.log("Worker: REDIS_URL =", process.env.REDIS_URL ? "✓ configured" : "✗ missing");

async function start() {
  // Now import the workers (which read REDIS_URL) dynamically to avoid ESM hoisting
  const { initWorker } = await import("../src/lib/queue/worker");
  const { initInboxPoller } = await import("../src/lib/queue/inbox-poller");
  const { initWarmupPoller } = await import("../src/lib/queue/warmup-poller");
  const { initDailyMaintenance } = await import("../src/lib/queue/maintenance-poller");

  console.log("Starting BullMQ background workers...");
  const worker = initWorker();

  const inboxIntervalMin = parseInt(process.env.INBOX_POLL_MINUTES || "5", 10);
  const inboxWorkerPromise = initInboxPoller(inboxIntervalMin);

  const warmupIntervalMin = parseInt(process.env.WARMUP_INTERVAL_MINUTES || "30", 10);
  const warmupWorkerPromise = initWarmupPoller(warmupIntervalMin);

  const maintenanceWorkerPromise = initDailyMaintenance(60);

  // Keep the process alive
  process.on("SIGINT", async () => {
    console.log("Shutting down workers...");
    if (worker) await worker.close();
    const inboxWorker = await inboxWorkerPromise.catch(() => null);
    if (inboxWorker) await inboxWorker.close();
    const warmupWorker = await warmupWorkerPromise.catch(() => null);
    if (warmupWorker) await warmupWorker.close();
    const maintenanceWorker = await maintenanceWorkerPromise.catch(() => null);
    if (maintenanceWorker) await maintenanceWorker.close();
    process.exit(0);
  });
}

start().catch(console.error);
