import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { z } from "zod";

const patchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

/** PATCH /api/org/members — change a member's role (admin only). */
export async function PATCH(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role) || !me.organizationId) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  try {
    const { userId, role } = patchSchema.parse(await request.json());
    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target || target.organizationId !== me.organizationId) {
      return NextResponse.json({ error: "Member not found in your organization" }, { status: 404 });
    }
    // Only an OWNER may grant/revoke the OWNER role.
    if ((role === "OWNER" || target.role === "OWNER") && me.role !== "OWNER") {
      return NextResponse.json({ error: "Only the owner can change owner roles." }, { status: 403 });
    }
    const updated = await db.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json({ id: updated.id, role: updated.role });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/org/members?userId=... — remove a member from the org (admin). */
export async function DELETE(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role) || !me.organizationId) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === me.id) return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.organizationId !== me.organizationId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.role === "OWNER") return NextResponse.json({ error: "Cannot remove the owner." }, { status: 400 });

  // Detach from org and unshare/unassign their mailboxes within this org.
  await db.emailAccount.updateMany({
    where: { assignedToUserId: userId, organizationId: me.organizationId },
    data: { assignedToUserId: null },
  });
  await db.user.update({ where: { id: userId }, data: { organizationId: null, memberStatus: "ACTIVE", role: "OWNER" } });
  return NextResponse.json({ success: true });
}
