import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, MessageSquare, Sparkles } from "lucide-react";
import { guides, GUIDE_CATEGORIES } from "@/lib/docs/guides";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";

export const metadata: Metadata = {
  title: "Documentation & guides",
  description:
    "Everything you need to run ColdPegion: setup guides, lead sourcing, AI agents, deliverability, the Claude/MCP connector, billing, and troubleshooting.",
  alternates: { canonical: "/docs" },
};

export default function DocsIndexPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
        <div className="aurora-blob -top-24 left-1/3 h-72 w-[480px] bg-brand-500/25" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center animate-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <BookOpen className="h-3.5 w-3.5" /> Help center
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              How can we <span className="gradient-text-animated">help?</span>
            </h1>
            <p className="mt-4 text-lg text-foreground-secondary">
              Guides for everything — from your first campaign to running
              outreach on auto mode from Claude.
            </p>
          </div>
        </div>
      </section>

      {/* ASK AN AI CALLOUT */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-2xl border-gradient p-5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-brand text-white shadow-md">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">Ask the Sidekick</h2>
                <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
                  The in-app assistant has read every guide here — and it can
                  fix things directly. Open the chat bubble in your dashboard
                  and just ask.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-gradient p-5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-brand text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">Ask Claude</h2>
                <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
                  Connected via MCP, Claude can read these guides, check your
                  account, and resolve issues for you.{" "}
                  <Link href="/claude" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                    Set up the connector →
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-foreground-muted">
            Prefer a human? Email{" "}
            <a href="mailto:support@coldpegion.com" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              support@coldpegion.com
            </a>{" "}
            — we read every message.
          </p>
        </Reveal>
      </section>

      {/* GUIDES BY CATEGORY */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {GUIDE_CATEGORIES.map((category) => {
            const items = guides.filter((g) => g.category === category);
            if (items.length === 0) return null;
            return (
              <Reveal key={category}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  {category}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((g) => (
                    <SpotlightCard
                      key={g.slug}
                      className="group rounded-2xl border border-border bg-background-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <Link href={`/docs/${g.slug}`} className="flex h-full flex-col p-5">
                        <h3 className="font-semibold text-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {g.title}
                        </h3>
                        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-foreground-secondary">
                          {g.description}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400">
                          Read guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </SpotlightCard>
                  ))}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}
