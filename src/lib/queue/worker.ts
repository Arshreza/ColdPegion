import { Queue, Worker, Job } from "bullmq";
import { readUpload, uploadUrlToKey } from "@/lib/storage";
import { getRedisConnection } from "./connection";
import { db } from "@/lib/db";
import { generatePersonalizedEmail } from "@/lib/llm/generator";
import { sendViaAccount } from "@/lib/email/sender";
import type { EmailAttachment } from "@/lib/email/sender";
import { isWithinSchedule } from "./schedule";
import { parseSequenceSteps } from "@/lib/sequence";
import { spin } from "@/lib/spintax";
import { buildTrackedHtml } from "@/lib/email/tracking";
import { getOrgPlanLimits } from "@/lib/billing/plans";
import { makeUnsubToken } from "@/lib/unsubscribe";
import { appUrl } from "@/lib/email/transactional";
import { isSuppressed } from "@/lib/suppression";

const connection = getRedisConnection();
const QUEUE_NAME = "email-sending-queue";

// 1. Queue Definition
export const emailQueue = new Queue(QUEUE_NAME, { connection });

// Define the Job payload structure
export interface EmailJobPayload {
  agentId: string;
  prospectId: string;
  userId: string;
  emailAccountId: string;
  sequenceStep?: number;
}

// Helper to schedule a single send job at a given delay (ms from now).
export async function scheduleEmailJob(payload: EmailJobPayload, delayMs: number = 0) {
  await emailQueue.add(`send-${payload.agentId}-${payload.prospectId}`, payload, {
    delay: Math.max(0, delayMs),
    attempts: 3,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  });
}

// 2. Worker Definition
// Runs as a long-lived background process (`npm run worker`). It processes
// staggered jobs seeded by the launch endpoint, so a campaign keeps sending in
// the background long after the user closes the browser.
let worker: Worker | null = null;

