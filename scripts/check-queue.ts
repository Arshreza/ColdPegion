import { emailQueue } from "../src/lib/queue/worker";

type QueueJob = { id?: string | null; failedReason?: string };

async function checkQueue() {
  const waiting = await emailQueue.getWaitingCount();
  const active = await emailQueue.getActiveCount();
  const delayed = await emailQueue.getDelayedCount();
  const completed = await emailQueue.getCompletedCount();
  const failed = await emailQueue.getFailedCount();

  console.log("Queue Status:");
  console.log(`Waiting: ${waiting}`);
  console.log(`Active: ${active}`);
  console.log(`Delayed: ${delayed} (Waiting to be sent later)`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    const failedJobs = await emailQueue.getFailed(0, 5);
    console.log("\nRecent Failed Jobs:");
    failedJobs.forEach((job: QueueJob) => {
        console.log(`- Job ${job.id}: ${job.failedReason}`);
    });
  }

  process.exit(0);
}

checkQueue().catch(console.error);
