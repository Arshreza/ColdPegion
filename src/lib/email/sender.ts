import * as nodemailer from "nodemailer";
import { Resend } from "resend";
import { readFileSync, existsSync } from "fs";
import { decrypt } from "@/lib/encryption";
import type { EmailAccount } from "@prisma/client";

export interface EmailAttachment {
  filename: string;
  fsPath: string; // absolute filesystem path
}

export interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
}

export interface SendResult {
  messageId: string;
}

/**
 * Build a nodemailer transport for a Gmail or generic SMTP / SendGrid account.
 * Credentials stored in the DB are AES-encrypted, so we decrypt here.
 */
function buildTransport(account: EmailAccount): nodemailer.Transporter {
  if (account.provider === "GMAIL") {
    if (!account.gmailAppPassword) {
      throw new Error("Gmail account is missing an app password.");
    }
    return nodemailer.createTransport({
      host: account.smtpHost || "smtp.gmail.com",
      port: account.smtpPort || 465,
      secure: account.smtpPort ? account.smtpPort === 465 : true,
      auth: {
        user: account.smtpUsername || account.emailAddress,
        pass: decrypt(account.gmailAppPassword),
      },
    });
  }

  // Generic SMTP — also covers SendGrid (host: smtp.sendgrid.net, user: "apikey").
  if (!account.smtpHost || !account.smtpPort) {
    throw new Error("SMTP account is missing host/port configuration.");
  }
  if (!account.smtpPassword) {
    throw new Error("SMTP account is missing a password / API key.");
  }
  return nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: {
      user: account.smtpUsername || account.emailAddress,
      pass: decrypt(account.smtpPassword),
    },
  });
}

/**
 * Send a single email through whichever provider the account is configured for.
 * This is the one place sending happens so every code path stays consistent.
 */
export async function sendViaAccount(account: EmailAccount, args: SendArgs): Promise<SendResult> {
  const fromName = account.displayName || account.emailAddress;
  const from = `"${fromName}" <${account.emailAddress}>`;

  const validAttachments = (args.attachments || []).filter((a) => existsSync(a.fsPath));

  if (account.provider === "RESEND") {
    if (!account.resendApiKey) {
      throw new Error("Resend account is missing an API key.");
    }
    const resend = new Resend(decrypt(account.resendApiKey));
    const mergedHeaders = { ...(args.headers || {}), ...(args.inReplyTo ? { "In-Reply-To": args.inReplyTo } : {}) };
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${account.emailAddress}>`,
      to: args.to,
      subject: args.subject,
      text: args.text,
      ...(args.html ? { html: args.html } : {}),
      ...(Object.keys(mergedHeaders).length ? { headers: mergedHeaders } : {}),
      ...(validAttachments.length ? {
        attachments: validAttachments.map((a) => ({ filename: a.filename, content: readFileSync(a.fsPath).toString("base64") })),
      } : {}),
    });
    if (error) throw new Error(error.message);
    return { messageId: data?.id || `resend-${Date.now()}` };
  }

  // GMAIL or SMTP / SendGrid
  const transporter = buildTransport(account);
  const info = await transporter.sendMail({
    from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    ...(args.html ? { html: args.html } : {}),
    ...(args.headers ? { headers: args.headers } : {}),
    ...(args.inReplyTo ? { inReplyTo: args.inReplyTo, references: args.references || args.inReplyTo } : {}),
    ...(validAttachments.length ? {
      attachments: validAttachments.map((a) => ({ filename: a.filename, path: a.fsPath })),
    } : {}),
  });
  return { messageId: info.messageId };
}

/**
 * Verify that an account's credentials actually work, without sending mail.
 * Returns an error string if the connection fails, otherwise null.
 */
export async function verifyAccountConnection(params: {
  provider: "GMAIL" | "RESEND" | "SMTP";
  emailAddress: string;
  gmailAppPassword?: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
}): Promise<string | null> {
  try {
    if (params.provider === "GMAIL") {
      if (!params.gmailAppPassword) return "Gmail app password is required.";
      const t = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: params.emailAddress, pass: params.gmailAppPassword },
      });
      await t.verify();
      return null;
    }
    if (params.provider === "SMTP") {
      if (!params.smtpHost || !params.smtpPort) return "SMTP host and port are required.";
      if (!params.smtpPassword) return "SMTP password / API key is required.";
      const t = nodemailer.createTransport({
        host: params.smtpHost,
        port: params.smtpPort,
        secure: params.smtpSecure ?? params.smtpPort === 465,
        auth: { user: params.smtpUsername || params.emailAddress, pass: params.smtpPassword },
      });
      await t.verify();
      return null;
    }
    // RESEND — we can't cheaply verify without sending; assume the key format is fine.
    if (params.provider === "RESEND" && !params.resendApiKey) {
      return "Resend API key is required.";
    }
    return null;
  } catch (err: any) {
    return err?.message || "Connection verification failed.";
  }
}
