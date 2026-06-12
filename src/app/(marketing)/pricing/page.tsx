import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Reveal } from "@/components/marketing/reveal";
import { JsonLd, faqJsonLd } from "@/components/marketing/json-ld";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, usage-based pricing for autonomous AI outreach. Start free — AI agents, AI Sidekick, and the Claude/MCP connector are included on every plan.",
  alternates: { canonical: "/pricing" },
};

// Comparison rows mirror src/lib/billing/plans.ts limits.
const comparison: { feature: string; values: (string | boolean)[] }[] = [
  { feature: "Emails per day", values: ["50", "500", "5,000", "Unlimited"] },
  { feature: "Connected mailboxes", values: ["1", "5", "25", "Unlimited"] },
  { feature: "Team seats", values: ["1", "3", "10", "Unlimited"] },
  { feature: "Autonomous AI agents", values: [true, true, true, true] },
  { feature: "AI Sidekick (in-app copilot)", values: [true, true, true, true] },
  { feature: "Claude / MCP connector", values: [true, true, true, true] },
  { feature: "Lead database & finder", values: [true, true, true, true] },
  { feature: "Apollo-powered Super Search", values: [true, true, true, true] },
  { feature: "Email verification", values: [true, true, true, true] },
  { feature: "Unified inbox", values: [true, true, true, true] },
  { feature: "Inbox warmup", values: [false, true, true, true] },
  { feature: "Mailbox rotation", values: [false, true, true, true] },
  { feature: "Advanced deliverability suite", values: [false, false, true, true] },
  { feature: "Priority sending queue", values: [false, false, true, true] },
  { feature: "SSO & security review", values: [false, false, false, true] },
  { feature: "Dedicated deliverability expert", values: [false, false, false, true] },
];

const planNames = ["Free", "Starter", "Pro", "Enterprise"];

const faqItems: FaqItem[] = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan is free forever — one mailbox, 50 emails a day, and full access to AI agents, the AI Sidekick, and the Claude/MCP connector.",
  },
  {
    q: "What counts as an email?",
    a: "Only outbound campaign emails count toward your daily limit. Warmup traffic, replies you send from the unified inbox, and test sends don't count.",
  },
  {
    q: "Are LLM costs included?",
    a: "You choose: bring your own API key (OpenAI, Groq, Gemini, or any OpenAI-compatible endpoint), or connect Claude over MCP and let your Claude subscription write everything — in which case ColdPegion adds zero LLM cost.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes. Upgrades apply immediately and downgrades take effect at the end of the billing cycle. Billing is handled securely by Stripe and you can cancel anytime from the dashboard.",
  },
  {
    q: "What does Enterprise include?",
    a: "Unlimited volume, mailboxes, and seats, plus SSO, a security review, custom integrations, and a dedicated deliverability expert. Contact us and we'll tailor it to your team.",
  },
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(faqItems)} />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
        <div className="absolute inset-0 bg-noise opacity-[0.04]" aria-hidden />
        <div
          className="aurora-blob -top-24 left-1/3 h-80 w-[520px] bg-brand-500/30"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-2xl text-center animate-slide-up">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Pricing that scales <span className="gradient-text-animated">with your pipeline</span>
            </h1>
            <p className="mt-5 text-lg text-foreground-secondary">
              Every plan ships the full AI platform. Pay only for sending
              volume, mailboxes, and seats.
            </p>
          </div>
          <Reveal delay={120} className="mt-14">
            <PricingCards />
          </Reveal>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="border-t border-border bg-background-secondary py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
              Compare plans
            </h2>
          </Reveal>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-background shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-4 text-left font-semibold text-foreground">Feature</th>
                  {planNames.map((p) => (
                    <th key={p} className="px-5 py-4 text-center font-semibold text-foreground">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 1 ? "bg-background-tertiary/50" : undefined}
                  >
                    <td className="px-5 py-3 text-foreground-secondary">{row.feature}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className="px-5 py-3 text-center">
                        {typeof v === "boolean" ? (
                          v ? (
                            <Check className="mx-auto h-4 w-4 text-success-500" />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-foreground-muted" />
                          )
                        ) : (
                          <span className="font-medium text-foreground">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Pricing questions
          </h2>
          <div className="mt-10">
            <Faq items={faqItems} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-background-secondary py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Try it free. Upgrade when the replies roll in.
          </h2>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg" className="text-base">
              <Link href="/register">
                Start for free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
