import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function errorRedirect(redirectUri: string, error: string, state?: string | null) {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (state) u.searchParams.set("state", state);
  return Response.redirect(u.toString(), 302);
}

/**
 * OAuth 2.1 authorization endpoint. Requires a logged-in MailPilot user (reuses
 * the NextAuth session), validates the client + redirect URI, and issues a PKCE
 * authorization code. Auto-approves for the user's own account.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const clientId = p.get("client_id");
  const redirectUri = p.get("redirect_uri");
  const state = p.get("state");
  const scope = p.get("scope") || "read,write";
  const codeChallenge = p.get("code_challenge");
  const responseType = p.get("response_type");

  if (!clientId || !redirectUri) {
    return new Response("invalid_request: client_id and redirect_uri are required", { status: 400 });
  }

  const client = await db.oAuthClient.findUnique({ where: { id: clientId } }).catch(() => null);
  if (!client) return new Response("invalid_client", { status: 400 });

  let allowed: string[] = [];
  try {
    allowed = JSON.parse(client.redirectUris);
  } catch {
    allowed = [];
  }
  if (!allowed.includes(redirectUri)) {
    return new Response("invalid_request: redirect_uri not registered", { status: 400 });
  }
  if (responseType && responseType !== "code") {
    return errorRedirect(redirectUri, "unsupported_response_type", state);
  }

  // Require an authenticated session; bounce to login and come back here.
  const session = await auth();
  if (!session?.user?.id) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("callbackUrl", url.pathname + url.search);
    return Response.redirect(loginUrl.toString(), 302);
  }

  const code = crypto.randomBytes(24).toString("hex");
  await db.oAuthAuthCode.create({
    data: {
      code,
      clientId,
      userId: session.user.id,
      redirectUri,
      codeChallenge: codeChallenge || null,
      scope,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const out = new URL(redirectUri);
  out.searchParams.set("code", code);
  if (state) out.searchParams.set("state", state);
  return Response.redirect(out.toString(), 302);
}
