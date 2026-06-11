import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Flame,
  Globe,
  KeyRound,
  Plug,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClaudeDemo } from "@/components/marketing/claude-demo";
import { CopyButton } from "@/components/marketing/copy-button";
import { Orbit } from "@/components/marketing/orbit";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { Tilt } from "@/components/marketing/tilt";

export const metadata: Metadata = {
  title: "Run your outreach from Claude (MCP)",
  description:
    "ColdPigeon is an MCP-native Claude connector. Chain Apollo and any other connector, let Claude write every email, and put outbound on auto mode with Claude routines.",
  alternates: { canonical: "/claude" },
};

const tools = [
  { name: "import_leads", desc: "Bulk-import prospects Claude mined from Apollo, web search, or any connector" },
  { name: "prepare_emails", desc: "Store a unique, Claude-written email for every single lead and step" },
  { name: "set_agent_sequence", desc: "Define multi-step sequences with timing and personalization" },
  { name: "launch_agent", desc: "Start the campaign — the worker sends at safe, human-like pace" },
  { name: "get_icp", desc: "Read your ideal customer profile so Claude targets precisely" },
  { name: "stats & inbox tools", desc: "Check opens, replies, and deliverability — then iterate" },
];

const routineExamples = [
  "Every weekday at 8 AM: find 50 new SaaS founders matching my ICP on Apollo, write a personal 3-step sequence for each, and launch my agent.",
  "Every Monday: review last week's reply rates per agent, pause the worst subject lines, and draft improved variants for my approval.",
  "Every morning: check my ColdPigeon inbox, draft replies to interested prospects, and summarize hot leads in a message to me.",
];

