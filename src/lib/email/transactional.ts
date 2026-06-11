import * as nodemailer from "nodemailer";
import { Resend } from "resend";

/**
 * System (transactional) email — invites, approvals, notifications. This is
 * SEPARATE from user campaign mailboxes and is configured via env:
 *
 *   RESEND_API_KEY            -> use Resend
 *   (or) SMTP_HOST + SMTP_PASSWORD [+ SMTP_PORT, SMTP_USER, SMTP_SECURE]
 *   EMAIL_FROM                -> e.g. "ColdPigeon <no-reply@yourdomain.com>"
 *   NEXTAUTH_URL / APP_URL    -> base URL used to build links
 *
 * If nothing is configured the helper is a safe no-op (logs and returns
 * { sent:false }) so the app keeps working without a provider.
 */

export function appUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "ColdPigeon <onboarding@resend.dev>";
}

type Provider = "resend" | "smtp" | "none";

function detectProvider(): Provider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_PASSWORD) return "smtp";
  return "none";
}

export function isTransactionalConfigured(): boolean {
  return detectProvider() !== "none";
}

export interface TxEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendTransactionalEmail(email: TxEmail): Promise<{ sent: boolean; error?: string }> {
  const provider = detectProvider();
  if (provider === "none") {
    console.log(`[transactional] not configured — skipping email to ${email.to} ("${email.subject}")`);
    return { sent: false };
  }

  try {
    if (provider === "resend") {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      const { error } = await resend.emails.send({
        from: fromAddress(),
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text || stripHtml(email.html),
      });
      if (error) throw new Error(error.message);
      return { sent: true };
    }

    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: { user: process.env.SMTP_USER || process.env.EMAIL_FROM || "", pass: process.env.SMTP_PASSWORD! },
    });
    await transporter.sendMail({
      from: fromAddress(),
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text || stripHtml(email.html),
    });
    return { sent: true };
  } catch (e) {
    console.error("[transactional] send failed:", (e as Error).message);
    return { sent: false, error: (e as Error).message };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;"><tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:24px 28px;border-bottom:1px solid #eef0f2;font-weight:700;font-size:18px;color:#111;">ColdPigeon</td></tr>
      <tr><td style="padding:28px;color:#374151;font-size:14px;line-height:1.6;">
        <h1 style="margin:0 0 12px;font-size:18px;color:#111;">${title}</h1>
        ${bodyHtml}
        ${cta ? `<div style="margin:24px 0 4px;"><a href="${cta.url}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;display:inline-block;">${cta.label}</a></div>` : ""}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #eef0f2;color:#9ca3af;font-size:12px;">Sent by ColdPigeon. If this wasn't expected, you can ignore it.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

// ---------- Templated emails ----------

export function sendInviteEmail(params: { to: string; orgName: string; inviterName?: string | null; role: string }) {
  const url = `${appUrl()}/register`;
  const html = layout(
    `You're invited to join ${escape(params.orgName)}`,
    `<p>${params.inviterName ? `${escape(params.inviterName)} has` : "You've been"} invited you to join
     <strong>${escape(params.orgName)}</strong> on ColdPigeon as a <strong>${params.role.toLowerCase()}</strong>.</p>
     <p>Create your account with <strong>this email address</strong> and you'll be added automatically.</p>`,
    { label: "Accept invite", url }
  );
  return sendTransactionalEmail({ to: params.to, subject: `Join ${params.orgName} on ColdPigeon`, html });
}

export function sendExistingUserAddedEmail(params: { to: string; orgName: string; role: string }) {
  const html = layout(
    `You've been added to ${escape(params.orgName)}`,
    `<p>You now have <strong>${params.role.toLowerCase()}</strong> access to <strong>${escape(params.orgName)}</strong> on ColdPigeon.</p>`,
    { label: "Open dashboard", url: `${appUrl()}/dashboard` }
  );
  return sendTransactionalEmail({ to: params.to, subject: `You've been added to ${params.orgName}`, html });
}

export function sendJoinRequestAdminEmail(params: { to: string; orgName: string; requesterName?: string | null; requesterEmail: string }) {
  const html = layout(
    `New join request for ${escape(params.orgName)}`,
    `<p><strong>${escape(params.requesterName || params.requesterEmail)}</strong> (${escape(params.requesterEmail)})
     has requested to join <strong>${escape(params.orgName)}</strong>.</p>
     <p>Review and approve or deny this request from your team settings.</p>`,
    { label: "Review request", url: `${appUrl()}/dashboard/team` }
  );
  return sendTransactionalEmail({ to: params.to, subject: `Join request for ${params.orgName}`, html });
}

export function sendJoinApprovedEmail(params: { to: string; orgName: string }) {
  const html = layout(
    `You're in 🎉`,
    `<p>Your request to join <strong>${escape(params.orgName)}</strong> on ColdPigeon has been approved.</p>`,
    { label: "Open dashboard", url: `${appUrl()}/dashboard` }
  );
  return sendTransactionalEmail({ to: params.to, subject: `Approved: welcome to ${params.orgName}`, html });
}

export function sendPasswordResetEmail(params: { to: string; token: string }) {
  const url = `${appUrl()}/reset-password?token=${params.token}`;
  if (!isTransactionalConfigured()) {
    console.log(`\n==================================================`);
    console.log(`[DEVELOPMENT] PASSWORD RESET LINK FOR ${params.to}:`);
    console.log(url);
    console.log(`==================================================\n`);
  }
  const html = layout(
    "Reset your password",
    `<p>We received a request to reset your password for your ColdPigeon account.</p>
     <p>Click the button below to choose a new password. This link will expire in 1 hour.</p>
     <p>If you did not request a password reset, you can safely ignore this email.</p>`,
    { label: "Reset Password", url }
  );
  return sendTransactionalEmail({ to: params.to, subject: "Reset your ColdPigeon password", html });
}

export function sendVerificationEmail(params: { to: string; token: string }) {
  const url = `${appUrl()}/verify-email?token=${params.token}&email=${encodeURIComponent(params.to)}`;
  if (!isTransactionalConfigured()) {
    console.log(`\n==================================================`);
    console.log(`[DEVELOPMENT] EMAIL VERIFICATION LINK FOR ${params.to}:`);
    console.log(url);
    console.log(`==================================================\n`);
  }
  const html = layout(
    "Verify your email address",
    `<p>Thank you for signing up for ColdPigeon!</p>
     <p>Please click the button below to verify your email address and unlock your dashboard.</p>
     <p>If you did not create a ColdPigeon account, you can safely ignore this email.</p>`,
    { label: "Verify Email", url }
  );
  return sendTransactionalEmail({ to: params.to, subject: "Verify your ColdPigeon email address", html });
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}


