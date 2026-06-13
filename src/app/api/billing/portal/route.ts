import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { getDodoClient, isDodoConfigured } from "@/lib/billing/dodo";

/** POST /api/billing/portal — open the Dodo Payments customer portal to manage/cancel. */
export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.organizationId || !isAdminRole(me.role)) return NextResponse.json({ error: "Only admins can manage billing." }, { status: 403 });
  if (!isDodoConfigured()) return NextResponse.json({ error: "Billing isn't configured." }, { status: 503 });

  const org = await db.organization.findUnique({ where: { id: me.organizationId } });
  if (!org?.dodoCustomerId) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });

  try {
    const session = await getDodoClient().customers.customerPortal.create(org.dodoCustomerId);
    return NextResponse.json({ url: session.link });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: (error as Error).message || "Portal failed" }, { status: 500 });
  }
}
