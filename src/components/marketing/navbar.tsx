"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";

const links = [
  { href: "/#features", label: "Product" },
  { href: "/claude", label: "Claude + MCP" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/#faq", label: "FAQ" },
];

export function Navbar({ isAuthed }: { isAuthed: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border glass">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground hover:bg-background-tertiary"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {isAuthed ? (
            <Button asChild>
              <Link href="/dashboard">
                Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">
                  Start for free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-foreground-secondary hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border bg-background-secondary px-4 pb-4 pt-2 animate-fade-in">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            {isAuthed ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Start for free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
