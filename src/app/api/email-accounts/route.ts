import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { verifyAccountConnection } from "@/lib/email/sender";
import { getSessionUser, deriveDomain } from "@/lib/org";
import { getUserPlan } from "@/lib/billing/plans";
import { z } from "zod";

const emailAccountSchema = z.object({
  emailAddress: z.string().email(),
  displayName: z.string().min(1),
  provider: z.enum(["RESEND", "GMAIL", "SMTP"]),
  resendApiKey: z.string().optional(),
  gmailAppPassword: z.string().optional(),
  // SMTP / SendGrid
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().positive().optional(),
  smtpSecure: z.boolean().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  // IMAP (inbound sync / reply detection)
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().int().positive().optional(),
  imapSecure: z.boolean().optional(),
  imapUsername: z.string().optional(),
  imapPassword: z.string().optional(),
  dailyLimit: z.coerce.number().int().positive().optional(),
});

export async function GET() {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Members see mailboxes they own, ones assigned to them, and any mailbox
    // shared with their organization.
    const accounts = await db.emailAccount.findMany({
      where: {
        OR: [
          { userId: me.id },
          { assignedToUserId: me.id },
          ...(me.organizationId ? [{ organizationId: me.organizationId, sharedWithOrg: true }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        emailAddress: true,
        displayName: true,
        provider: true,
        status: true,
        dailyLimit: true,
        sentToday: true,
        isActive: true,
        smtpHost: true,
        smtpPort: true,
        domain: true,
        sharedWithOrg: true,
        assignedToUserId: true,
        userId: true,
        warmupEnabled: true,
        warmupDailyMax: true,
        warmupTag: true,
        warmupSentToday: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        lastSyncedAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = { user: { id: me.id } };

  try {
    const body = await request.json();
    const data = emailAccountSchema.parse(body);

    // Enforce the plan's mailbox limit.
    const { limits } = await getUserPlan(me.id);
    if (limits.mailboxes !== Infinity) {
      const existingCount = me.organizationId
        ? await db.emailAccount.count({ where: { organizationId: me.organizationId } })
        : await db.emailAccount.count({ where: { userId: me.id } });
      if (existingCount >= limits.mailboxes) {
        return NextResponse.json(
          { error: `Your plan allows ${limits.mailboxes} mailbox(es). Upgrade to connect more.` },
          { status: 402 }
        );
      }
    }

    // Verify the connection before saving (Gmail & SMTP do a real handshake).
    const smtpSecure = data.smtpSecure ?? (data.smtpPort ? data.smtpPort === 465 : true);
    const verifyError = await verifyAccountConnection({
      provider: data.provider,
      emailAddress: data.emailAddress,
      gmailAppPassword: data.gmailAppPassword,
      resendApiKey: data.resendApiKey,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpSecure,
      smtpUsername: data.smtpUsername,
      smtpPassword: data.smtpPassword,
    });

    const status: "CONNECTED" | "ERROR" = verifyError ? "ERROR" : "CONNECTED";

    // IMAP defaults: Gmail uses imap.gmail.com with the same app password, so
    // reply detection works out of the box. SMTP accounts can supply their own.
    const isGmail = data.provider === "GMAIL";
    const imapHost = data.imapHost || (isGmail ? "imap.gmail.com" : undefined);
    const imapEnabled = Boolean(imapHost) && (isGmail || Boolean(data.imapPassword));

    const account = await db.emailAccount.create({
      data: {
        userId: session.user.id,
        organizationId: me.organizationId,
        domain: deriveDomain(data.emailAddress),
        emailAddress: data.emailAddress,
        displayName: data.displayName,
        provider: data.provider,
        resendApiKey: data.resendApiKey ? encrypt(data.resendApiKey) : undefined,
        gmailAppPassword: data.gmailAppPassword ? encrypt(data.gmailAppPassword) : undefined,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpSecure,
        smtpUsername: data.smtpUsername,
        smtpPassword: data.smtpPassword ? encrypt(data.smtpPassword) : undefined,
        imapHost,
        imapPort: data.imapPort || (imapHost ? 993 : undefined),
        imapSecure: data.imapSecure ?? true,
        imapUsername: data.imapUsername,
        imapPassword: data.imapPassword ? encrypt(data.imapPassword) : undefined,
        imapEnabled,
        dailyLimit: data.dailyLimit ?? 50,
        status,
        lastError: verifyError ?? undefined,
      },
    });

    return NextResponse.json(
      {
        id: account.id,
        emailAddress: account.emailAddress,
        displayName: account.displayName,
        provider: account.provider,
        status: account.status,
        lastError: account.lastError,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Email account creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
