import { db } from "@/lib/db";
import { sendJoinRequestAdminEmail } from "@/lib/email/transactional";

// Public / free mailbox providers must never be auto-claimed as an org domain.
export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com",
  "live.com", "msn.com", "icloud.com", "me.com", "mac.com", "aol.com", "proton.me",
  "protonmail.com", "gmx.com", "zoho.com", "mail.com", "yandex.com", "pm.me", "hey.com",
]);

export function deriveDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() || "";
}

export function isFreeDomain(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.has(domain);
}

export function isBusinessEmail(email: string): boolean {
  const d = deriveDomain(email);
  return Boolean(d) && !isFreeDomain(d);
}

/** Org that has already claimed a (business) email domain, or null. */
export async function findOrgForDomain(domain: string) {
  if (!domain || isFreeDomain(domain)) return null;
  const claimed = await db.emailDomain.findUnique({ where: { domain }, include: { organization: true } });
  if (claimed) return claimed.organization;
  return db.organization.findUnique({ where: { primaryDomain: domain } });
}

/**
 * Assign organization membership for a newly-created user (used by the OAuth
 * sign-up event, mirroring the credentials register flow): honor a pending
 * invite, else route by work-email domain (join request or new org).
 */
export async function routeNewUserToOrg(user: { id: string; email: string; name?: string | null }): Promise<void> {
  const email = user.email.toLowerCase();

  // 1. Pending invite wins.
  const invite = await db.orgInvite.findFirst({
    where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (invite) {
    await db.user.update({
      where: { id: user.id },
      data: { organizationId: invite.organizationId, role: invite.role, memberStatus: "ACTIVE" },
    });
    await db.orgInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } }).catch(() => {});
    return;
  }

  // 2. Route by work-email domain.
  const domain = deriveDomain(email);
  const existingOrg = await findOrgForDomain(domain);

  if (existingOrg) {
    await db.user.update({
      where: { id: user.id },
      data: { organizationId: existingOrg.id, role: "MEMBER", memberStatus: "PENDING" },
    });
    await db.joinRequest
      .create({ data: { organizationId: existingOrg.id, userId: user.id } })
      .catch(() => {});
    const admins = await db.user.findMany({
      where: { organizationId: existingOrg.id, role: { in: ["OWNER", "ADMIN"] } },
      select: { email: true },
    });
    await Promise.allSettled(
      admins.map((a) =>
        sendJoinRequestAdminEmail({
          to: a.email,
          orgName: existingOrg.name,
          requesterName: user.name,
          requesterEmail: user.email,
        })
      )
    );
    return;
  }

  // 3. First user from this domain — create + claim the org.
  const orgName = domain && !isFreeDomain(domain) ? domain : `${user.name || "My"} Workspace`;
  const org = await db.organization.create({
    data: { name: orgName, primaryDomain: domain && !isFreeDomain(domain) ? domain : null },
  });
  await db.user.update({
    where: { id: user.id },
    data: { organizationId: org.id, role: "OWNER", memberStatus: "ACTIVE" },
  });
  if (domain && !isFreeDomain(domain)) {
    await db.emailDomain.create({ data: { organizationId: org.id, domain } }).catch(() => {});
  }
}
