import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { classifyReply } from "@/lib/llm/classifier";
import { isWarmupSubject, autoEngageWarmup } from "@/lib/warmup/engine";
import type { EmailAccount } from "@prisma/client";

interface ImapCreds {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * Resolve IMAP credentials for an account.
 *  - Explicit IMAP fields win (SMTP / SendGrid / custom).
 *  - Gmail App-Password accounts fall back to imap.gmail.com using the same
 *    app password — no separate config needed.
 * Returns null if the account can't be synced (no usable credentials).
 */
function resolveImapCreds(account: EmailAccount): ImapCreds | null {
  const host = account.imapHost || (account.provider === "GMAIL" ? "imap.gmail.com" : null);
  if (!host) return null;

  let pass: string | null = null;
  if (account.imapPassword) pass = decrypt(account.imapPassword);
  else if (account.provider === "GMAIL" && account.gmailAppPassword) pass = decrypt(account.gmailAppPassword);
  if (!pass) return null;

  return {
    host,
    port: account.imapPort || 993,
    secure: account.imapSecure ?? true,
    user: account.imapUsername || account.emailAddress,
    pass,
  };
}

/** True if we have any chance of syncing this account over IMAP. */
export function isImapCapable(account: EmailAccount): boolean {
  return resolveImapCreds(account) !== null;
}

function normalizeMsgId(id?: string | null): string | null {
  if (!id) return null;
  const m = id.trim().match(/<[^>]+>/);
  return m ? m[0] : id.trim();
}

/**
 * Pull new inbound messages for one account, store them as RECEIVED emails, and
 * — when a message is a reply to one of our sent emails — mark the prospect's
 * sequence enrollment REPLIED so the worker stops following up.
 */
export async function syncAccountInbox(accountId: string): Promise<{ fetched: number; replies: number }> {
  const account = await db.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) return { fetched: 0, replies: 0 };
  const creds = resolveImapCreds(account);
  if (!creds) return { fetched: 0, replies: 0 };

  const client = new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.user, pass: creds.pass },
    logger: false,
  });

  client.on("error", (err) => {
    console.error(`IMAP Client Error for account ${accountId}:`, err.message);
  });

  let fetched = 0;
  let replies = 0;
  const since = account.lastSyncedAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ since }, { uid: true });
      if (uids && uids.length) {
        for await (const msg of client.fetch(uids, { source: true, envelope: true, internalDate: true }, { uid: true })) {
          try {
            const handled = await ingestMessage(account, msg.source as Buffer);
            fetched++;
            if (handled.isReply) replies++;
            // Keep warmup mail out of the way: mark it read.
            if (handled.isWarmup) {
              await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true }).catch(() => {});
            }
          } catch (e) {
            console.error("Failed to ingest message:", (e as Error).message);
          }
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  await db.emailAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
  return { fetched, replies };
}

