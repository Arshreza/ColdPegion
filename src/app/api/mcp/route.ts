import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { getMcpToolEntries, runMcpTool } from "@/lib/mcp/registry";
import { registerMcpResources, registerMcpPrompts } from "@/lib/mcp/extras";
import { verifyApiToken } from "@/lib/mcp/tokens";
import { verifyOAuthAccessToken } from "@/lib/mcp/oauth";

// MailPilot AI as a remote MCP server. Authenticated with a Personal Access
// Token (Settings → API & MCP). Exposes the full platform tool registry so a
// user's own Claude can run the product end-to-end.
const baseHandler = createMcpHandler(
  (server) => {
    const register = server.registerTool.bind(server) as (
      name: string,
      config: { description: string; inputSchema: unknown },
      cb: (args: unknown, extra: { authInfo?: { extra?: Record<string, unknown> } }) => Promise<unknown>
    ) => void;

    for (const entry of getMcpToolEntries()) {
      register(
        entry.name,
        { description: entry.description, inputSchema: entry.inputSchema },
        async (args, extra) => {
          const a = (extra?.authInfo?.extra || {}) as { userId?: string; organizationId?: string | null; role?: string };
          const result = await runMcpTool(entry.name, args, {
            userId: a.userId || "",
            organizationId: a.organizationId ?? null,
            role: a.role || "MEMBER",
          });
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
      );
    }

    // Phase 3 — read-only resources + guided prompts.
    registerMcpResources(server);
    registerMcpPrompts(server);
  },
  {},
  { basePath: "/api", redisUrl: process.env.REDIS_URL, verboseLogs: false }
);

const handler = withMcpAuth(
  baseHandler,
  async (_req, bearer) => {
    if (!bearer) return undefined;
    // Accept both Personal Access Tokens and OAuth access tokens.
    const ctx = (await verifyApiToken(bearer)) || (await verifyOAuthAccessToken(bearer));
    if (!ctx) return undefined;
    return {
      token: bearer,
      clientId: ctx.userId,
      scopes: ctx.scopes,
      extra: { userId: ctx.userId, organizationId: ctx.organizationId, role: ctx.role },
    };
  },
  { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource" }
);

export { handler as GET, handler as POST, handler as DELETE };
