import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CalendarClock,
  Flame,
  Inbox,
  MessageSquare,
  Plug,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClaudeDemo } from "@/components/marketing/claude-demo";
import { Counter } from "@/components/marketing/counter";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { IntegrationsMarquee } from "@/components/marketing/marquee";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { Tilt } from "@/components/marketing/tilt";
import { JsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "Autonomous AI email agents that find leads, write hyper-personalized outreach, and book replies. MCP-native: run your entire outbound from Claude on auto mode.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Starter", price: "39", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro", price: "99", priceCurrency: "USD" },
  ],
};

const stats = [
  { value: "10x", label: "more pipeline per rep" },
  { value: "3 min", label: "from sign-up to first campaign" },
  { value: "100%", label: "of emails written per-lead by AI" },
  { value: "$0", label: "extra LLM spend with Claude + MCP" },
];

const features = [
  {
    icon: Bot,
    title: "Autonomous AI agents",
    description:
      "Spin up an agent per product or ICP. It studies your offer, writes hyper-personalized multi-step sequences for every prospect, and sends on schedule — no templates, no mail-merge.",
  },
  {
    icon: MessageSquare,
    title: "AI Sidekick",
    description:
      "A conversational copilot inside the app. Say “Create an agent for my SaaS targeting CTOs in fintech” and it builds the whole campaign — lists, sequence, schedule, launch.",
  },
  {
    icon: Search,
    title: "Lead finder & enrichment",
    description:
      "Source prospects from the built-in lead database, Apollo-powered Super Search, CSV/XLSX import, or website scraping — then verify every address before you send.",
  },
  {
    icon: Inbox,
    title: "Unified inbox",
    description:
      "Every reply from every mailbox in one stream. AI-drafted responses, sentiment at a glance, and full conversation history so no warm lead slips through.",
  },
  {
    icon: ShieldCheck,
    title: "Deliverability & warmup",
    description:
      "Automatic inbox warmup, smart sending windows, per-account daily caps, mailbox rotation, and bounce protection keep you in the primary inbox — not spam.",
  },
  {
    icon: BarChart3,
    title: "Revenue analytics",
    description:
      "Opens, clicks, replies, and deliverability health per agent, per mailbox, per campaign. Know exactly which message and which audience prints pipeline.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description:
      "Organizations, seats, roles, and shared infrastructure. Agencies run separate agents per client; sales teams share mailboxes and leads safely.",
  },
  {
    icon: BrainCircuit,
    title: "Bring your own LLM",
    description:
      "Plug in OpenAI, Groq, Gemini, or any OpenAI-compatible endpoint — or skip API keys entirely and let your Claude subscription do the writing over MCP.",
  },
  {
    icon: Zap,
    title: "Queue-grade sending",
    description:
      "A battle-tested background worker with rate limiting, retries, spintax, tracking, and one-click unsubscribe baked into every send.",
  },
];

const steps = [
  {
    icon: Target,
    title: "Tell it what you sell",
    description:
      "Paste your website. ColdPegion extracts your products, value props, and ideal customer profile automatically.",
  },
  {
    icon: Search,
    title: "Point it at your market",
    description:
      "Mine leads with the built-in finder and Apollo, import your own lists, or let Claude prospect for you with any connector.",
  },
  {
    icon: Bot,
    title: "Launch your agent",
    description:
      "Your agent writes a unique sequence for every single prospect and sends from warmed-up, rotating mailboxes.",
  },
  {
    icon: Rocket,
    title: "Reply and close",
    description:
      "Answers land in your unified inbox with AI-drafted replies. You just hit send and book the meeting.",
  },
];

const testimonials = [
  {
    quote:
      "I added ColdPegion as a Claude connector, set up a morning routine, and now wake up to campaigns that prospected, wrote, and launched themselves. It genuinely feels like hiring an SDR team.",
    name: "Sara K.",
    role: "Founder, B2B SaaS",
  },
  {
    quote:
      "Every email is actually written for the person receiving it — not a template with a {{firstName}} slapped on. Our reply rate tripled in the first month.",
    name: "Daniel M.",
    role: "Head of Growth, DevTools startup",
  },
  {
    quote:
      "We run 12 client accounts on it. Separate agents, separate mailboxes, one dashboard. The warmup and rotation alone paid for the subscription.",
    name: "Priya R.",
    role: "Director, Outbound Agency",
  },
];