async function ingestMessage(account: EmailAccount, source: Buffer): Promise<{ isReply: boolean; isWarmup: boolean }> {
  const parsed = await simpleParser(source);
  const messageId = normalizeMsgId(parsed.messageId);
  const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase() || "";
  const subject = parsed.subject || "(no subject)";
  const body = parsed.text || parsed.html || "";
  const ir = normalizeMsgId(parsed.inReplyTo);

  // Skip our own outbound copies (e.g. Gmail stores Sent in some setups).
  if (fromAddr && fromAddr === account.emailAddress.toLowerCase()) {
    return { isReply: false, isWarmup: false };
  }

  // Dedupe by message id within this account.
  if (messageId) {
    const existing = await db.email.findFirst({
      where: { emailAccountId: account.id, messageId, direction: "RECEIVED" },
      select: { id: true },
    });
    if (existing) return { isReply: false, isWarmup: false };
  }

  // Bounce / non-delivery report: mark the prospect invalid and stop sending.
  const bounceProbe = `${subject}\n${body.slice(0, 600)}`;
  const looksLikeBounce =
    /mailer-daemon|postmaster/i.test(fromAddr) ||
    /undeliverable|delivery status notification|delivery has failed|failure notice|returned mail|mail delivery (failed|subsystem)|message not delivered|address (not found|rejected)|550[ -]5\.1\.1|user unknown/i.test(bounceProbe);
  if (looksLikeBounce) {
    const candidates = Array.from(new Set((body.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g) || []).map((e) => e.toLowerCase())));
    for (const addr of candidates) {
      if (addr === account.emailAddress.toLowerCase()) continue;
      const prospect = await db.prospect.findFirst({ where: { userId: account.userId, email: { equals: addr, mode: "insensitive" } } });
      if (!prospect) continue;
      await db.prospect.update({ where: { id: prospect.id }, data: { bounceStatus: "INVALID", isDnc: true } });
      const orig = await db.email.findFirst({
        where: { emailAccountId: account.id, direction: "SENT", toEmail: { equals: addr, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });
      if (orig) await db.email.update({ where: { id: orig.id }, data: { status: "BOUNCED", bouncedAt: new Date() } });
      await db.sequenceEnrollment.updateMany({ where: { prospectId: prospect.id, status: "ACTIVE" }, data: { status: "BOUNCED" } });
      break; // first matched recipient is enough
    }
    return { isReply: false, isWarmup: false };
  }

  // Warmup mail: record it, auto-engage once, and keep it out of inbox/stats.
  if (isWarmupSubject(subject)) {
    await db.email.create({
      data: {
        emailAccountId: account.id,
        fromEmail: fromAddr || "unknown",
        toEmail: account.emailAddress,
        direction: "RECEIVED",
        subject,
        body,
        status: "DELIVERED",
        isWarmup: true,
        messageId: messageId ?? undefined,
        inReplyTo: ir ?? undefined,
        receivedAt: parsed.date ?? new Date(),
      },
    });
    if (fromAddr) await autoEngageWarmup(account, fromAddr, subject, messageId ?? undefined);
    return { isReply: false, isWarmup: true };
  }

  // Find the sent email this is replying to: header references first, then a
  // fallback match on the prospect's address.
  const refIds = new Set<string>();
  if (ir) refIds.add(ir);
  const references = Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [];
  for (const r of references) {
    const n = normalizeMsgId(r);
    if (n) refIds.add(n);
  }

  let original = refIds.size
    ? await db.email.findFirst({
        where: { emailAccountId: account.id, direction: "SENT", messageId: { in: Array.from(refIds) } },
        orderBy: { createdAt: "desc" },
      })
    : null;

  if (!original && fromAddr) {
    original = await db.email.findFirst({
      where: { emailAccountId: account.id, direction: "SENT", toEmail: { equals: fromAddr, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
  }

  const prospect = fromAddr
    ? await db.prospect.findFirst({ where: { userId: account.userId, email: { equals: fromAddr, mode: "insensitive" } } })
    : null;

  const isReply = Boolean(original);

  // AI-categorize inbound mail (replies always; other inbound too, cheaply).
  const category = await classifyReply(account.userId, subject, body);

  await db.email.create({
    data: {
      agentId: original?.agentId ?? null,
      emailAccountId: account.id,
      prospectId: prospect?.id ?? original?.prospectId ?? null,
      fromEmail: fromAddr || "unknown",
      toEmail: account.emailAddress,
      direction: "RECEIVED",
      subject,
      body,
      status: isReply ? "REPLIED" : "DELIVERED",
      replyCategory: category,
      messageId: messageId ?? undefined,
      inReplyTo: ir ?? undefined,
      receivedAt: parsed.date ?? new Date(),
    },
  });

  // Honor unsubscribe requests immediately (compliance + deliverability).
  if (category === "UNSUBSCRIBE" && prospect) {
    await db.prospect.update({ where: { id: prospect.id }, data: { isDnc: true } });
  }

  if (isReply && original) {
    // Mark the original outbound as replied + carry the category.
    await db.email.update({
      where: { id: original.id },
      data: { status: "REPLIED", repliedAt: new Date(), replyCategory: category },
    });

    // Stop the sequence for this prospect (auto-stop on reply / unsubscribe).
    const prospectId = prospect?.id ?? original.prospectId;
    if (prospectId && original.agentId) {
      await db.sequenceEnrollment.updateMany({
        where: { prospectId, status: "ACTIVE", sequence: { agentId: original.agentId } },
        data: { status: "REPLIED", repliedAt: new Date() },
      });
    }
  }

  return { isReply, isWarmup: false };
}

/**
 * Sync every IMAP-capable account for a given user (or all users when no userId
 * is provided — used by the background poller).
 */
export async function syncAllInboxes(userId?: string): Promise<{ accounts: number; fetched: number; replies: number }> {
  const accounts = await db.emailAccount.findMany({
    where: { ...(userId ? { userId } : {}), isActive: true },
  });

  let totalFetched = 0;
  let totalReplies = 0;
  let synced = 0;
  for (const account of accounts) {
    if (!isImapCapable(account)) continue;
    try {
      const res = await syncAccountInbox(account.id);
      totalFetched += res.fetched;
      totalReplies += res.replies;
      synced++;
    } catch (e) {
      console.error(`Inbox sync failed for ${account.emailAddress}:`, (e as Error).message);
      await db.emailAccount
        .update({ where: { id: account.id }, data: { lastError: (e as Error).message } })
        .catch(() => {});
    }
  }
  return { accounts: synced, fetched: totalFetched, replies: totalReplies };
}
