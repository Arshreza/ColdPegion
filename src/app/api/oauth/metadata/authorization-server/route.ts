import { appUrl } from "@/lib/email/transactional";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

/** RFC 8414 — OAuth 2.0 Authorization Server Metadata. */
export async function GET() {
  const base = appUrl();
  return Response.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/api/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      scopes_supported: ["read", "write"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    },
    { headers: cors }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
