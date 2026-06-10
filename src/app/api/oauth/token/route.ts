import { db } from "@/lib/db";
import { issueTokens, refreshTokens, verifyPkce } from "@/lib/mcp/oauth";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function err(error: string, status = 400, description?: string) {
  return Response.json({ error, error_description: description }, { status, headers: cors });
}

/** OAuth 2.1 token endpoint: authorization_code (PKCE) + refresh_token grants. */
export async function POST(request: Request) {
  // Accept form-encoded (per spec) or JSON.
  let params: Record<string, string> = {};
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      params = await request.json();
    } else {
      const form = await request.formData();
      form.forEach((v, k) => (params[k] = String(v)));
    }
  } catch {
    return err("invalid_request", 400, "Unparseable body");
  }

  const grantType = params.grant_type;

  if (grantType === "refresh_token") {
    const tokens = await refreshTokens(params.refresh_token || "");
    if (!tokens) return err("invalid_grant", 400, "Invalid refresh token");
    return Response.json(tokens, { headers: cors });
  }

  if (grantType === "authorization_code") {
    const code = params.code;
    if (!code) return err("invalid_request", 400, "Missing code");

    const row = await db.oAuthAuthCode.findUnique({ where: { code } }).catch(() => null);
    if (!row) return err("invalid_grant", 400, "Unknown code");

    // One-time use.
    await db.oAuthAuthCode.delete({ where: { code } }).catch(() => {});

    if (row.expiresAt < new Date()) return err("invalid_grant", 400, "Code expired");
    if (params.client_id && params.client_id !== row.clientId) return err("invalid_grant", 400, "client_id mismatch");
    if (params.redirect_uri && params.redirect_uri !== row.redirectUri) return err("invalid_grant", 400, "redirect_uri mismatch");
    if (!verifyPkce(row.codeChallenge, params.code_verifier)) return err("invalid_grant", 400, "PKCE verification failed");

    const tokens = await issueTokens(row.clientId, row.userId, row.scope);
    return Response.json(tokens, { headers: cors });
  }

  return err("unsupported_grant_type", 400);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