const faqItems: FaqItem[] = [
  {
    q: "How is ColdPegion different from Instantly, Smartlead, or Lemlist?",
    a: "Those tools automate sending templates. ColdPegion deploys autonomous AI agents that write a unique email for every prospect based on your product and their profile — and it's the only outreach platform that's MCP-native, so you can drive the entire thing from Claude with your existing subscription, including fully automated routines.",
  },
  {
    q: "What exactly does the Claude / MCP integration do?",
    a: "ColdPegion ships a remote MCP server. Add it as a connector in Claude (claude.ai or Claude Desktop) and Claude gets tools to import leads, write per-lead sequences, configure agents, and launch campaigns. Pair it with the Apollo connector or any other connector and Claude can mine leads, write every email, and launch — using your Claude plan, with zero ColdPegion LLM cost.",
  },
  {
    q: "What are Claude routines and “auto mode”?",
    a: "Routines are scheduled tasks in Claude. Set one like “every weekday at 8 AM, find 50 new leads matching my ICP, prepare personalized emails, and launch my agent” — and your outbound runs hands-free. ColdPegion's worker sends Claude-written emails at safe, human-like pace.",
  },
  {
    q: "Do I need my own LLM API key?",
    a: "No. You have three options: bring any OpenAI-compatible API key (OpenAI, Groq, Gemini, even local Ollama), use static sequences, or connect Claude over MCP and let your Claude subscription write everything — no API key required.",
  },
  {
    q: "Will my emails land in spam?",
    a: "Deliverability is built in: automatic mailbox warmup, per-account daily limits, sending-window controls, mailbox rotation, bounce and reply detection, verified-lead filtering, and one-click unsubscribe on every email.",
  },
  {
    q: "How do I connect my email accounts?",
    a: "Connect Gmail via app password, any SMTP provider, or a Resend API key in about a minute. Add as many mailboxes as your plan allows and ColdPegion rotates sending across them automatically.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes — free forever, no credit card. You get one mailbox, 50 emails a day, full AI agents, the AI Sidekick, and the Claude/MCP connector. Upgrade only when you need more volume.",
  },
  {
    q: "How do I get help?",
    a: "Three self-serve layers: step-by-step guides at /docs covering everything from setup to troubleshooting; the in-app AI Sidekick, which has those guides built in and can inspect and fix your account directly; and Claude itself — connected over MCP it reads the same guides and operates the same tools. Most issues never need a support ticket.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={faqJsonLd(faqItems)} />
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
        <div className="absolute inset-0 bg-noise opacity-[0.04]" aria-hidden />
        <div
          className="aurora-blob -top-40 left-1/4 h-[420px] w-[560px] bg-brand-500/40"
          aria-hidden
        />
        <div
          className="aurora-blob -top-20 right-1/4 h-[360px] w-[480px] bg-accent-500/35 [animation-delay:-6s]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              MCP-native · Works inside Claude
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your AI sales team,{" "}
              <span className="gradient-text-animated">on autopilot.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground-secondary">
              ColdPegion deploys autonomous email agents that find leads,
              write a personal email for every prospect, and fill your inbox
              with replies. Connect it to Claude and your entire outbound runs
              on auto mode — Apollo prospecting, copywriting, launching —
              while you sleep.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="btn-shine text-base">
                <Link href="/register">
                  Start free — no credit card <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link href="/claude">
                  <Sparkles className="mr-2 h-4 w-4 text-accent-500" />
                  See it run from Claude
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-foreground-muted">
              Free forever plan · 3-minute setup · Cancel anytime
            </p>
          </div>
          <div className="animate-fade-in lg:pl-6">
            <Tilt>
              <ClaudeDemo />
            </Tilt>
          </div>
        </div>
      </section>

      {/* ============ INTEGRATIONS MARQUEE ============ */}
      <IntegrationsMarquee />

      {/* ============ STATS ============ */}
      <section className="border-b border-border bg-background-secondary">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="text-center">
              <div className="text-3xl font-extrabold gradient-brand-text sm:text-4xl">
                <Counter value={s.value} />
              </div>
              <div className="mt-1 text-sm text-foreground-muted">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              The platform
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything outbound needs. <span className="gradient-brand-text">Nothing manual.</span>
            </h2>
            <p className="mt-4 text-lg text-foreground-secondary">
              From first lead to booked meeting — one AI-first platform replaces
              your prospecting tool, copywriter, sending tool, and warmup service.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <SpotlightCard className="group h-full rounded-2xl border border-border bg-background-secondary p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="inline-flex rounded-lg bg-brand-500/10 p-2.5 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white dark:text-brand-400">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{f.description}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CLAUDE + MCP SPOTLIGHT ============ */}
      <section className="relative overflow-hidden border-y border-border bg-sidebar-bg py-20 text-sidebar-fg lg:py-28">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div className="absolute inset-0 bg-noise opacity-[0.05]" aria-hidden />
        <div
          className="aurora-blob right-0 top-0 h-96 w-96 bg-accent-500/30"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/40 bg-accent-500/15 px-3 py-1 text-xs font-semibold text-accent-500">
                <Sparkles className="h-3.5 w-3.5" /> Industry first
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                The only outreach platform that lives{" "}
                <span className="gradient-text-animated">inside Claude.</span>
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-sidebar-fg/80">
                ColdPegion is a native MCP connector. Claude doesn&apos;t just
                advise on your outreach — it <em>operates</em> it, chaining your
                other connectors with ColdPegion&apos;s tools.
              </p>
              <ul className="mt-8 space-y-5">
                {[
                  {
                    icon: Plug,
                    title: "Chain any connector",
                    text: "Claude mines leads with the Apollo connector, researches them with web search, then imports and launches in ColdPegion — one conversation, end to end.",
                  },
                  {
                    icon: CalendarClock,
                    title: "Auto mode with Claude routines",
                    text: "Schedule a routine — “every morning, prospect, personalize, launch” — and outbound runs hands-free, every day, without you opening a tab.",
                  },
                  {
                    icon: Flame,
                    title: "Zero extra LLM cost",
                    text: "Claude writes every email on your existing subscription. ColdPegion's worker just sends them verbatim — no API keys, no per-token bills.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-brand text-white shadow-md">
                      <item.icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-sidebar-fg/70">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="btn-shine mt-9">
                <Link href="/claude">
                  Explore Claude + MCP <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
            <Reveal delay={150}>
              <Tilt max={5}>
                <div className="rounded-2xl border border-sidebar-border bg-background-secondary/5 p-5 backdrop-blur">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sidebar-fg-muted">
                    Add the connector in under a minute
                  </p>
                  <pre className="overflow-x-auto rounded-xl border border-sidebar-border bg-black/40 p-4 font-mono text-xs leading-relaxed text-sidebar-fg">
{`{
  "mcpServers": {
    "coldpegion": {
      "url": "https://app.coldpegion.com/api/mcp",
      "headers": {
        "Authorization": "Bearer cp_live_..."
      }
    }
  }
}`}
                  </pre>
                  <p className="mt-3 text-xs leading-relaxed text-sidebar-fg-muted">
                    Or use OAuth: paste the URL into claude.ai → Settings →
                    Connectors and sign in. Claude instantly gets 30+ tools — import
                    leads, write sequences, prepare per-lead emails, launch agents,
                    read stats.
                  </p>
                </div>
              </Tilt>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              How it works
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From zero to booked meetings in four steps
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 110}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-white shadow-md">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-foreground-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{step.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="border-y border-border bg-background-secondary py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Loved by founders, growth teams, and agencies
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 110}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-background p-6 shadow-sm">
                  <div className="flex gap-0.5 text-warning-500">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground-secondary">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 border-t border-border pt-4">
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-foreground-muted">{t.role}</div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING PREVIEW ============ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Pricing
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Start free. Scale when it works.
            </h2>
            <p className="mt-4 text-lg text-foreground-secondary">
              Every plan includes AI agents, the AI Sidekick, and the Claude/MCP
              connector. No credit card to start.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-14">
            <PricingCards />
          </Reveal>
          <div className="mt-8 text-center">
            <Link
              href="/pricing"
              className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Compare all plans →
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="scroll-mt-20 border-t border-border bg-background-secondary py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <Faq items={faqItems} />
          </Reveal>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div
          className="aurora-blob left-1/3 top-1/2 h-72 w-[520px] -translate-y-1/2 bg-accent-500/25"
          aria-hidden
        />
        <div
          className="aurora-blob right-1/3 top-1/2 h-64 w-[420px] -translate-y-1/2 bg-brand-500/25 [animation-delay:-8s]"
          aria-hidden
        />
        <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Stop writing cold emails.{" "}
            <span className="gradient-text-animated">Start closing warm replies.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-foreground-secondary">
            Launch your first autonomous agent in three minutes — or connect
            Claude and let it do even that for you.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="btn-shine text-base">
              <Link href="/register">
                Create your free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-foreground-muted">
            Psst — try typing{" "}
            <kbd className="rounded border border-border bg-background-tertiary px-1.5 py-0.5 font-mono text-[11px]">claude</kbd>{" "}
            anywhere on this page.
          </p>
        </Reveal>
      </section>
    </>
  );
}
