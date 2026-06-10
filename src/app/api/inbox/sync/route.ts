import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncAllInboxes } from "@/lib/email/imap-sync";

/**
 * POST /api/inbox/sync — pull inbound mail for the current user's accounts right
 * now (on-demand). The background poller does this automatically every few
 * minutes; this endpoint backs the "Sync" button and works without a worker.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await syncAllInboxes(session.user.id);
    return NextResponse.json({
      message: `Synced ${res.accounts} mailbox(es): ${res.fetched} new message(s), ${res.replies} repl${res.replies === 1 ? "y" : "ies"}.`,
      ...res,
    });
  } catch (error) {
    console.error("Manual inbox sync error:", error);
    return NextResponse.json({ error: (error as Error).message || "Sync failed" }, { status: 500 });
  }
}
