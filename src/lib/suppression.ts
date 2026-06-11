// Global suppression list ("never email these") — compliance layer that is
// independent of the per-prospect DNC flag. Entries are full email addresses
// or whole domains (stored as "@domain.com"). Checked at campaign launch and
// again in the worker right before every send.
import { db } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export const MAX_SUPPRESSIONS_PER_UPLOAD = 10000;

/**
 * Normalize one raw input into a canonical suppression value:
 * an email ("a@b.com") or a domain ("@b.com"). Returns null for junk.
 * Accepts "user@x.com", "mailto:user@x.com", "<user@x.com>", "x.com",
 * "@x.com" and "*@x.com".
 */
export function normalizeSuppression(raw: string): string | null {
  let v = raw.trim().toLowerCase();
  if (!v) return null;
  v = v.replace(/^mailto:/, "").replace(/^["'<\s]+|["'>\s]+$/g, "");
  if (v.startsWith("*@")) v = v.slice(1);
  if (v.startsWith("@")) {
    const domain = v.slice(1);
    return DOMAIN_RE.test(domain) ? `@${domain}` : null;
  }
  if (v.includes("@")) return EMAIL_RE.test(v) ? v : null;
  return DOMAIN_RE.test(v) ? `@${v}` : null;
}

/** True if this recipient is on the user's suppression list (email or its domain). */
export async function isSuppressed(userId: string, email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const domain = `@${e.split("@")[1] || ""}`;
  const hit = await db.suppressionEntry.findFirst({
    where: { userId, value: { in: [e, domain] } },
    select: { id: true },
  });
  return !!hit;
}

/**
 * Given a list of recipient emails, return the subset that is suppressed.
 * One query — used to filter prospects in bulk at launch time.
 */
export async function findSuppressedEmails(userId: string, emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const normalized = emails.map((e) => e.trim().toLowerCase());
  const domains = [...new Set(normalized.map((e) => `@${e.split("@")[1] || ""}`))];
  const hits = await db.suppressionEntry.findMany({
    where: { userId, value: { in: [...normalized, ...domains] } },
    select: { value: true },
  });
  if (hits.length === 0) return new Set();
  const hitSet = new Set(hits.map((h) => h.value));
  return new Set(normalized.filter((e) => hitSet.has(e) || hitSet.has(`@${e.split("@")[1] || ""}`)));
}

export interface AddSuppressionsResult {
  added: number;
  duplicates: number;
  invalid: number;
  prospectsBlocked: number;
}

/**
 * Bulk-add suppression entries and flag any matching existing prospects as DNC
 * so they disappear from active sending immediately.
 */
export async function addSuppressions(
  userId: string,
  rawValues: string[],
  reason: string
): Promise<AddSuppressionsResult> {
  const values = new Set<string>();
  let invalid = 0;
  for (const raw of rawValues.slice(0, MAX_SUPPRESSIONS_PER_UPLOAD)) {
    const v = normalizeSuppression(raw);
    if (v) values.add(v);
    else if (raw.trim()) invalid++;
  }

  const list = [...values];
  let added = 0;
  // createMany in chunks to keep statements bounded on big uploads.
  for (let i = 0; i < list.length; i += 1000) {
    const chunk = list.slice(i, i + 1000);
    const res = await db.suppressionEntry.createMany({
      data: chunk.map((value) => ({ userId, value, reason })),
      skipDuplicates: true,
    });
    added += res.count;
  }

  // Flag matching prospects as DNC (emails exactly; domains by suffix).
  const emails = list.filter((v) => !v.startsWith("@"));
  const domains = list.filter((v) => v.startsWith("@"));
  let prospectsBlocked = 0;
  if (emails.length > 0) {
    const res = await db.prospect.updateMany({
      where: { userId, isDnc: false, email: { in: emails, mode: "insensitive" } },
      data: { isDnc: true },
    });
    prospectsBlocked += res.count;
  }
  for (const domain of domains) {
    const res = await db.prospect.updateMany({
      where: { userId, isDnc: false, email: { endsWith: domain, mode: "insensitive" } },
      data: { isDnc: true },
    });
    prospectsBlocked += res.count;
  }

  return { added, duplicates: list.length - added, invalid, prospectsBlocked };
}
