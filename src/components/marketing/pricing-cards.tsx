import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Display copy for the plans defined in src/lib/billing/plans.ts — keep limits in sync.
const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Test the waters with your first AI agent.",
    cta: "Start for free",
    href: "/register",
    highlight: false,
    features: [
      "50 emails / day",
      "1 connected mailbox",
      "1 seat",
      "AI agents & AI Sidekick",
      "Claude / MCP connector",
      "Lead database access",
    ],
  },
  {
    name: "Starter",
    price: "$39",
    period: "/month",
    description: "For founders running serious outbound.",
    cta: "Start with Starter",
    href: "/register",
    highlight: false,
    features: [
      "500 emails / day",
      "5 connected mailboxes",
      "3 seats",
      "Inbox rotation & warmup",
      "Unified inbox & analytics",
      "Everything in Free",
    ],
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "For teams scaling pipeline on autopilot.",
    cta: "Go Pro",
    href: "/register",
    highlight: true,
    features: [
      "5,000 emails / day",
      "25 connected mailboxes",
      "10 seats",
      "Advanced deliverability suite",
      "Priority sending queue",
      "Everything in Starter",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Unlimited scale, SLAs, and white-glove onboarding.",
    cta: "Talk to sales",
    href: "/register",
    highlight: false,
    features: [
      "Unlimited emails / day",
      "Unlimited mailboxes & seats",
      "Dedicated deliverability expert",
      "Custom integrations",
      "Security review & SSO",
      "Everything in Pro",
    ],
  },
];

export function PricingCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {tiers.map((tier) => (
        <div
          key={tier.name}
          className={cn(
            "relative flex flex-col rounded-2xl border bg-background-secondary p-6 shadow-sm transition-shadow hover:shadow-lg",
            tier.highlight ? "border-brand-500 glow-brand" : "border-border"
          )}
        >
          {tier.highlight && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full gradient-brand px-3 py-1 text-xs font-semibold text-white shadow-md">
              <Sparkles className="h-3 w-3" /> Most popular
            </span>
          )}
          <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">{tier.price}</span>
            <span className="text-sm text-foreground-muted">{tier.period}</span>
          </div>
          <p className="mt-2 text-sm text-foreground-secondary">{tier.description}</p>
          <ul className="mt-6 flex-1 space-y-2.5">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground-secondary">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-500" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            asChild
            className={cn("mt-6 w-full", tier.highlight && "btn-shine")}
            variant={tier.highlight ? "default" : "outline"}
          >
            <Link href={tier.href}>{tier.cta}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
