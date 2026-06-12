/**
 * ColdPegion help guides — single source of truth.
 *
 * Consumed in three places:
 *  1. The public docs site (/docs and /docs/[slug])
 *  2. The in-app AI Sidekick (list_help_topics / get_help_guide tools)
 *  3. Claude over MCP (same tool registry + the coldpegion://docs resource)
 */

export interface GuideSection {
  heading: string;
  body?: string[];
  steps?: string[];
  bullets?: string[];
  code?: { label?: string; text: string };
  tip?: string;
}

export type GuideCategory =
  | "Getting started"
  | "Leads"
  | "AI & automation"
  | "Sending & deliverability"
  | "Account & billing";

export interface Guide {
  slug: string;
  title: string;
  description: string;
  category: GuideCategory;
  keywords: string[];
  sections: GuideSection[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  "Getting started",
  "Leads",
  "AI & automation",
  "Sending & deliverability",
  "Account & billing",
];

export const guides: Guide[] = [
  {
    slug: "quick-start",
    title: "Quick start: your first campaign in 10 minutes",
    description: "From empty account to a live AI outreach campaign in four steps.",
    category: "Getting started",
    keywords: ["setup", "onboarding", "first campaign", "start", "begin", "new account", "tutorial"],
    sections: [
      {
        heading: "Before you begin",
        body: [
          "You need a ColdPegion account (the Free plan is enough) and one email account you can send from — a Gmail address with an app password, any SMTP mailbox, or a Resend API key.",
        ],
        tip: "Prefer talking over clicking? Open the AI Sidekick (bottom-right) and say “set up my account” — it can do every step below for you.",
      },
      {
        heading: "Step 1 — Tell ColdPegion what you sell",
        steps: [
          "Go to Dashboard → Company and paste your website URL. ColdPegion extracts your company profile automatically.",
          "Go to Dashboard → Products and add a product (or use “Extract from URL” to pull it from a landing page).",
          "Review the generated ideal customer profile (ICP) — your agents use it to target and personalize.",
        ],
      },
      {
        heading: "Step 2 — Connect a sending mailbox",
        steps: [
          "Go to Dashboard → Email Accounts → Add account.",
          "Pick Gmail (app password), SMTP, or Resend and enter the credentials.",
          "Set a daily sending limit (start at 20–30 for a fresh mailbox) and enable warmup.",
        ],
        tip: "See the “Connect email accounts” guide for provider-specific instructions.",
      },
      {
        heading: "Step 3 — Add leads",
        steps: [
          "Go to Dashboard → Prospects → Find Leads to search the built-in database (or Super Search via Apollo).",
          "Or import your own CSV/XLSX from Dashboard → Prospects → Import.",
          "Save them into a prospect list — agents target lists.",
        ],
      },
      {
        heading: "Step 4 — Launch your first agent",
        steps: [
          "Go to Dashboard → Agents → Create.",
          "Pick the product, the prospect list, and the mailbox(es) to send from.",
          "Review the generated sequence, send yourself a test email, then hit Launch.",
        ],
        body: [
          "The agent writes a personalized email for every prospect and sends at a safe pace within your daily limits. Replies land in Dashboard → Inbox.",
        ],
      },
    ],
  },
  {
    slug: "connect-email-accounts",
    title: "Connect email accounts (Gmail, SMTP, Resend)",
    description: "Add sending mailboxes, set daily limits, and understand account health.",
    category: "Getting started",
    keywords: ["gmail", "app password", "smtp", "resend", "mailbox", "email account", "sender", "connect", "outlook"],
    sections: [
      {
        heading: "Gmail (app password)",
        steps: [
          "In your Google account, enable 2-Step Verification (required for app passwords).",
          "Visit Google Account → Security → App passwords and generate a 16-character app password.",
          "In Dashboard → Email Accounts → Add account, choose Gmail and paste the app password — not your normal password.",
        ],
        tip: "If you see “Invalid credentials”, the app password was mistyped (spaces don't matter) or 2-Step Verification isn't enabled.",
      },
      {
        heading: "Any SMTP provider",
        body: [
          "Choose SMTP and enter host, port, username, and password from your provider (Outlook/Office 365, Zoho, SendGrid, Mailgun, your own server). Use port 587 with STARTTLS unless your provider says otherwise.",
        ],
      },
      {
        heading: "Resend",
        body: [
          "Choose Resend and paste an API key from resend.com. Sending then goes through Resend's API with delivery webhooks feeding your stats automatically.",
        ],
      },
      {
        heading: "Daily limits and rotation",
        bullets: [
          "Each account has its own daily sending limit — start low (20–30/day) for new mailboxes and raise it gradually as warmup progresses.",
          "Connect several mailboxes and campaigns rotate across them automatically, multiplying safe volume.",
          "Your plan caps total daily sends across the org (Free 50, Starter 500, Pro 5,000).",
        ],
      },
      {
        heading: "Account health",
        body: [
          "Each account shows a status: Connected, Warming up, Active, or Error. An Error status usually means credentials changed or the provider blocked a sign-in — re-enter credentials to fix it.",
        ],
      },
    ],
  },
  {
    slug: "find-and-import-leads",
    title: "Find, import, and verify leads",
    description: "Use the lead database, Apollo Super Search, CSV/XLSX import, and email verification.",
    category: "Leads",
    keywords: ["leads", "prospects", "apollo", "import", "csv", "xlsx", "find leads", "super search", "verify", "zerobounce", "lists"],
    sections: [
      {
        heading: "The built-in lead finder",
        body: [
          "Dashboard → Prospects → Find Leads searches the global lead database by title, industry, location, and company size. Save results straight into a prospect list.",
        ],
      },
      {
        heading: "Super Search (Apollo)",
        body: [
          "Super Search runs live Apollo.io people searches for fresher, deeper coverage. It's available on every plan; results import with full name, title, company, and verified email where available.",
        ],
      },
      {
        heading: "Import your own file",
        steps: [
          "Go to Dashboard → Prospects → Import and upload a CSV or XLSX.",
          "Map your columns to ColdPegion fields (email is required; first name, company, title power personalization).",
          "Pick or create a target list. Duplicates are skipped automatically.",
        ],
      },
      {
        heading: "Verify before you send",
        body: [
          "Run verification on any list from the Prospects page. Invalid and risky addresses are flagged so campaigns skip them — this is the single biggest protector of your sender reputation. With a ZeroBounce key configured, verification uses premium accuracy.",
        ],
        tip: "Aim for a bounce rate under 2%. Sending to unverified lists is the fastest way to land in spam.",
      },
      {
        heading: "Let Claude mine leads for you",
        body: [
          "If you've connected the Claude (MCP) connector, Claude can search Apollo or the web with its own connectors and push results into ColdPegion with the import_leads tool — see the “Connect Claude (MCP)” guide.",
        ],
      },
    ],
  },
  {
    slug: "create-ai-agents",
    title: "Create and run AI agents",
    description: "Agent modes, sequences, scheduling, testing, and launching campaigns.",
    category: "AI & automation",
    keywords: ["agent", "campaign", "sequence", "launch", "pause", "ai mode", "static", "external", "steps", "schedule", "test email"],
    sections: [
      {
        heading: "What an agent is",
        body: [
          "An agent is an autonomous campaign: it pairs one product with one prospect list and a set of mailboxes, writes a multi-step email sequence for every prospect, and sends on schedule until the list is exhausted or you pause it.",
        ],
      },
      {
        heading: "Three writing modes",
        bullets: [
          "AI mode — your configured LLM writes a unique email per prospect per step, guided by your product, ICP, and rules.",
          "Static mode — you write the templates (with {{firstName}}-style variables and spintax); no LLM needed.",
          "External mode (“bring your own Claude”) — emails are pre-written by Claude over MCP with prepare_emails and sent verbatim; zero platform LLM usage.",
        ],
      },
      {
        heading: "Creating an agent",
        steps: [
          "Dashboard → Agents → Create.",
          "Choose the product to pitch and the prospect list to target.",
          "Select sending mailboxes (multiple = automatic rotation).",
          "Review or edit the generated sequence — steps, delays between them, and tone rules.",
          "Use “Send test” to email yourself a sample before going live.",
          "Launch. The agent respects per-mailbox daily limits and your plan cap.",
        ],
      },
      {
        heading: "Managing a running agent",
        bullets: [
          "Pause/resume any time from the agent page — in-flight prospects resume where they left off.",
          "Stats per agent: sent, opens, clicks, replies, bounces.",
          "Clone an agent to reuse its setup for another list or product.",
          "Prospects who reply are automatically pulled out of the remaining sequence.",
        ],
      },
    ],
  },
  {
    slug: "ai-sidekick",
    title: "Using the AI Sidekick",
    description: "Drive the whole platform by chat — create agents, import leads, check stats, get help.",
    category: "AI & automation",
    keywords: ["sidekick", "assistant", "chat", "copilot", "help", "ai assistant", "natural language"],
    sections: [
      {
        heading: "What it can do",
        body: [
          "The Sidekick (chat bubble, bottom-right of the dashboard) is an operator, not a chatbot: it has the same tools as the UI. Anything you can click, you can ask for.",
        ],
        bullets: [
          "“Create an agent for my CRM product targeting the Fintech CTOs list and launch it.”",
          "“Find 50 marketing directors at e-commerce companies and add them to a new list.”",
          "“Why did my deliverability drop this week?”",
          "“Pause all agents using the sales@ mailbox.”",
          "“How do I connect Gmail?” — it reads these help guides and answers from them.",
        ],
      },
      {
        heading: "How it works",
        body: [
          "The Sidekick chains tools in multiple steps to finish a goal end-to-end, asks before destructive actions, and reports exactly what it did with real names and counts. Conversations are saved so you can pick up where you left off.",
        ],
        tip: "The Sidekick knows which page you're on and prioritizes relevant actions — open it from the Agents page and “pause it” just works.",
      },
    ],
  },
  {
    slug: "connect-claude-mcp",
    title: "Connect Claude (MCP) and automate with routines",
    description: "Add ColdPegion as a Claude connector, then put outreach on auto mode with routines.",
    category: "AI & automation",
    keywords: ["claude", "mcp", "connector", "token", "oauth", "routine", "auto mode", "automation", "import_leads", "prepare_emails", "claude desktop"],
    sections: [
      {
        heading: "What you get",
        body: [
          "ColdPegion ships a remote MCP server. Connected to Claude, your Claude can run the entire product — mine leads (with Apollo or any other connector), import them, write a unique email per lead, configure and launch agents, and read your stats — using your existing Claude subscription. No API keys, no extra LLM cost.",
        ],
      },
      {
        heading: "Connect on claude.ai (OAuth — easiest)",
        steps: [
          "In claude.ai go to Settings → Connectors → Add custom connector.",
          "Enter your ColdPegion MCP URL: https://app.coldpegion.com/api/mcp",
          "Sign in to ColdPegion when prompted and approve access. Done.",
        ],
      },
      {
        heading: "Connect Claude Desktop (access token)",
        steps: [
          "In ColdPegion, open Dashboard → Connect to Claude and create an access token (shown once — copy it).",
          "Add the config below to Claude Desktop, then restart it.",
        ],
        code: {
          label: "claude_desktop_config.json",
          text: `{
  "mcpServers": {
    "coldpegion": {
      "url": "https://app.coldpegion.com/api/mcp",
      "headers": { "Authorization": "Bearer cp_live_..." }
    }
  }
}`,
        },
      },
      {
        heading: "First conversation",
        body: [
          "Ask Claude: “What can you do with ColdPegion?” — it will list the available tools. A good first run: “Find 25 leads matching my ICP, import them to a list called Trial Batch, write a 2-step sequence for each, and prepare the emails — don't launch yet.”",
        ],
      },
      {
        heading: "Auto mode with Claude routines",
        body: [
          "Routines are scheduled tasks in Claude. Combined with the connector they make outreach hands-free:",
        ],
        bullets: [
          "“Every weekday at 8 AM: find 50 new leads matching my ICP on Apollo, write a personal 3-step sequence for each, and launch my agent.”",
          "“Every Monday: review last week's reply rates per agent and draft improved subject lines for my approval.”",
        ],
        tip: "Your guardrails always apply: Claude operates within plan caps, per-mailbox limits, warmup schedules, and unsubscribe handling — all enforced server-side.",
      },
      {
        heading: "Managing tokens",
        body: [
          "Tokens are shown once, stored hashed, and revocable from Dashboard → Connect to Claude. Each shows when it was last used. Revoke immediately if a token leaks; the connector stops working instantly.",
        ],
      },
    ],
  },
  {
    slug: "deliverability-and-warmup",
    title: "Deliverability and inbox warmup",
    description: "Stay out of spam: warmup, limits, domain setup, and reading your health dashboard.",
    category: "Sending & deliverability",
    keywords: ["deliverability", "spam", "warmup", "bounce", "open rate", "dns", "spf", "dkim", "dmarc", "reputation", "limits"],
    sections: [
      {
        heading: "Set up your domain first",
        body: [
          "Before any cold sending, configure SPF, DKIM, and DMARC DNS records for your sending domain (your email provider documents the exact records). Without them, even perfect emails go to spam.",
        ],
        tip: "Send from a secondary domain (e.g. coldpegion-hq.com instead of coldpegion.com) to protect your main domain's reputation.",
      },
      {
        heading: "Warmup",
        body: [
          "Enable warmup per mailbox in Dashboard → Email Accounts. Warmed mailboxes exchange friendly traffic on a schedule that builds sender reputation. Give a brand-new mailbox 2–3 weeks of warmup before meaningful volume.",
        ],
      },
      {
        heading: "The rules that keep you safe",
        bullets: [
          "Keep daily limits realistic: 20–30/day for new mailboxes, ramping to 50–100 over weeks.",
          "Verify every list before sending (target < 2% bounce rate).",
          "Rotate across multiple mailboxes rather than maxing out one.",
          "Personalized, plain-looking emails (which agents write by default) outperform image-heavy templates in both replies and inbox placement.",
          "Every email carries a one-click unsubscribe automatically — never remove it.",
        ],
      },
      {
        heading: "Reading the dashboard",
        body: [
          "Dashboard → Deliverability shows health per mailbox and per domain: sent, bounces, opens, replies. A falling open rate or rising bounce rate on one mailbox means: pause it, lower its limit, re-verify the list, and let warmup run.",
        ],
      },
    ],
  },
  {
    slug: "unified-inbox-and-replies",
    title: "The unified inbox and handling replies",
    description: "All replies from every mailbox in one stream, with AI-drafted responses.",
    category: "Sending & deliverability",
    keywords: ["inbox", "replies", "respond", "imap", "sync", "conversation", "answer"],
    sections: [
      {
        heading: "How it works",
        body: [
          "Dashboard → Inbox aggregates replies from all connected mailboxes (synced over IMAP, or via webhooks for Resend). Each thread shows the full conversation and which agent/campaign it came from.",
        ],
      },
      {
        heading: "Replying",
        bullets: [
          "Reply directly from the thread — sent from the same mailbox the prospect wrote to.",
          "Use the AI draft button to generate a reply in context; edit and send.",
          "Prospects who reply are automatically removed from remaining sequence steps.",
        ],
      },
      {
        heading: "If replies are missing",
        steps: [
          "Hit Sync on the Inbox page to force an IMAP refresh.",
          "Check the mailbox's status on Email Accounts — an Error state stops syncing.",
          "For Gmail, confirm IMAP is enabled in Gmail's settings (it is by default).",
        ],
      },
    ],
  },
  {
    slug: "llm-configuration",
    title: "Configure your LLM (or use none at all)",
    description: "Bring your own OpenAI-compatible key — or skip it with static sequences or Claude/MCP.",
    category: "AI & automation",
    keywords: ["llm", "api key", "openai", "groq", "gemini", "ollama", "model", "configuration", "no api key"],
    sections: [
      {
        heading: "Three ways to power writing",
        bullets: [
          "Bring your own key — Settings → LLM accepts any OpenAI-compatible endpoint: OpenAI, Groq, Google Gemini, Together, even local Ollama. Your key is encrypted at rest and used only for your generations.",
          "No LLM — static sequences with variables and spintax need no model at all.",
          "Claude over MCP — Claude writes every email on your subscription via prepare_emails; the platform sends verbatim. Zero LLM config needed.",
        ],
      },
      {
        heading: "Setting up a key",
        steps: [
          "Go to Dashboard → Settings → LLM.",
          "Enter the base URL (e.g. https://api.groq.com/openai/v1) and your API key.",
          "Pick a model from the fetched list or type one, then use Test connection to validate.",
        ],
        tip: "Groq's free tier with a fast open model is a great starting point if you don't already pay for an LLM.",
      },
    ],
  },
  {
    slug: "billing-and-plans",
    title: "Billing, plans, and limits",
    description: "What each plan includes, how to upgrade or cancel, and how limits are enforced.",
    category: "Account & billing",
    keywords: ["billing", "plan", "upgrade", "downgrade", "cancel", "invoice", "stripe", "payment", "limits", "price"],
    sections: [
      {
        heading: "Plans at a glance",
        bullets: [
          "Free — $0: 50 emails/day, 1 mailbox, 1 seat. Full AI agents, Sidekick, and the Claude/MCP connector.",
          "Starter — $39/mo: 500 emails/day, 5 mailboxes, 3 seats, warmup and rotation.",
          "Pro — $99/mo: 5,000 emails/day, 25 mailboxes, 10 seats, advanced deliverability suite.",
          "Enterprise — custom: unlimited everything, SSO, dedicated support.",
        ],
      },
      {
        heading: "Managing your subscription",
        steps: [
          "Dashboard → Billing shows your current plan and usage.",
          "Upgrades check out through Stripe and apply immediately.",
          "Manage payment method, download invoices, or cancel via the Stripe billing portal (Billing → Manage).",
        ],
        body: [
          "Downgrades and cancellations take effect at the end of the current billing period. Your data is never deleted on downgrade — sending simply pauses if you're over the new limits.",
        ],
      },
      {
        heading: "How limits are enforced",
        body: [
          "The daily email cap applies org-wide and resets at midnight UTC. When it's reached, queued emails wait for the next day — nothing is lost. Mailbox and seat caps prevent adding more than the plan allows.",
        ],
      },
    ],
  },
  {
    slug: "teams-and-roles",
    title: "Teams, organizations, and roles",
    description: "Invite teammates, manage roles, and share infrastructure safely.",
    category: "Account & billing",
    keywords: ["team", "organization", "invite", "member", "role", "admin", "seats", "join request", "agency"],
    sections: [
      {
        heading: "Inviting teammates",
        steps: [
          "Go to Dashboard → Team (admins only).",
          "Enter the teammate's email and pick a role — they receive an invitation email valid for 14 days.",
          "Once accepted, they share the org's plan limits, mailboxes, and lead database.",
        ],
      },
      {
        heading: "Roles",
        bullets: [
          "Admin — full control: billing, team management, all campaigns and settings.",
          "Member — runs campaigns, manages leads and agents; can't touch billing or team.",
        ],
      },
      {
        heading: "Join requests",
        body: [
          "If someone signs up with your company's email domain, they can request to join your organization; admins approve or decline from the Team page.",
        ],
        tip: "Agencies: keep one org per client team for clean separation, or one org with separate agents and mailboxes per client.",
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting common issues",
    description: "Quick fixes for the problems users hit most.",
    category: "Account & billing",
    keywords: ["error", "problem", "not working", "failed", "stuck", "fix", "issue", "support", "bounce", "not sending"],
    sections: [
      {
        heading: "Emails aren't sending",
        bullets: [
          "Check the agent is Launched, not paused or draft.",
          "Check Email Accounts — an Error status stops that mailbox; re-enter credentials.",
          "You may have hit the daily limit (per mailbox or plan-wide); sending resumes automatically next day.",
          "AI-mode agents need a working LLM config — run Test connection in Settings → LLM.",
        ],
      },
      {
        heading: "Gmail connection fails",
        bullets: [
          "Use an app password, not your account password — and 2-Step Verification must be on first.",
          "If Google blocks the sign-in, approve the security prompt on your phone and retry.",
        ],
      },
      {
        heading: "High bounce rate",
        bullets: [
          "Verify the list before sending and remove invalid/risky addresses.",
          "Confirm SPF/DKIM/DMARC records are set for the sending domain.",
          "Lower the mailbox's daily limit and let warmup rebuild reputation.",
        ],
      },
      {
        heading: "Claude connector not working",
        bullets: [
          "Token revoked or mistyped? Create a fresh one in Dashboard → Connect to Claude (tokens start with cp_live_).",
          "Claude Desktop needs a full restart after editing the config file.",
          "On claude.ai, remove and re-add the connector to refresh OAuth access.",
        ],
      },
      {
        heading: "Still stuck?",
        body: [
          "Ask the AI Sidekick in the dashboard — it can read these guides, inspect your account, and often fix the issue directly. If you've connected Claude, asking Claude works the same way.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

/** Plain-text/markdown rendering for AI consumption (Sidekick + MCP). */
export function guideToMarkdown(guide: Guide): string {
  const parts: string[] = [`# ${guide.title}`, guide.description];
  for (const s of guide.sections) {
    parts.push(`\n## ${s.heading}`);
    if (s.body) parts.push(...s.body);
    if (s.steps) parts.push(s.steps.map((step, i) => `${i + 1}. ${step}`).join("\n"));
    if (s.bullets) parts.push(s.bullets.map((b) => `- ${b}`).join("\n"));
    if (s.code) parts.push("```\n" + s.code.text + "\n```");
    if (s.tip) parts.push(`> Tip: ${s.tip}`);
  }
  return parts.join("\n\n");
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "how", "can", "does", "with", "what", "why",
  "into", "from", "this", "that", "you", "your", "not", "have", "has", "get",
  "set", "use", "all", "any", "going", "want", "need",
]);

/** Keyword search across titles, descriptions, keywords, and section text. */
export function searchGuides(query: string, limit = 3): Guide[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  if (terms.length === 0) return guides.slice(0, limit);

  const scored = guides.map((g) => {
    const strong = `${g.title} ${g.description} ${g.keywords.join(" ")}`.toLowerCase();
    const weak = g.sections
      .map((s) => `${s.heading} ${(s.body || []).join(" ")} ${(s.steps || []).join(" ")} ${(s.bullets || []).join(" ")}`)
      .join(" ")
      .toLowerCase();
    let score = 0;
    for (const t of terms) {
      const word = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
      if (word.test(strong)) score += 3;
      if (word.test(weak)) score += 1;
    }
    return { g, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.g);
}
