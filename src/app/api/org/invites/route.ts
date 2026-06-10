import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { getOrgPlanLimits } from "@/lib/billing/plans";
import { sendInviteEmail, sendExistingUserAddedEmail } from "@/lib/email/transactional";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

/**
 * POST /api/org/invites — invite someone by email (admin).
 * If they already have an account they're added immediately; otherwise a
 * pending invite is stored and auto-applied when they register with that email.
 */
export async function POST(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role) || !me.organizationId) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  try {
    const { email, role } = createSchema.parse(await request.json());
    const normalized = email.toLowerCase();
    const org = await db.organization.findUnique({ where: { id: me.organizationId }, select: { name: true } });
    const orgName = org?.name || "your team";

    // Enforce the plan's seat limit.
    const limits = await getOrgPlanLimits(me.organizationId);
    if (limits.seats !== Infinity) {
      const [members, pending] = await Promise.all([
        db.user.count({ where: { organizationId: me.organizationId } }),
        db.orgInvite.count({ where: { organizationId: me.organizationId, status: "PENDING" } }),
      ]);
      if (members + pending >= limits.seats) {
        return NextResponse.json(
          { error: `Your plan includes ${limits.seats} seat(s). Upgrade to invite more teammates.` },
          { status: 402 }
        );
      }
    }

    const existing = await db.user.findUnique({ where: { email: normalized } });
    if (existing) {
      if (existing.organizationId === me.organizationId) {
        return NextResponse.json({ error: "That person is already in your organization." }, { status: 409 });
      }
      if (existing.organizationId) {
        return NextResponse.json({ error: "That user already belongs to another organization." }, { status: 409 });
      }
      await db.user.update({
        where: { id: existing.id },
        data: { organizationId: me.organizationId, role, memberStatus: "ACTIVE" },
      });
      await sendExistingUserAddedEmail({ to: normalized, orgName, role }).catch(() => {});
      return NextResponse.json({ added: true, message: "Existing user added to your organization." });
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const invite = await db.orgInvite.create({
      data: { organizationId: me.organizationId, email: normalized, role, token, invitedById: me.id, expiresAt },
    });
    const { sent } = await sendInviteEmail({ to: normalized, orgName, inviterName: me.name, role });
    return NextResponse.json({
      invited: true,
      emailSent: sent,
      invite: { id: invite.id, email: invite.email, role: invite.role },
      message: sent
        ? "Invite email sent. They'll join automatically when they sign up with this email."
        : "Invite created. (No transactional email provider configured — share the signup link manually.) They'll join automatically when they sign up with this email.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/org/invites?id=... — revoke a pending invite (admin). */
export async function DELETE(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role) || !me.organizationId) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const invite = await db.orgInvite.findUnique({ where: { id } });
  if (!invite || invite.organizationId !== me.organizationId) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  await db.orgInvite.update({ where: { id }, data: { status: "REVOKED" } });
  return NextResponse.json({ success: true });
}
