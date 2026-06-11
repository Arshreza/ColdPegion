import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Unified inbox: every email (sent + received) across the user's accounts.
    const emails = await db.email.findMany({
      where: { emailAccount: { userId: session.user.id }, isWarmup: false },
      include: {
        prospect: true,
        agent: true,
        emailAccount: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const formatted = emails.map((email) => ({
      id: email.id,
      subject: email.subject,
      body: email.body,
      status: email.status,
      direction: email.direction,
      isReply: email.direction === "RECEIVED" && email.status === "REPLIED",
      category: email.replyCategory ?? null,
      date: email.receivedAt ?? email.sentAt ?? email.createdAt,
      accountId: email.emailAccountId,
      counterpartyEmail: email.direction === "RECEIVED" ? email.fromEmail : email.toEmail,
      prospect: {
        id: email.prospect?.id ?? null,
        name: email.prospect ? `${email.prospect.firstName ?? ""} ${email.prospect.lastName ?? ""}`.trim() : "Unknown",
        email: email.prospect?.email ?? (email.direction === "RECEIVED" ? email.fromEmail : email.toEmail),
        company: email.prospect?.companyName ?? null,
        isDnc: email.prospect?.isDnc ?? false,
      },
      agentId: email.agentId ?? null,
      agentStatus: email.agent?.status ?? null,
      agentName: email.agent?.name ?? null,
      senderAccount: email.emailAccount.emailAddress,
    }));

    // Surface replies first, then the rest by recency.
    formatted.sort((a, b) => {
      if (a.isReply !== b.isReply) return a.isReply ? -1 : 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Inbox GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
