import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { computeMailboxStats, rollupByDomain } from "@/lib/stats/deliverability";
import { syncAllInboxes } from "@/lib/email/imap-sync";
import { launchAgentCampaign, pauseAgentCampaign } from "@/lib/agents/launch";
import { searchApolloPeople, isApolloConfigured } from "@/lib/prospecting/apollo";
import { generateGuidelines, generateSequence } from "@/lib/llm/author";
import { isAdminRole } from "@/lib/org";
import { guides, getGuide, searchGuides, guideToMarkdown } from "@/lib/docs/guides";
import { addSuppressions } from "@/lib/suppression";

export interface SidekickContext {
  userId: string;
  organizationId: string | null;
  role: string;
  page?: string | null;
}

/** Build the full tool registry, scoped to the current user/org. */
export function buildSidekickTools(ctx: SidekickContext) {
  const { userId } = ctx;

  const findAgent = async (idOrName: string) =>
    db.agent.findFirst({
      where: { userId, OR: [{ id: idOrName }, { name: { equals: idOrName, mode: "insensitive" } }] },
    });
  const findList = async (name: string) =>
    db.prospectList.findFirst({
      where: { userId, OR: [{ id: name }, { name: { equals: name, mode: "insensitive" } }] },
    });
  const findProduct = async (idOrName: string) =>
    db.product.findFirst({
      where: { userId, OR: [{ id: idOrName }, { name: { equals: idOrName, mode: "insensitive" } }] },
    });

  return {
    // ---------- READ ----------
    get_overview: tool({
      description: "Get a high-level overview of the account: counts of agents, prospects, lists, products and mailboxes, plus the daily email limit.",
      inputSchema: z.object({}),
      execute: async () => {
        const [agents, activeAgents, prospects, lists, products, mailboxes, settings] = await Promise.all([
          db.agent.count({ where: { userId } }),
          db.agent.count({ where: { userId, status: "ACTIVE" } }),
          db.prospect.count({ where: { userId } }),
          db.prospectList.count({ where: { userId } }),
          db.product.count({ where: { userId } }),
          db.emailAccount.count({ where: ctx.organizationId ? { organizationId: ctx.organizationId } : { userId } }),
          db.globalSettings.findUnique({ where: { userId } }),
        ]);
        return { agents, activeAgents, prospects, lists, products, mailboxes, dailyEmailLimit: settings?.dailyEmailLimit ?? 500 };
      },
    }),

    get_deliverability: tool({
      description: "Get per-domain and per-mailbox deliverability stats (sent, reply rate, bounce rate, today's utilization) to decide which mailbox/domain to send from.",
      inputSchema: z.object({}),
      execute: async () => {
        const mailboxes = await computeMailboxStats({ organizationId: ctx.organizationId, userId });
        return { domains: rollupByDomain(mailboxes), mailboxes };
      },
    }),

    list_products: tool({
      description: "List the user's products with their ICP.",
      inputSchema: z.object({}),
      execute: async () => {
        const products = await db.product.findMany({
          where: { userId },
          select: { id: true, name: true, description: true, icpMode: true, icpPrompt: true },
          take: 100,
        });
        return { products };
      },
    }),

    list_prospect_lists: tool({
      description: "List prospect lists with their prospect counts.",
      inputSchema: z.object({}),
      execute: async () => {
        const lists = await db.prospectList.findMany({
          where: { userId },
          select: { id: true, name: true, _count: { select: { prospects: true } } },
          take: 100,
        });
        return { lists: lists.map((l) => ({ id: l.id, name: l.name, prospects: l._count.prospects })) };
      },
    }),

    list_email_accounts: tool({
      description: "List the mailboxes available to the user (owned, assigned, or shared by the org), with provider and daily usage.",
      inputSchema: z.object({}),
      execute: async () => {
        const accounts = await db.emailAccount.findMany({
          where: {
            OR: [
              { userId },
              { assignedToUserId: userId },
              ...(ctx.organizationId ? [{ organizationId: ctx.organizationId, sharedWithOrg: true }] : []),
            ],
          },
          select: { id: true, emailAddress: true, provider: true, status: true, sentToday: true, dailyLimit: true },
          take: 100,
        });
        return { accounts };
      },
    }),

    list_agents: tool({
      description: "List AI agents with status and how many emails each has sent.",
      inputSchema: z.object({}),
      execute: async () => {
        const agents = await db.agent.findMany({
          where: { userId },
          select: { id: true, name: true, status: true, sentToday: true, sequenceMode: true },
          take: 100,
        });
        return { agents };
      },
    }),

    get_inbox_replies: tool({
      description: "Get the most recent inbound replies with their AI category (INTERESTED, NOT_INTERESTED, etc.).",
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(15) }),
      execute: async ({ limit }) => {
        const emails = await db.email.findMany({
          where: { direction: "RECEIVED", emailAccount: { userId } },
          orderBy: { receivedAt: "desc" },
          take: limit,
          select: { fromEmail: true, subject: true, replyCategory: true, receivedAt: true },
        });
        return { replies: emails };
      },
    }),

    // ---------- WRITE ----------
    create_product: tool({
      description: "Create a new product the agents can market. Optionally include an ICP description.",
      inputSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        usps: z.string().optional(),
        targetAudience: z.string().optional(),
        icpPrompt: z.string().optional(),
      }),
      execute: async (input) => {
        const product = await db.product.create({ data: { userId, ...input, icpMode: "PROMPT" } });
        return { id: product.id, name: product.name };
      },
    }),

    update_product: tool({
      description: "Update an existing product by id or name.",
      inputSchema: z.object({
        idOrName: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        usps: z.string().optional(),
        targetAudience: z.string().optional(),
        icpPrompt: z.string().optional(),
      }),
      execute: async ({ idOrName, ...fields }) => {
        const product = await findProduct(idOrName);
        if (!product) return { error: `No product matching "${idOrName}".` };
        const updated = await db.product.update({ where: { id: product.id }, data: fields });
        return { id: updated.id, name: updated.name, updated: true };
      },
    }),

    delete_product: tool({
      description: "Delete a product. Destructive — only call with confirm:true after the user explicitly confirms.",
      inputSchema: z.object({ idOrName: z.string(), confirm: z.boolean().default(false) }),
      execute: async ({ idOrName, confirm }) => {
        const product = await findProduct(idOrName);
        if (!product) return { error: `No product matching "${idOrName}".` };
        if (!confirm) return { needsConfirmation: true, message: `Confirm deletion of product "${product.name}"?` };
        await db.product.delete({ where: { id: product.id } });
        return { deleted: true, name: product.name };
      },
    }),

    create_prospect_list: tool({
      description: "Create a new (empty) prospect list.",
      inputSchema: z.object({ name: z.string() }),
      execute: async ({ name }) => {
        const list = await db.prospectList.create({ data: { userId, name } });
        return { id: list.id, name: list.name };
      },
    }),

    import_leads: tool({
      description:
        "Bulk-import leads into a list (creates the list if it doesn't exist). Use this to push leads you mined from other connectors. Up to 500 per call — paginate for more.",
      inputSchema: z.object({
        listName: z.string(),
        leads: z
          .array(
            z.object({
              email: z.string(),
              firstName: z.string().optional(),
              lastName: z.string().optional(),
              companyName: z.string().optional(),
              jobTitle: z.string().optional(),
              industry: z.string().optional(),
              location: z.string().optional(),
              linkedinUrl: z.string().optional(),
              timezone: z.string().optional(),
            })
          )
          .max(500),
      }),
      execute: async ({ listName, leads }) => {
        let list = await findList(listName);
        if (!list) list = await db.prospectList.create({ data: { userId, name: listName, source: "mcp" } });
        let imported = 0;
        let skipped = 0;
        for (const l of leads) {
          const email = (l.email || "").trim().toLowerCase();
          if (!email || !email.includes("@")) { skipped++; continue; }
          const p = await db.prospect.upsert({
            where: { userId_email: { userId, email } },
            update: {
              firstName: l.firstName || undefined, lastName: l.lastName || undefined, companyName: l.companyName || undefined,
              jobTitle: l.jobTitle || undefined, industry: l.industry || undefined, location: l.location || undefined,
              linkedinUrl: l.linkedinUrl || undefined, timezone: l.timezone || undefined,
            },
            create: {
              userId, email, firstName: l.firstName, lastName: l.lastName, companyName: l.companyName, jobTitle: l.jobTitle,
              industry: l.industry, location: l.location, linkedinUrl: l.linkedinUrl, timezone: l.timezone, source: "mcp",
            },
          });
          await db.prospectListEntry.upsert({
            where: { prospectId_prospectListId: { prospectId: p.id, prospectListId: list.id } },
            update: {},
            create: { prospectId: p.id, prospectListId: list.id },
          });
          imported++;
        }
        return { list: list.name, listId: list.id, imported, skipped };
      },
    }),

    set_agent_sequence: tool({
      description:
        "Set an agent's static multi-step sequence (subject/body templates with {{firstName}}, {{companyName}}, {{jobTitle}} variables). No platform LLM is used.",
      inputSchema: z.object({
        idOrName: z.string(),
        steps: z
          .array(z.object({ waitDays: z.number().int().min(0).default(0), subject: z.string(), body: z.string() }))
          .min(1),
      }),
      execute: async ({ idOrName, steps }) => {
        const agent = await findAgent(idOrName);
        if (!agent) return { error: `No agent matching "${idOrName}".` };
        const normalized = steps.map((s, i) => ({ waitDays: i === 0 ? 0 : Math.max(0, s.waitDays || 0), subject: s.subject, body: s.body }));
        await db.agent.update({ where: { id: agent.id }, data: { sequenceSteps: JSON.stringify(normalized), sequenceMode: "STATIC" } });
        return { agent: agent.name, steps: normalized.length, mode: "STATIC" };
      },
    }),

    prepare_emails: tool({
      description:
        "Bulk-push pre-written, per-lead emails for an agent (one unique email per prospect). The worker sends them VERBATIM with NO platform LLM call — AI marketing at scale, paid by your own Claude. Up to 500 items/call; paginate for more. Switches the agent to EXTERNAL mode by default.",
      inputSchema: z.object({
        idOrName: z.string(),
        items: z
          .array(
            z.object({
              prospectEmail: z.string().describe("Recipient email — must already be a prospect (import_leads first)"),
              step: z.number().int().min(0).default(0).describe("0 = first email, 1 = first follow-up, …"),
              subject: z.string(),
              body: z.string(),
            })
          )
          .max(500),
        setExternalMode: z.boolean().default(true),
      }),
      execute: async ({ idOrName, items, setExternalMode }) => {
        const agent = await findAgent(idOrName);
        if (!agent) return { error: `No agent matching "${idOrName}".` };
        let prepared = 0;
        const notFound: string[] = [];
        for (const it of items) {
          const email = (it.prospectEmail || "").trim().toLowerCase();
          const prospect = await db.prospect.findFirst({ where: { userId, email: { equals: email, mode: "insensitive" } } });
          if (!prospect) { notFound.push(it.prospectEmail); continue; }
          await db.preparedEmail.upsert({
            where: { agentId_prospectId_step: { agentId: agent.id, prospectId: prospect.id, step: it.step } },
            update: { subject: it.subject, body: it.body, status: "PENDING" },
            create: { agentId: agent.id, prospectId: prospect.id, step: it.step, subject: it.subject, body: it.body },
          });
          prepared++;
        }
        if (setExternalMode) await db.agent.update({ where: { id: agent.id }, data: { sequenceMode: "EXTERNAL" } });
        return {
          agent: agent.name,
          prepared,
          notFound: notFound.length,
          sampleNotFound: notFound.slice(0, 5),
          mode: setExternalMode ? "EXTERNAL" : agent.sequenceMode,
          hint: "Launch the agent to send. Prospects must be imported (import_leads) and on the agent's list first.",
        };
      },
    }),

    add_prospect: tool({
      description: "Add a single prospect to a list (creates/updates the prospect).",
      inputSchema: z.object({
        listName:    z.string(),
        email:       z.string().describe("Prospect email address"),
        firstName:   z.string().optional(),
        lastName:    z.string().optional(),
        companyName: z.string().optional(),
        jobTitle:    z.string().optional(),
        industry:    z.string().optional(),
        location:    z.string().optional(),
        timezone:    z.string().optional(),
        seniority:   z.string().optional(),
        department:  z.string().optional(),
        phone:       z.string().optional(),
        website:     z.string().optional(),
      }),
      execute: async ({ listName, email, ...rest }) => {
        const list = await findList(listName);
        if (!list) return { error: `No list named "${listName}". Create it first with create_prospect_list.` };
        const prospect = await db.prospect.upsert({
          where: { userId_email: { userId, email } },
          update: { ...rest },
          create: { userId, email, ...rest },
        });
        await db.prospectListEntry.upsert({
          where: { prospectId_prospectListId: { prospectId: prospect.id, prospectListId: list.id } },
          update: {},
          create: { prospectId: prospect.id, prospectListId: list.id },
        });
        return { added: true, email, list: list.name };
      },
    }),

    find_leads: tool({
      description: "Search for leads (Instantly/Apollo-style) by filters, in the shared lead database, the user's prospects, or Apollo (if configured). Optionally import the results into a list.",
      inputSchema: z.object({
        jobTitles: z.array(z.string()).default([]),
        seniorities: z.array(z.string()).default([]),
        industries: z.array(z.string()).default([]),
        locations: z.array(z.string()).default([]),
        headcount: z.array(z.string()).default([]),
        keywords: z.array(z.string()).default([]),
        source: z.enum(["global", "database", "apollo"]).default("global"),
        importIntoListName: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
      }),
      execute: async (f) => {
        let results: any[] = [];
        if (f.source === "apollo" && isApolloConfigured()) {
          results = await searchApolloPeople(f);
        } else if (f.source === "database") {
          const ors: any[] = [];
          for (const t of [...f.jobTitles, ...f.seniorities]) ors.push({ jobTitle: { contains: t, mode: "insensitive" } });
          for (const i of f.industries) ors.push({ industry: { contains: i, mode: "insensitive" } });
          for (const l of f.locations) ors.push({ location: { contains: l, mode: "insensitive" } });
          results = await db.prospect.findMany({
            where: { userId, ...(ors.length ? { OR: ors } : {}) },
            select: { email: true, firstName: true, lastName: true, companyName: true, jobTitle: true, industry: true, location: true },
            take: f.limit,
          });
        } else {
          const ands: any[] = [{ email: { not: null } }];
          const titles = [...f.jobTitles, ...f.seniorities];
          if (titles.length) ands.push({ OR: titles.map((t) => ({ jobTitle: { contains: t, mode: "insensitive" } })) });
          if (f.industries.length) ands.push({ OR: f.industries.map((i) => ({ industry: { contains: i, mode: "insensitive" } })) });
          if (f.locations.length) ands.push({ OR: f.locations.flatMap((l) => [{ location: { contains: l, mode: "insensitive" } }, { country: { contains: l, mode: "insensitive" } }]) });
          if (f.headcount.length) ands.push({ headcount: { in: f.headcount } });
          if (f.keywords.length) ands.push({ OR: f.keywords.flatMap((k) => [{ companyName: { contains: k, mode: "insensitive" } }, { keywords: { contains: k, mode: "insensitive" } }]) });
          const leads = await db.globalLead.findMany({
            where: { AND: ands },
            select: { email: true, firstName: true, lastName: true, companyName: true, jobTitle: true, industry: true, location: true },
            take: f.limit,
          });
          results = leads.map((l) => ({ ...l, email: l.email! }));
        }

        let imported = 0;
        if (f.importIntoListName && results.length) {
          const list = await findList(f.importIntoListName);
          if (!list) return { found: results.length, sample: results.slice(0, 5), importError: `No list named "${f.importIntoListName}".` };
          for (const r of results) {
            if (!r.email) continue;
            const p = await db.prospect.upsert({
              where: { userId_email: { userId, email: r.email } },
              update: {},
              create: { userId, email: r.email, firstName: r.firstName, lastName: r.lastName, companyName: r.companyName, jobTitle: r.jobTitle, industry: r.industry, location: r.location, source: "sidekick" },
            });
            await db.prospectListEntry.upsert({
              where: { prospectId_prospectListId: { prospectId: p.id, prospectListId: list.id } },
              update: {},
              create: { prospectId: p.id, prospectListId: list.id },
            });
            imported++;
          }
        }
        return { found: results.length, imported, sample: results.slice(0, 5) };
      },
    }),

    create_agent: tool({
      description: "Create an AI outreach agent, wiring up products, a target list, sender mailbox(es) and guidelines. Does NOT launch it.",
      inputSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        listName: z.string(),
        productNames: z.array(z.string()).default([]),
        senderEmails: z.array(z.string()).default([]),
        sequenceMode: z.enum(["AI_GENERATED", "STATIC", "EXTERNAL"]).default("AI_GENERATED"),
        guidelines: z.string().optional(),
      }),
      execute: async (input) => {
        const list = await findList(input.listName);
        if (!list) return { error: `No list named "${input.listName}".` };

        const productIds: string[] = [];
        for (const pn of input.productNames) {
          const p = await findProduct(pn);
          if (p) productIds.push(p.id);
        }

        const accounts = await db.emailAccount.findMany({
          where: {
            OR: [
              { userId },
              { assignedToUserId: userId },
              ...(ctx.organizationId ? [{ organizationId: ctx.organizationId, sharedWithOrg: true }] : []),
            ],
          },
          select: { id: true, emailAddress: true },
        });
        let accountIds = accounts.filter((a) => input.senderEmails.some((e) => e.toLowerCase() === a.emailAddress.toLowerCase())).map((a) => a.id);
        if (accountIds.length === 0 && accounts.length) accountIds = [accounts[0].id]; // sensible default
        if (accountIds.length === 0) return { error: "No mailbox available. Connect a mailbox first." };

        const agent = await db.agent.create({
          data: {
            userId,
            name: input.name,
            description: input.description,
            productMode: productIds.length > 1 ? "GROUP" : "SINGLE",
            sequenceMode: input.sequenceMode,
            guidelines: input.guidelines,
            status: "DRAFT",
            products: { create: productIds.map((id) => ({ productId: id })) },
            prospectLists: { create: [{ prospectListId: list.id }] },
            emailAccounts: { create: accountIds.map((id) => ({ emailAccountId: id })) },
          },
        });
        return { id: agent.id, name: agent.name, status: agent.status, mailboxes: accountIds.length, products: productIds.length };
      },
    }),

    launch_agent: tool({
      description: "Launch an agent's campaign in the background (staggered, schedule-aware, load-balanced sending).",
      inputSchema: z.object({ idOrName: z.string() }),
      execute: async ({ idOrName }) => {
        const agent = await findAgent(idOrName);
        if (!agent) return { error: `No agent matching "${idOrName}".` };
        try {
          return await launchAgentCampaign(agent.id, userId);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),

    pause_agent: tool({
      description: "Pause an agent so it stops sending.",
      inputSchema: z.object({ idOrName: z.string() }),
      execute: async ({ idOrName }) => {
        const agent = await findAgent(idOrName);
        if (!agent) return { error: `No agent matching "${idOrName}".` };
        return pauseAgentCampaign(agent.id, userId);
      },
    }),

    configure_agent: tool({
      description: "Update an agent's sending cadence, daily limit, schedule, guidelines or sequence mode.",
      inputSchema: z.object({
        idOrName: z.string(),
        guidelines: z.string().optional(),
        sequenceMode: z.enum(["AI_GENERATED", "STATIC", "EXTERNAL"]).optional(),
        dailyEmailLimit: z.number().int().min(1).max(100000).optional(),
        minIntervalMinutes: z.number().int().min(0).max(1440).optional(),
        maxIntervalMinutes: z.number().int().min(0).max(1440).optional(),
        randomDelayMax: z.number().int().min(0).max(10).optional(),
        scheduleStartHour: z.number().int().min(0).max(23).optional(),
        scheduleEndHour: z.number().int().min(0).max(23).optional(),
        scheduleDays: z.string().optional(),
      }),
      execute: async ({ idOrName, ...fields }) => {
        const agent = await findAgent(idOrName);
        if (!agent) return { error: `No agent matching "${idOrName}".` };
        await db.agent.update({ where: { id: agent.id }, data: fields });
        return { updated: true, agent: agent.name };
      },
    }),

    author_campaign_content: tool({
      description: "Use AI to write campaign guidelines and/or a multi-step email sequence, then optionally save them onto an agent.",
      inputSchema: z.object({
        what: z.enum(["guidelines", "sequence", "both"]).default("both"),
        productNames: z.array(z.string()).default([]),
        campaignGoal: z.string().optional(),
        applyToAgent: z.string().optional(),
      }),
      execute: async ({ what, productNames, campaignGoal, applyToAgent }) => {
        const productIds: string[] = [];
        for (const pn of productNames) {
          const p = await findProduct(pn);
          if (p) productIds.push(p.id);
        }
        const out: any = {};
        if (what === "guidelines" || what === "both") out.guidelines = await generateGuidelines({ userId, productIds, campaignGoal });
        if (what === "sequence" || what === "both") out.steps = await generateSequence({ userId, productIds, campaignGoal });

        if (applyToAgent) {
          const agent = await findAgent(applyToAgent);
          if (!agent) return { ...out, applyError: `No agent matching "${applyToAgent}".` };
          await db.agent.update({
            where: { id: agent.id },
            data: {
              ...(out.guidelines ? { guidelines: out.guidelines } : {}),
              ...(out.steps ? { sequenceSteps: JSON.stringify(out.steps), sequenceMode: "STATIC" } : {}),
            },
          });
          out.appliedTo = agent.name;
        }
        return out;
      },
    }),

    set_do_not_contact: tool({
      description: "Add or remove a prospect from the do-not-contact (DNC) list by email. DNC prospects are skipped by all campaigns.",
      inputSchema: z.object({ email: z.string().describe("Prospect email address"), block: z.boolean().default(true) }),
      execute: async ({ email, block }) => {
        const prospect = await db.prospect.findFirst({ where: { userId, email: { equals: email, mode: "insensitive" } } });
        if (!prospect) return { error: `No prospect with email ${email}.` };
        await db.prospect.update({ where: { id: prospect.id }, data: { isDnc: block } });
        return { email, isDnc: block };
      },
    }),

    add_suppressions: tool({
      description:
        "Add email addresses or whole domains (e.g. 'acme.com') to the global suppression list. Suppressed addresses are NEVER emailed by any campaign, even if imported as prospects later — use for compliance opt-outs, customers, competitors.",
      inputSchema: z.object({
        values: z.array(z.string()).min(1).max(500).describe("Emails ('a@b.com') and/or domains ('b.com' or '@b.com')"),
      }),
      execute: async ({ values }) => addSuppressions(userId, values, "sidekick"),
    }),

    clone_agent: tool({
      description: "Duplicate an existing agent's configuration as a new DRAFT.",
      inputSchema: z.object({ idOrName: z.string() }),
      execute: async ({ idOrName }) => {
        const source = await db.agent.findFirst({
          where: { userId, OR: [{ id: idOrName }, { name: { equals: idOrName, mode: "insensitive" } }] },
          include: { products: true, prospectLists: true, emailAccounts: true },
        });
        if (!source) return { error: `No agent matching "${idOrName}".` };
        const clone = await db.agent.create({
          data: {
            userId,
            name: `Copy of ${source.name}`,
            description: source.description,
            productMode: source.productMode,
            sequenceMode: source.sequenceMode,
            guidelines: source.guidelines,
            staticSequence: source.staticSequence,
            sequenceSteps: source.sequenceSteps,
            dailyEmailLimit: source.dailyEmailLimit,
            scheduleDays: source.scheduleDays,
            status: "DRAFT",
            products: { create: source.products.map((p) => ({ productId: p.productId })) },
            prospectLists: { create: source.prospectLists.map((l) => ({ prospectListId: l.prospectListId })) },
            emailAccounts: { create: source.emailAccounts.map((a) => ({ emailAccountId: a.emailAccountId })) },
          },
        });
        return { id: clone.id, name: clone.name };
      },
    }),

    sync_inbox: tool({
      description: "Pull new inbound mail over IMAP for the user's mailboxes and detect replies now.",
      inputSchema: z.object({}),
      execute: async () => {
        const res = await syncAllInboxes(userId);
        return res;
      },
    }),

    get_company_profile: tool({
      description: "Get the user's company profile.",
      inputSchema: z.object({}),
      execute: async () => {
        const profile = await db.companyProfile.findUnique({ where: { userId } });
        return { profile };
      },
    }),

    update_company_profile: tool({
      description: "Create or update the company profile fields.",
      inputSchema: z.object({
        companyName: z.string().optional(),
        industry: z.string().optional(),
        description: z.string().optional(),
        valuePropositions: z.string().optional(),
        toneOfVoice: z.string().optional(),
      }),
      execute: async (fields) => {
        const existing = await db.companyProfile.findUnique({ where: { userId } });
        const profile = existing
          ? await db.companyProfile.update({ where: { userId }, data: fields })
          : await db.companyProfile.create({ data: { userId, companyName: fields.companyName || "My Company", ...fields } });
        return { id: profile.id, companyName: profile.companyName, updated: true };
      },
    }),

    update_daily_limit: tool({
      description: "Set the global daily email limit (safety cap across all agents).",
      inputSchema: z.object({ limit: z.number().int().min(1).max(100000) }),
      execute: async ({ limit }) => {
        await db.globalSettings.upsert({ where: { userId }, update: { dailyEmailLimit: limit }, create: { userId, dailyEmailLimit: limit } });
        return { dailyEmailLimit: limit };
      },
    }),

    list_team: tool({
      description: "List organization members (with roles) and any pending join requests.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.organizationId) return { members: [], joinRequests: [], note: "Not part of an organization." };
        const members = await db.user.findMany({
          where: { organizationId: ctx.organizationId },
          select: { id: true, name: true, email: true, role: true, memberStatus: true },
        });
        const joinRequests = isAdminRole(ctx.role)
          ? await db.joinRequest.findMany({
              where: { organizationId: ctx.organizationId, status: "PENDING" },
              include: { user: { select: { name: true, email: true } } },
            })
          : [];
        return { members, joinRequests: joinRequests.map((j) => ({ id: j.id, name: j.user.name, email: j.user.email })) };
      },
    }),

    approve_join_request: tool({
      description: "Approve or deny a pending join request by the requester's email (admins only).",
      inputSchema: z.object({ email: z.string().describe("Email address of the requester"), action: z.enum(["approve", "deny"]).default("approve") }),
      execute: async ({ email, action }) => {
        if (!isAdminRole(ctx.role) || !ctx.organizationId) return { error: "Admins only." };
        const requester = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, organizationId: ctx.organizationId } });
        if (!requester) return { error: `No pending member with email ${email}.` };
        const req = await db.joinRequest.findFirst({ where: { organizationId: ctx.organizationId, userId: requester.id, status: "PENDING" } });
        if (!req) return { error: "No pending join request for that user." };
        if (action === "approve") {
          await db.user.update({ where: { id: requester.id }, data: { memberStatus: "ACTIVE", role: "MEMBER" } });
          await db.joinRequest.update({ where: { id: req.id }, data: { status: "APPROVED" } });
          return { approved: email };
        }
        await db.user.update({ where: { id: requester.id }, data: { organizationId: null, memberStatus: "ACTIVE", role: "OWNER" } });
        await db.joinRequest.update({ where: { id: req.id }, data: { status: "DENIED" } });
        return { denied: email };
      },
    }),

    set_member_role: tool({
      description: "Change an organization member's role (admins only; only an owner can grant OWNER).",
      inputSchema: z.object({ email: z.string().describe("Email address of the member"), role: z.enum(["OWNER", "ADMIN", "MEMBER"]) }),
      execute: async ({ email, role }) => {
        if (!isAdminRole(ctx.role) || !ctx.organizationId) return { error: "Admins only." };
        const target = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, organizationId: ctx.organizationId } });
        if (!target) return { error: `No member with email ${email}.` };
        if ((role === "OWNER" || target.role === "OWNER") && ctx.role !== "OWNER") return { error: "Only the owner can change owner roles." };
        await db.user.update({ where: { id: target.id }, data: { role } });
        return { email, role };
      },
    }),

    invite_teammate: tool({
      description: "Invite a teammate to the organization by email (admins only).",
      inputSchema: z.object({ email: z.string().describe("Email address to invite"), role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER") }),
      execute: async ({ email, role }) => {
        if (!isAdminRole(ctx.role) || !ctx.organizationId) return { error: "Only organization admins can invite teammates." };
        const normalized = email.toLowerCase();
        const existing = await db.user.findUnique({ where: { email: normalized } });
        if (existing?.organizationId === ctx.organizationId) return { error: "That person is already in your organization." };
        const { randomBytes } = await import("crypto");
        await db.orgInvite.create({
          data: { organizationId: ctx.organizationId, email: normalized, role, token: randomBytes(24).toString("hex"), invitedById: userId, expiresAt: new Date(Date.now() + 14 * 864e5) },
        });
        return { invited: true, email: normalized, role };
      },
    }),

    start_welcome_tour: tool({
      description: "Start or restart the interactive welcome onboarding tour for the user to guide them on setting up and navigating the ColdPegion platform (Company Profile, Connect Email, Create Product, Launch First Agent).",
      inputSchema: z.object({}).optional(),
      execute: async () => {
        return { success: true, message: "Welcome tour triggered. The user is now presented with the interactive tour dialog." };
      }
    }),

    // ---------- HELP DOCS ----------
    list_help_topics: tool({
      description:
        "List all ColdPegion help guides (slug, title, description, category). Use this to discover which guide answers a how-to or product question.",
      inputSchema: z.object({}),
      execute: async () => ({
        guides: guides.map((g) => ({ slug: g.slug, title: g.title, description: g.description, category: g.category })),
      }),
    }),

    get_help_guide: tool({
      description:
        "Get the full content of a ColdPegion help guide. Pass an exact slug (from list_help_topics) or a free-text question (e.g. 'how do I connect gmail') and the best-matching guides are returned as markdown. ALWAYS use this to answer how-to, setup, billing, deliverability, or troubleshooting questions instead of guessing.",
      inputSchema: z.object({
        slugOrQuery: z.string().describe("A guide slug, or a free-text question to search for"),
      }),
      execute: async ({ slugOrQuery }: { slugOrQuery: string }) => {
        const exact = getGuide(slugOrQuery.trim().toLowerCase());
        if (exact) return { guides: [{ slug: exact.slug, content: guideToMarkdown(exact) }] };
        const matches = searchGuides(slugOrQuery, 2);
        if (matches.length === 0) {
          return { guides: [], hint: "No matching guide. Call list_help_topics to see everything available." };
        }
        return { guides: matches.map((g) => ({ slug: g.slug, content: guideToMarkdown(g) })) };
      },
    }),
  };
}
