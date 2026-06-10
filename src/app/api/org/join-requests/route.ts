import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { sendJoinApprovedEmail } from "@/lib/email/transactional";
import { z } from "zod";

const schema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "deny"]),
});

/** POST /api/org/join-requests — approve/deny a pending join request (admin). */
export async function POST(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role) || !me.organizationId) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  try {
    const { id, action } = schema.parse(await request.json());
    const req = await db.joinRequest.findUnique({ where: { id } });
    if (!req || req.organizationId !== me.organizationId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "approve") {
      const approved = await db.user.update({
        where: { id: req.userId },
        data: { memberStatus: "ACTIVE", role: "MEMBER" },
        select: { email: true },
      });
      await db.joinRequest.update({ where: { id }, data: { status: "APPROVED" } });
      const org = await db.organization.findUnique({ where: { id: req.organizationId }, select: { name: true } });
      await sendJoinApprovedEmail({ to: approved.email, orgName: org?.name || "your team" }).catch(() => {});
      return NextResponse.json({ success: true, status: "APPROVED" });
    }

    // Deny: detach the user so they can create their own workspace instead.
    await db.user.update({ where: { id: req.userId }, data: { organizationId: null, memberStatus: "ACTIVE", role: "OWNER" } });
    await db.joinRequest.update({ where: { id }, data: { status: "DENIED" } });
    return NextResponse.json({ success: true, status: "DENIED" });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
