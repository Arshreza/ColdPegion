import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Re-export the pure / db-only routing helpers so existing imports from
// "@/lib/org" keep working (the split avoids an auth <-> org import cycle).
export {
  FREE_EMAIL_DOMAINS,
  deriveDomain,
  isFreeDomain,
  isBusinessEmail,
  findOrgForDomain,
  routeNewUserToOrg,
} from "@/lib/org-routing";

export interface OrgUser {
  id: string;
  email: string;
  name: string | null;
  organizationId: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberStatus: "ACTIVE" | "PENDING";
}

/** Load the current session's user with org/role fields, or null. */
export async function getSessionUser(): Promise<OrgUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, organizationId: true, role: true, memberStatus: true },
  });
  return (user as OrgUser) || null;
}

export function isAdminRole(role?: string | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}