export default function ClaudePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
        <div className="absolute inset-0 bg-noise opacity-[0.04]" aria-hidden />
        <div
          className="aurora-blob -top-32 left-1/3 h-96 w-[560px] bg-accent-500/35"
          aria-hidden
        />
        <div
          className="aurora-blob top-10 right-10 h-72 w-72 bg-brand-500/30 [animation-delay:-7s]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/40 bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-600 dark:text-accent-500">
              <Sparkles className="h-3.5 w-3.5" /> ColdPigeon × Claude
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Marketing on <span className="gradient-text-animated">auto mode.</span>
              <br />
              Powered by Claude.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground-secondary">
              ColdPigeon ships a native MCP server, so Claude becomes your
              outbound operator. It chains the Apollo connector to mine leads,
              writes a personal email for every prospect, and launches campaigns
              — in one conversation, or on a schedule with Claude routines.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="btn-shine text-base">
                <Link href="/register">
                  Get your connector <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link href="/#features">Explore the platform</Link>
              </Button>
            </div>
          </div>
          <Reveal delay={150} className="hidden lg:block">
            <Orbit />
          </Reveal>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section className="border-y border-border bg-background-secondary py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Watch it work
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                One routine. A campaign every morning.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-foreground-secondary">
                This is a real workflow: a scheduled Claude routine chains the
                Apollo connector with ColdPigeon&apos;s MCP tools — prospecting,
                copywriting, and launching before you&apos;ve had coffee. Every
                email is written individually, by Claude, on your subscription.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "No API keys, no per-token bills",
                  "Guardrails enforced server-side: limits, warmup, unsubscribe",
                  "Works from claude.ai, Claude Desktop, and Claude mobile",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm text-foreground-secondary">
                    <Check className="h-4 w-4 shrink-0 text-success-500" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={150}>
              <Tilt>
                <ClaudeDemo />
              </Tilt>
            </Reveal>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Why MCP changes everything for outbound
            </h2>
            <p className="mt-4 text-lg text-foreground-secondary">
              Other tools bolt a chatbot onto a dashboard. ColdPigeon hands
              Claude the actual controls.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Plug,
                title: "Claude chains your connectors",
                text: "Apollo finds the leads. Web search researches them. ColdPigeon imports, personalizes, and sends. Claude orchestrates all of it — you just describe the outcome.",
              },
              {
                icon: Flame,
                title: "Your subscription does the writing",
                text: "Every email is composed by Claude on the plan you already pay for. ColdPigeon stores them and sends verbatim — zero platform LLM fees, no API keys to manage.",
              },
              {
                icon: CalendarClock,
                title: "Routines make it hands-free",
                text: "A Claude routine turns one good prompt into a daily operating system: prospect, personalize, launch, report — every morning, automatically.",
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 110}>
                <SpotlightCard className="h-full rounded-2xl border border-border bg-background-secondary p-6 shadow-sm">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-white shadow-md">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{c.text}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* THE FLOW */}
      <section className="border-t border-border py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <Reveal>
              <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                The auto-mode pipeline
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                One prompt. Full campaign.
              </h2>
              <ol className="mt-8 space-y-6">
                {[
                  {
                    icon: Search,
                    title: "Mine",
                    text: "Claude queries the Apollo connector (or LinkedIn, web search, your CRM — any connector) for leads matching your ICP.",
                  },
                  {
                    icon: Workflow,
                    title: "Import",
                    text: "import_leads pushes them into ColdPigeon — deduplicated, verified, organized into lists.",
                  },
                  {
                    icon: Sparkles,
                    title: "Personalize",
                    text: "Claude writes a unique multi-step sequence for every single lead and stores it with prepare_emails.",
                  },
                  {
                    icon: Rocket,
                    title: "Launch & learn",
                    text: "launch_agent starts sending from your warmed-up mailboxes. Claude reads the stats and improves the next batch.",
                  },
                ].map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-brand text-white shadow-md">
                        <s.icon className="h-5 w-5" />
                      </span>
                      {i < 3 && <span className="mt-2 h-full w-px bg-border" />}
                    </div>
                    <div className="pb-2">
                      <h3 className="font-semibold text-foreground">
                        {i + 1}. {s.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>

            <div className="space-y-6">
              <Reveal delay={100}>
                <div className="rounded-2xl border border-border bg-background-secondary p-6 shadow-sm">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground">
                    <Plug className="h-4 w-4 text-brand-500" /> 30+ MCP tools, ready to call
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {tools.map((t) => (
                      <li key={t.name} className="flex items-start gap-3">
                        <code className="shrink-0 rounded-md bg-background-tertiary px-2 py-0.5 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                          {t.name}
                        </code>
                        <span className="text-sm text-foreground-secondary">{t.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={200}>
                <div className="rounded-2xl border border-border bg-background-secondary p-6 shadow-sm">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground">
                    <CalendarClock className="h-4 w-4 text-accent-500" /> Routine ideas to steal
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {routineExamples.map((r) => (
                      <li
                        key={r}
                        className="rounded-lg border border-border bg-background px-3.5 py-2.5"
                      >
                        <p className="text-sm italic leading-relaxed text-foreground-secondary">
                          &ldquo;{r}&rdquo;
                        </p>
                        <CopyButton text={r} label="Copy prompt" className="mt-2" />
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* SETUP */}
      <section className="relative overflow-hidden border-y border-border bg-sidebar-bg py-20 text-sidebar-fg lg:py-24">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div className="absolute inset-0 bg-noise opacity-[0.05]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Connected in under a minute
              </h2>
              <ul className="mt-8 space-y-5">
                {[
                  {
                    icon: Globe,
                    title: "claude.ai & Claude Desktop",
                    text: "Add ColdPigeon as a custom connector with OAuth — sign in once and you're done. Or paste a config with a personal access token into Claude Desktop.",
                  },
                  {
                    icon: KeyRound,
                    title: "Secure by design",
                    text: "OAuth 2.1 with PKCE or scoped personal access tokens (hashed at rest, revocable, one-time reveal). Every tool call is rate-limited and audit-logged.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Guardrails stay on",
                    text: "Claude operates within your plan limits: daily sending caps, mailbox rotation, warmup schedules, and unsubscribe handling are always enforced server-side.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-brand text-white shadow-md">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-sidebar-fg/70">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={150}>
              <Tilt max={5}>
                <div className="rounded-2xl border border-sidebar-border bg-background-secondary/5 p-5 backdrop-blur">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sidebar-fg-muted">
                    Claude Desktop config
                  </p>
                  <pre className="overflow-x-auto rounded-xl border border-sidebar-border bg-black/40 p-4 font-mono text-xs leading-relaxed text-sidebar-fg">
{`{
  "mcpServers": {
    "coldpigeon": {
      "url": "https://app.coldpigeon.com/api/mcp",
      "headers": {
        "Authorization": "Bearer cp_live_..."
      }
    }
  }
}`}
                  </pre>
                  <div className="mt-4 space-y-2">
                    {[
                      "Create a token in Settings → Connect to Claude",
                      "Paste the config (or use OAuth on claude.ai)",
                      "Ask Claude: “What can you do with ColdPigeon?”",
                    ].map((step, i) => (
                      <div key={step} className="flex items-center gap-2.5 text-sm text-sidebar-fg/80">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-400">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </Tilt>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div
          className="aurora-blob left-1/2 top-1/2 h-72 w-[560px] -translate-x-1/2 -translate-y-1/2 bg-accent-500/20"
          aria-hidden
        />
        <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Your move: keep grinding outreach manually,
            <br />
            <span className="gradient-text-animated">or put Claude on it.</span>
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="btn-shine text-base">
              <Link href="/register">
                Start free & connect Claude <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-foreground-muted">
            <Check className="h-4 w-4 text-success-500" /> The MCP connector is included on every plan — even Free.
          </p>
        </Reveal>
      </section>
    </>
  );
}
