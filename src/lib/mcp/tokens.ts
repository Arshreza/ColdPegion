import crypto from "crypto";
import { db } from "@/lib/db";

const PREFIX = "mp_live_";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Generate a new API token. Returns the plaintext (shown once) + stored fields. */
export function generateApiToken(): { token: string; tokenHash: string; prefix: string } {
  const secret = crypto.randomBytes(24).toString("base64url");
  const token = `${PREFIX}${secret}`;
  return { token, tokenHash: hashToken(token), prefix: token.slice(0, 12) };
}

export interface ApiTokenContext {
  userId: string;
  organizationId: string | null;
  role: string;
  scopes: string[];
  tokenId: string;
}

/**
 * Validate a bearer token. Returns the resolved user/org context or null.
 * Updates `lastUsedAt` (best-effort, throttled implicitly by Prisma).
 */
export async function verifyApiToken(token: string): Promise<ApiTokenContext | null> {
  if (!token || !token.startsWith(PREFIX)) return null;
  const tokenHash = hashToken(token);
  let row;
  try {
    row = await db.apiToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, organizationId: true, role: true } } },
    });
  } catch {
    return null; // fail closed on DB errors
  }
  if (!row || row.revokedAt) return null;

  // Best-effort last-used tracking.
  db.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return {
    userId: row.user.id,
    organizationId: row.user.organizationId,
    role: row.user.role,
    scopes: row.scopes.split(",").map((s) => s.trim()).filter(Boolean),
    tokenId: row.id,
  };
}
