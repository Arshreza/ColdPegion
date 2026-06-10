import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/org";
import { computeMailboxStats, rollupByDomain } from "@/lib/stats/deliverability";

/**
 * GET /api/stats/deliverability — per-mailbox and per-domain stats for the
 * user's organization (or their own mailboxes if not in an org). Lets users see
 * which domain/mailbox is over- or under-used and which to run campaigns from.
 */
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const mailboxes = await computeMailboxStats({ organizationId: me.organizationId, userId: me.id });
    const domains = rollupByDomain(mailboxes);
    return NextResponse.json({ mailboxes, domains });
  } catch (error) {
    console.error("Deliverability stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
