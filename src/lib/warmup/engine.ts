import { db } from "@/lib/db";
import { sendViaAccount } from "@/lib/email/sender";
import type { EmailAccount } from "@prisma/client";

// Marker prefix so the IMAP sync can recognize warmup mail and keep it out of
// the real inbox / stats.
export const WARMUP_PREFIX = "[MXW]";

const TOPICS = [
  { subject: "Quick sync on the roadmap", body: "Hey,\n\nJust circling back on the notes from earlier — looks good on my end. Let's keep momentum going this week.\n\nThanks!" },
  { subject: "Notes from today", body: "Hi,\n\nSharing a quick recap so we're aligned. Nothing blocking — talk soon.\n\nBest" },
  { subject: "Following up", body: "Hello,\n\nThanks again for the update. I'll review and get back to you shortly.\n\nCheers" },
  { subject: "Re: schedule", body: "Hi there,\n\nThat timing works for me. Appreciate the flexibility — see you then.\n\nThanks" },
  { subject: "Great progress", body: "Hey,\n\nReally happy with how this is shaping up. Let's keep it rolling.\n\nBest regards" },
];

export function isWarmupSubject(subject: string): boolean {
  return subject.includes(WARMUP_PREFIX);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sameUtcDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

/**
 * Run one warmup cycle: each warmup-enabled mailbox sends a few friendly emails
 * to other warmup-enabled mailboxes (peers), tagged so they're auto-engaged on
 * receipt. Volume ramps up to the mailbox's `warmupDailyMax` per day. Warmup
 * mail is flagged `isWarmup` and excluded from campaign stats and the inbox.
 */
export async function runWarmupCycle(perCycle = 2): Promise<{ senders: number; sent: number }> {
  const accounts = await db.emailAccount.findMany({
    where: { warmupEnabled: true, isActive: true, status: { not: "DISCONNECTED" } },
  });
  if (accounts.length < 2) return { senders: 0, sent: 0 };

  let totalSent = 0;
  let activeSenders = 0;

  for (const sender of accounts) {
    // Reset the daily warmup counter on a new day.
    let warmupSentToday = sender.warmupSentToday;
    if (!sameUtcDay(sender.warmupLastReset, new Date())) {
      warmupSentToday = 0;
      await db.emailAccount.update({ where: { id: sender.id }, data: { warmupSentToday: 0, warmupLastReset: new Date() } });
    }

    const remaining = Math.max(0, sender.warmupDailyMax - warmupSentToday);
    if (remaining === 0) continue;

    const peers = accounts.filter((a) => a.id !== sender.id);
    const toSend = Math.min(remaining, perCycle, peers.length);
    if (toSend === 0) continue;
    activeSenders++;

    for (let i = 0; i < toSend; i++) {
      const peer = pick(peers);
      const topic = pick(TOPICS);
      const tag = sender.warmupTag ? ` ${sender.warmupTag}` : "";
      const subject = `${WARMUP_PREFIX}${tag} ${topic.subject}`;
      try {
        const { messageId } = await sendViaAccount(sender, { to: peer.emailAddress, subject, text: topic.body });
        await db.email.create({
          data: {
            emailAccountId: sender.id,
            fromEmail: sender.emailAddress,
            toEmail: peer.emailAddress,
            direction: "SENT",
            subject,
            body: topic.body,
            status: "SENT",
            sentAt: new Date(),
            isWarmup: true,
            messageId,
          },
        });
        totalSent++;
      } catch (e) {
        console.error(`[warmup] send failed from ${sender.emailAddress}:`, (e as Error).message);
      }
    }

    await db.emailAccount.update({ where: { id: sender.id }, data: { warmupSentToday: { increment: toSend } } });
  }

  return { senders: activeSenders, sent: totalSent };
}

/**
 * Auto-engage with a received warmup email: reply once (only to originals, not
 * to "Re:" messages, to avoid loops) so both mailboxes build two-way history.
 */
export async function autoEngageWarmup(account: EmailAccount, fromAddr: string, subject: string, inReplyTo?: string): Promise<void> {
  if (/^re:/i.test(subject.replace(WARMUP_PREFIX, "").trim())) return; // already a reply — stop the chain
  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
  const body = pick(["Thanks — got it!", "Sounds good, appreciate it.", "Perfect, thanks for the update.", "Great, talk soon."]);
  try {
    const { messageId } = await sendViaAccount(account, { to: fromAddr, subject: replySubject, text: body, inReplyTo });
    await db.email.create({
      data: {
        emailAccountId: account.id,
        fromEmail: account.emailAddress,
        toEmail: fromAddr,
        direction: "SENT",
        subject: replySubject,
        body,
        status: "SENT",
        sentAt: new Date(),
        isWarmup: true,
        inReplyTo,
        messageId,
      },
    });
  } catch (e) {
    console.error(`[warmup] auto-engage failed:`, (e as Error).message);
  }
}
