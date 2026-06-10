import { db } from "@/lib/db";
import { z } from "zod";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const schema = z.object({
  client_name: z.string().optional(),
  redirect_uris: z.array(z.string().url()).min(1),
  // accepted and ignored (public client + PKCE):
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
});

/** RFC 7591 — Dynamic Client Registration (public clients, PKCE). */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const client = await db.oAuthClient.create({
      data: { name: body.client_name || "MCP client", redirectUris: JSON.stringify(body.redirect_uris) },
    });
    return Response.json(
      {
        client_id: client.id,
        client_name: client.name,
        redirect_uris: body.redirect_uris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      { status: 201, headers: cors }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "invalid_client_metadata", error_description: error.issues[0]?.message }, { status: 400, headers: cors });
    }
    return Response.json({ error: "server_error" }, { status: 500, headers: cors });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
