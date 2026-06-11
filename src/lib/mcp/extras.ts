import { z } from "zod";
import { db } from "@/lib/db";
import { computeMailboxStats, rollupByDomain } from "@/lib/stats/deliverability";
import { guides, guideToMarkdown } from "@/lib/docs/guides";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyServer = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Extra = any;

function userIdOf(extra: Extra): string {
  return (extra?.authInfo?.extra?.userId as string) || "";
}

const asJson = (uri: string, data: unknown) => ({
  contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }],
});

/** Phase 3 — read-only MCP resources so Claude can cheaply read live context. */
export function registerMcpResources(server: AnyServer) {
  server.registerResource(
    "docs",
    "coldpigeon://docs",
    {
      title: "Help guides",
      description: "All ColdPigeon how-to guides as markdown (setup, leads, agents, deliverability, Claude/MCP, billing, troubleshooting). Read this to answer product questions accurately.",
      mimeType: "text/markdown",
    },
    async (uri: URL) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "text/markdown",
          text: guides.map((g) => guideToMarkdown(g)).join("\n\n---\n\n"),
        },
      ],
    })
  );

  server.registerResource(
    "overview",
    "coldpigeon://overview",
    { title: "Account overview", description: "Counts of agents, prospects, lists, products.", mimeType: "application/json" },
    async (uri: URL, extra: Extra) => {
      const userId = userIdOf(extra);
      const [agents, prospects, lists, products] = await Promise.all([
        db.agent.count({ where: { userId } }),
        db.prospect.count({ where: { userId } }),
        db.prospectList.count({ where: { userId } }),
        db.product.count({ where: { userId } }),
      ]);
      return asJson(uri.toString(), { agents, prospects, lists, products });
    }
  );

  server.registerResource(
    "deliverability",
    "coldpigeon://deliverability",
    { title: "Deliverability", description: "Per-mailbox and per-domain sending health.", mimeType: "application/json" },
    async (uri: URL, extra: Extra) => {
      const userId = userIdOf(extra);
      const user = await db.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
      const mailboxes = await computeMailboxStats({ organizationId: user?.organizationId ?? null, userId });
      return asJson(uri.toString(), { domains: rollupByDomain(mailboxes), mailboxes });
    }
  );

  server.registerResource(
    "agents",
    "coldpigeon://agents",
    { title: "Agents", description: "Your AI agents and their status.", mimeType: "application/json" },
    async (uri: URL, extra: Extra) => {
      const userId = userIdOf(extra);
      const agents = await db.agent.findMany({
        where: { userId },
        select: { id: true, name: true, status: true, sequenceMode: true, sentToday: true },
        take: 100,
      });
      return asJson(uri.toString(), { agents });
    }
  );

  server.registerResource(
    "lists",
    "coldpigeon://lists",
    { title: "Prospect lists", description: "Your lists with prospect counts.", mimeType: "application/json" },
    async (uri: URL, extra: Extra) => {
      const userId = userIdOf(extra);
      const lists = await db.prospectList.findMany({
        where: { userId },
        select: { id: true, name: true, _count: { select: { prospects: true } } },
        take: 100,
      });
      return asJson(uri.toString(), { lists: lists.map((l) => ({ id: l.id, name: l.name, prospects: l._count.prospects })) });
    }
  );
}

/** Phase 3 — guided prompts that orchestrate the tools for whole workflows. */
export function registerMcpPrompts(server: AnyServer) {
  server.registerPrompt(
    "mine_and_launch",
    {
      title: "Mine leads & launch a campaign",
      description: "End-to-end: find leads, import, write per-lead emails, and launch — all copy written by you (no platform LLM).",
      argsSchema: {
        icp: z.string().describe("Who to target, e.g. 'VPs of Sales at US SaaS, 50-500 employees'"),
        count: z.string().optional().describe("How many leads to mine (default 50)"),
      },
    },
    async ({ icp, count }: { icp: string; count?: string }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Run a full cold-email campaign with the ColdPigeon tools, doing ALL copywriting yourself (no platform LLM):
1. Mine ${count || "50"} real leads with emails matching: ${icp} (use your other connectors — Apollo, web, LinkedIn).
2. import_leads into a new list.
3. Ensure a product exists (create_product if needed); create_agent targeting that list + a sender mailbox.
4. Write a UNIQUE, personalized first email per lead and push with prepare_emails (paginate, ≤500/call).
5. configure_agent for a sensible cadence/schedule, then launch_agent.
Report the list size, emails prepared, and the agent status.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "draft_followups",
    {
      title: "Draft follow-ups for non-repliers",
      description: "Write step-2 follow-ups for leads who haven't replied and push them.",
      argsSchema: { agent: z.string().describe("Agent name or id") },
    },
    async ({ agent }: { agent: string }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `For agent "${agent}", write concise step-2 follow-up emails (one per lead) for prospects who haven't replied, then push them with prepare_emails using step=1. Keep each short with a fresh angle.`,
          },
        },
      ],
    })
  );
}
