import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { z } from "zod";

const patchSchema = z.object({
  dailyLimit: z.coerce.number().int().positive().optional(),
  displayName: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  warmupEnabled: z.boolean().optional(),
  warmupDailyMax: z.coerce.number().int().positive().optional(),
  warmupTag: z.string().max(40).optional(),
  // Org admin controls
  sharedWithOrg: z.boolean().optional(),
  assignedToUserId: z.string().nullable().optional(),
});

/** Can the current user manage this mailbox (owner, or admin in the same org)? */
async function canManage(meId: string, meRole: string | null | undefined, meOrg: string | null | undefined, accountId: string) {
  const account = await db.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) return { account: null, allowed: false };
  const isOwner = account.userId === meId;
  const isOrgAdmin = isAdminRole(meRole) && !!meOrg && account.organizationId === meOrg;
  return { account, allowed: isOwner || isOrgAdmin };
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { account, allowed } = await canManage(me.id, me.role, me.organizationId, params.id);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (!allowed) return NextResponse.json({ error: "You don't have permission to manage this mailbox." }, { status: 403 });

    const data = patchSchema.parse(await request.json());

    // Only org admins may change sharing/assignment.
    if ((data.sharedWithOrg !== undefined || data.assignedToUserId !== undefined) && !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Only admins can share or assign mailboxes." }, { status: 403 });
    }
    // Validate the assignee belongs to the same org.
    if (data.assignedToUserId) {
      const assignee = await db.user.findUnique({ where: { id: data.assignedToUserId } });
      if (!assignee || assignee.organizationId !== me.organizationId) {
        return NextResponse.json({ error: "Assignee must be a member of your organization." }, { status: 400 });
      }
    }

    const updated = await db.emailAccount.update({ where: { id: params.id }, data });
    return NextResponse.json({
      id: updated.id,
      dailyLimit: updated.dailyLimit,
      displayName: updated.displayName,
      isActive: updated.isActive,
      sharedWithOrg: updated.sharedWithOrg,
      assignedToUserId: updated.assignedToUserId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { account, allowed } = await canManage(me.id, me.role, me.organizationId, params.id);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (!allowed) return NextResponse.json({ error: "You don't have permission to remove this mailbox." }, { status: 403 });
    await db.emailAccount.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
