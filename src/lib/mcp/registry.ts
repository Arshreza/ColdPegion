import { buildSidekickTools, type SidekickContext } from "@/lib/sidekick/tools";

export interface McpToolEntry {
  name: string;
  description: string;
  inputSchema: unknown; // zod schema (v4) — accepted directly by the MCP SDK
}

// A throwaway context just to read static tool metadata (names/descriptions/schemas).
const METADATA_CTX: SidekickContext = { userId: "__meta__", organizationId: null, role: "MEMBER" };

/** List every tool exposed over MCP (reuses the in-app Sidekick registry). */
export function getMcpToolEntries(): McpToolEntry[] {
  const tools = buildSidekickTools(METADATA_CTX) as Record<string, any>;
  return Object.entries(tools).map(([name, t]) => ({
    name,
    description: t.description || name,
    inputSchema: t.inputSchema,
  }));
}

/** Execute a tool by name with a real, authenticated context. */
export async function runMcpTool(name: string, args: unknown, ctx: SidekickContext): Promise<unknown> {
  const tools = buildSidekickTools(ctx) as Record<string, any>;
  const tool = tools[name];
  if (!tool || typeof tool.execute !== "function") {
    return { error: `Unknown tool: ${name}` };
  }
  try {
    return await tool.execute(args, { toolCallId: `mcp-${name}`, messages: [] });
  } catch (e) {
    return { error: (e as Error).message || "Tool execution failed" };
  }
}
