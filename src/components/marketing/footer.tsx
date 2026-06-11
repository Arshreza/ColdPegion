import Link from "next/link";
import { Logo } from "./logo";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/claude", label: "Claude + MCP" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/register", label: "AI Agents" },
      { href: "/register", label: "AI Sidekick" },
      { href: "/register", label: "Lead Finder" },
      { href: "/register", label: "Unified Inbox" },
      { href: "/register", label: "Deliverability & Warmup" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/docs/quick-start", label: "Quick start guide" },
      { href: "/docs/troubleshooting", label: "Troubleshooting" },
      { href: "/claude", label: "Connect Claude" },
      { href: "/#faq", label: "FAQ" },
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-foreground-muted">
              The AI-first cold outreach platform. Autonomous email agents,
              MCP-native, and built to run on auto mode from Claude.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-foreground-muted transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-foreground-muted">
            © {new Date().getFullYear()} ColdPigeon. All rights reserved.
          </p>
          <p className="text-xs text-foreground-muted">
            Send responsibly — built-in unsubscribe, rate limits, and deliverability guardrails.
          </p>
        </div>
      </div>
    </footer>
  );
}
