import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/org";
import { z } from "zod";

/** GET /api/org — organization profile, members, invites, join requests. */
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.organizationId) return NextResponse.json({ error: "No organization" }, { status: 404 });

  const org = await db.organization.findUnique({
    where: { id: me.organizationId },
    include: { domains: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const members = await db.user.findMany({
    where: { organizationId: me.organizationId },
    select: { id: true, name: true, email: true, role: true, memberStatus: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const admin = isAdminRole(me.role);
  const invites = admin
    ? await db.orgInvite.findMany({
        where: { organizationId: me.organizationId, status: "PENDING" },
        select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const joinRequests = admin
    ? await db.joinRequest.findMany({
        where: { organizationId: me.organizationId, status: "PENDING" },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return NextResponse.json({
    org: { id: org.id, name: org.name, primaryDomain: org.primaryDomain, domains: org.domains.map((d) => d.domain) },
    me: { id: me.id, role: me.role, isAdmin: admin },
    members,
    invites,
    joinRequests: joinRequests.map((j) => ({ id: j.id, user: j.user, createdAt: j.createdAt })),
  });
}

/** PATCH /api/org — rename the organization (admin only). */
export async function PATCH(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role) || !me.organizationId) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(await request.json());
    const org = await db.organization.update({ where: { id: me.organizationId }, data: { name } });
    return NextResponse.json({ id: org.id, name: org.name });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
