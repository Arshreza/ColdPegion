"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Search, Sparkles, Menu } from "lucide-react";

function openSidekick() {
  window.dispatchEvent(new Event("mp:open-sidekick"));
}

export function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
        {/* Mobile menu toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-foreground-muted hover:bg-background-tertiary"
          onClick={() => window.dispatchEvent(new Event("mp:toggle-sidebar"))}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Ask-AI launcher (replaces the old non-functional search box) */}
        <button
          type="button"
          onClick={openSidekick}
          className="relative flex flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-background-tertiary px-3 py-2 text-sm text-foreground-muted hover:border-brand-300 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Ask the AI Sidekick anything…</span>
          <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 font-sans text-xs md:inline-block">⌘K</kbd>
        </button>

        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
          <button
            type="button"
            onClick={openSidekick}
            className="hidden sm:flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Sidekick</span>
          </button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          <div className="flex items-center gap-4">
            <div className="hidden lg:block text-right">
              <p className="text-sm font-medium text-foreground">{session?.user?.name || ""}</p>
              <p className="text-xs text-foreground-muted leading-none mt-1">{session?.user?.email}</p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="text-foreground-muted hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
