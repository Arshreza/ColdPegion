import { appUrl } from "@/lib/email/transactional";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

/** RFC 9728 — OAuth 2.0 Protected Resource Metadata for the MCP endpoint. */
export async function GET() {
  const base = appUrl();
  return Response.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      scopes_supported: ["read", "write"],
      bearer_methods_supported: ["header"],
    },
    { headers: cors }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