export const initWorker = () => {
  if (worker) return worker;

  worker = new Worker<EmailJobPayload>(
    QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      const { agentId, prospectId, userId, emailAccountId, sequenceStep } = job.data;
      console.log(`Processing job ${job.id}: Agent ${agentId} -> Prospect ${prospectId}`);

      // A. Agent must still be ACTIVE (this is how Pause/Stop takes effect).
      const agent = await db.agent.findUnique({
        where: { id: agentId },
        include: {
          products: {
            include: { product: { select: { name: true, productFiles: true } } },
          },
        },
      });
      if (!agent) {
        console.log(`Agent ${agentId} no longer exists. Skipping.`);
        return { skipped: "agent-missing" };
      }
      if (agent.status !== "ACTIVE") {
        console.log(`Agent ${agentId} is ${agent.status}. Skipping send.`);
        return { skipped: "agent-not-active" };
      }
      // Reset the agent's daily counter when a new UTC day has started.
      if (!sameUtcDay(agent.lastResetDate, new Date())) {
        await db.agent.update({ where: { id: agentId }, data: { sentToday: 0, lastResetDate: new Date() } });
        agent.sentToday = 0;
      }

      // B. Respect the sending schedule (in the prospect's local timezone when
      // known) — re-delay to the next window if needed.
      const prospectTz = await db.prospect.findUnique({ where: { id: prospectId }, select: { timezone: true } });
      if (!isWithinSchedule(agent, new Date(), prospectTz?.timezone)) {
        console.log(`Outside schedule window for agent ${agentId}. Re-queueing in 30m.`);
        await scheduleEmailJob(job.data, 30 * 60_000);
        return { rescheduled: true };
      }

      // C. Stop the sequence if the prospect already replied.
      const enrollment = await db.sequenceEnrollment.findFirst({
        where: { prospectId, sequence: { agentId } },
      });
      if (enrollment && (enrollment.status === "REPLIED" || enrollment.status === "PAUSED")) {
        console.log(`Prospect ${prospectId} enrollment is ${enrollment.status}. Skipping.`);
        return { skipped: "enrollment-stopped" };
      }

      // D. Rate limits (global + per-account).
      const globalSettings = await db.globalSettings.findUnique({ where: { userId } });
      const emailAccount = await db.emailAccount.findUnique({ where: { id: emailAccountId } });
      if (!emailAccount || emailAccount.status === "DISCONNECTED") {
        throw new Error("Email account not found or disconnected");
      }
      // Reset the mailbox's daily counter when a new UTC day has started.
      if (!sameUtcDay(emailAccount.lastResetDate, new Date())) {
        await db.emailAccount.update({ where: { id: emailAccount.id }, data: { sentToday: 0, lastResetDate: new Date() } });
        emailAccount.sentToday = 0;
      }
      if (emailAccount.sentToday >= emailAccount.dailyLimit) {
        console.log("Per-account daily limit reached. Re-queueing for tomorrow.");
        await scheduleEmailJob(job.data, nextDayDelayMs());
        return { rescheduled: "account-limit" };
      }
      // Effective daily cap = min(user setting, plan limit).
      const planLimits = await getOrgPlanLimits(emailAccount.organizationId);
      const planDaily = planLimits.dailyEmails === Infinity ? Number.MAX_SAFE_INTEGER : planLimits.dailyEmails;
      const effectiveDaily = Math.min(globalSettings?.dailyEmailLimit ?? Number.MAX_SAFE_INTEGER, planDaily);
      if (agent.sentToday >= effectiveDaily) {
        console.log("Daily limit (plan/settings) reached. Re-queueing for tomorrow.");
        await scheduleEmailJob(job.data, nextDayDelayMs());
        return { rescheduled: "daily-limit" };
      }

      const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
      if (!prospect) throw new Error("Prospect not found");
      if (prospect.isDnc) {
        console.log(`Prospect ${prospectId} is on DNC list. Skipping.`);
        return { skipped: "dnc" };
      }
      if (await isSuppressed(userId, prospect.email)) {
        console.log(`Prospect ${prospectId} (${prospect.email}) is on the suppression list. Skipping.`);
        return { skipped: "suppressed" };
      }

      // E. Resolve content. Pre-computed emails (pushed in bulk over MCP by the
      // user's own Claude) ALWAYS win — sent verbatim with NO platform LLM call.
      // Otherwise fall back to the static/AI generator.
      const prepared = await db.preparedEmail.findUnique({
        where: { agentId_prospectId_step: { agentId, prospectId, step: sequenceStep || 0 } },
      });
      let subject: string;
      let generatedBody: string;
      let variantId: string | null = null;
      if (prepared) {
        subject = spin(prepared.subject);
        generatedBody = spin(prepared.body);
      } else if (agent.sequenceMode === "EXTERNAL") {
        // EXTERNAL agents only send what was prepared; nothing to send for this prospect/step.
        console.log(`No prepared email for prospect ${prospectId} step ${sequenceStep || 0} (EXTERNAL). Skipping.`);
        return { skipped: "no-prepared-email" };
      } else {
        const generated = await generatePersonalizedEmail({
          userId,
          agentId,
          prospectId,
          sequenceStep: sequenceStep || 0,
          senderName: emailAccount.displayName || undefined,
        });
        subject = spin(generated.subject);
        generatedBody = spin(generated.body);
        variantId = generated.variant ?? null;
      }

      // One-click unsubscribe (compliance + deliverability) if enabled on the agent.
      const unsubUrl = `${appUrl()}/api/unsubscribe/${makeUnsubToken(prospectId)}`;
      const body = agent.includeUnsubscribe
        ? `${generatedBody}\n\n—\nIf you'd prefer not to hear from us, unsubscribe: ${unsubUrl}`
        : generatedBody;
      const unsubHeaders: Record<string, string> = agent.includeUnsubscribe
        ? {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : {};

      // F. Create the row first so tracking links/pixel can reference its id.
      const emailRow = await db.email.create({
        data: {
          agentId,
          emailAccountId,
          prospectId,
          fromEmail: emailAccount.emailAddress,
          toEmail: prospect.email,
          direction: "SENT",
          subject,
          body,
          status: "SENDING",
          sequenceStep: sequenceStep || 0,
          variantId,
        },
      });

      // G. Send (always send HTML version, incorporating tracking if enabled).
      const useTracking = agent.trackOpens || agent.trackClicks;
      let html = useTracking
        ? buildTrackedHtml(emailRow.id, generatedBody, { trackOpens: agent.trackOpens, trackClicks: agent.trackClicks })
        : `<div>${generatedBody.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c)).replace(/\r?\n/g, "<br>")}</div>`;

      // Append a styled unsubscribe button to the HTML body if enabled on the agent
      if (agent.includeUnsubscribe) {
        html += `
<div style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">If you'd prefer not to hear from us, click below to unsubscribe:</p>
  <a href="${unsubUrl}" style="display: inline-block; background-color: #f3f4f6; color: #4b5563; font-size: 12px; font-weight: 500; text-decoration: none; padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px;">Unsubscribe</a>
</div>`;
      }
      // Build attachments from productFiles JSON stored on linked products.
      // Content is loaded through the storage driver (local disk or S3), and
      // constrained to the user's own "products/<userId>/" key prefix.
      const attachments: EmailAttachment[] = [];
      const userKeyPrefix = `products/${userId}/`;

      for (const ap of agent.products || []) {
        try {
          const files: Array<{ url: string; filename: string; description: string }> =
            (ap.product as any).productFiles ? JSON.parse((ap.product as any).productFiles) : [];
          for (const f of files) {
            const key = uploadUrlToKey(f.url);
            if (!key || !key.startsWith(userKeyPrefix)) {
              console.warn(`Blocked traversal/cross-tenant file attachment attempt. Path: ${f.url}`);
              continue;
            }
            const content = await readUpload(key);
            if (content) {
              attachments.push({ filename: f.filename, content });
            }
          }
        } catch { }
      }

      const { messageId } = await sendViaAccount(emailAccount, {
        to: prospect.email,
        subject,
        text: body,
        html,
        headers: unsubHeaders,
        ...(attachments.length ? { attachments } : {}),
      });

      await db.email.update({
        where: { id: emailRow.id },
        data: { status: "SENT", sentAt: new Date(), messageId, ...(html ? { bodyHtml: html } : {}) },
      });
      if (prepared) {
        await db.preparedEmail.update({ where: { id: prepared.id }, data: { status: "SENT" } }).catch(() => {});
      }
      await db.emailAccount.update({
        where: { id: emailAccountId },
        data: { sentToday: { increment: 1 } },
      });
      await db.agent.update({
        where: { id: agentId },
        data: { sentToday: { increment: 1 } },
      });

      // H. Multi-step sequence: schedule the next follow-up (same mailbox, for
      // thread continuity) unless this was the last step. Reply auto-stop is
      // enforced at the top of the next job via the enrollment status check.
      const steps = parseSequenceSteps(agent);
      const currentStep = sequenceStep || 0;
      const nextStep = currentStep + 1;
      if (nextStep < steps.length) {
        const waitDays = Math.max(0, steps[nextStep].waitDays || 0);
        const delayMs = waitDays * 24 * 60 * 60 * 1000;
        if (enrollment) {
          await db.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { currentStep: nextStep, nextSendAt: new Date(Date.now() + delayMs) },
          });
        }
        await scheduleEmailJob(
          { agentId, prospectId, userId, emailAccountId, sequenceStep: nextStep },
          delayMs
        );
      } else if (enrollment) {
        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }

      return { success: true, messageId, step: currentStep, nextStep: nextStep < steps.length ? nextStep : null };
    },
    { connection, concurrency: 5 }
  );

  worker.on("failed", async (job: Job<EmailJobPayload> | undefined, err: Error) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
    if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
      const account = await db.emailAccount
        .findUnique({ where: { id: job.data.emailAccountId }, select: { emailAddress: true } })
        .catch(() => null);
      const prospect = await db.prospect
        .findUnique({ where: { id: job.data.prospectId }, select: { email: true } })
        .catch(() => null);

      try {
        const existingSendingRow = await db.email.findFirst({
          where: {
            agentId: job.data.agentId,
            emailAccountId: job.data.emailAccountId,
            prospectId: job.data.prospectId,
            status: "SENDING",
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingSendingRow) {
          await db.email.update({
            where: { id: existingSendingRow.id },
            data: {
              status: "FAILED",
              subject: "Send failed",
              body: err.message,
            },
          });
        } else {
          await db.email.create({
            data: {
              agentId: job.data.agentId,
              emailAccountId: job.data.emailAccountId,
              prospectId: job.data.prospectId,
              fromEmail: account?.emailAddress || "unknown",
              toEmail: prospect?.email || "unknown",
              direction: "SENT",
              subject: "Send failed",
              body: err.message,
              status: "FAILED",
            },
          });
        }
      } catch (e) {
        console.error("Failed to update or create failed email status:", e);
      }
    }
  });

  console.log("BullMQ Email Worker initialized.");
  return worker;
};

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function nextDayDelayMs(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 5, 0, 0);
  return tomorrow.getTime() - now.getTime();
}
