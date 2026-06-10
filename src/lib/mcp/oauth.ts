import crypto from "crypto";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/mcp/tokens";

export const ACCESS_TOKEN_TTL_SEC = 60 * 60; // 1 hour
const AT_PREFIX = "mp_at_";
const RT_PREFIX = "mp_rt_";

function rand(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Verify a PKCE S256 challenge against a verifier. */
export function verifyPkce(codeChallenge: string | null | undefined, codeVerifier: string | undefined): boolean {
  if (!codeChallenge) return true; // no challenge was registered
  if (!codeVerifier) return false;
  const digest = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return digest === codeChallenge;
}

export interface IssuedTokens {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

/** Issue an access + refresh token pair for a user/client. */
export async function issueTokens(clientId: string, userId: string, scopes: string): Promise<IssuedTokens> {
  const access = `${AT_PREFIX}${rand()}`;
  const refresh = `${RT_PREFIX}${rand()}`;
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000);
  await db.oAuthToken.create({
    data: {
      accessTokenHash: hashToken(access),
      refreshTokenHash: hashToken(refresh),
      clientId,
      userId,
      scopes,
      expiresAt,
    },
  });
  return { access_token: access, refresh_token: refresh, token_type: "Bearer", expires_in: ACCESS_TOKEN_TTL_SEC, scope: scopes };
}

/** Rotate an access token from a refresh token. Returns null if invalid. */
export async function refreshTokens(refreshToken: string): Promise<IssuedTokens | null> {
  if (!refreshToken.startsWith(RT_PREFIX)) return null;
  const row = await db.oAuthToken.findUnique({ where: { refreshTokenHash: hashToken(refreshToken) } }).catch(() => null);
  if (!row) return null;
  // Rotate: delete the old token row, issue a fresh pair.
  await db.oAuthToken.delete({ where: { id: row.id } }).catch(() => {});
  return issueTokens(row.clientId, row.userId, row.scopes);
}

export interface OAuthContext {
  userId: string;
  organizationId: string | null;
  role: string;
  scopes: string[];
}

/** Validate an OAuth access token → user context (or null). */
export async function verifyOAuthAccessToken(token: string): Promise<OAuthContext | null> {
  if (!token.startsWith(AT_PREFIX)) return null;
  let row;
  try {
    row = await db.oAuthToken.findUnique({
      where: { accessTokenHash: hashToken(token) },
      include: { user: { select: { id: true, organizationId: true, role: true } } },
    });
  } catch {
    return null;
  }
  if (!row || row.expiresAt < new Date()) return null;
  return {
    userId: row.user.id,
    organizationId: row.user.organizationId,
    role: row.user.role,
    scopes: row.scopes.split(",").map((s) => s.trim()).filter(Boolean),
  };
}
