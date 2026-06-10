import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendViaAccount } from "@/lib/email/sender";
import { z } from "zod";

const schema = z.object({
  emailId: z.string().min(1),
  body: z.string().min(1),
});

/**
 * POST /api/inbox/reply — send a manual reply to a thread from the unified inbox.
 * Replying pauses the prospect's active sequence so the agent doesn't keep
 * following up while a human conversation is happening.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { emailId, body } = schema.parse(await request.json());

    const source = await db.email.findFirst({
      where: { id: emailId, emailAccount: { userId: session.user.id } },
      include: { emailAccount: true },
    });
    if (!source) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const to = source.direction === "RECEIVED" ? source.fromEmail : source.toEmail;
    const subject = source.subject.startsWith("Re:") ? source.subject : `Re: ${source.subject}`;

    const { messageId } = await sendViaAccount(source.emailAccount, {
      to,
      subject,
      text: body,
      inReplyTo: source.messageId ?? undefined,
    });

    await db.email.create({
      data: {
        agentId: source.agentId,
        emailAccountId: source.emailAccountId,
        prospectId: source.prospectId,
        fromEmail: source.emailAccount.emailAddress,
        toEmail: to,
        direction: "SENT",
        subject,
        body,
        status: "SENT",
        sentAt: new Date(),
        inReplyTo: source.messageId ?? undefined,
        messageId,
      },
    });

    // Pause the sequence for this prospect (human is now in the loop).
    if (source.prospectId && source.agentId) {
      await db.sequenceEnrollment.updateMany({
        where: { prospectId: source.prospectId, status: "ACTIVE", sequence: { agentId: source.agentId } },
        data: { status: "PAUSED" },
      });
    }

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Reply error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to send reply" }, { status: 500 });
  }
}
