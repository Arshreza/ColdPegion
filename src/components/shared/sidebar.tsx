"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Box,
  Bot,
  Settings,
  Building,
  Inbox,
  ServerCog,
  Search,
  BarChart3,
  UsersRound,
  CreditCard,
  Plug,
  Ban,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Unified Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "AI Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Prospects", href: "/dashboard/prospects", icon: Users },
  { name: "Find Leads", href: "/dashboard/prospects/finder", icon: Search },
  { name: "Products", href: "/dashboard/products", icon: Box },
  { name: "Email Accounts", href: "/dashboard/accounts", icon: ServerCog },
  { name: "Deliverability", href: "/dashboard/deliverability", icon: BarChart3 },
  { name: "Suppression List", href: "/dashboard/suppression", icon: Ban },
  { name: "Connect (MCP)", href: "/dashboard/mcp", icon: Plug },
  { name: "Team", href: "/dashboard/team", icon: UsersRound },
  { name: "Company Profile", href: "/dashboard/company", icon: Building },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [usage, setUsage] = useState<{ sentToday: number; dailyLimit: number; unlimited: boolean; planLabel: string } | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userEmail = session?.user?.email ?? "";
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=support@coldpegion.com${userEmail ? `&from=${encodeURIComponent(userEmail)}` : ""}`;

  useEffect(() => {
    fetch("/api/usage").then((r) => (r.ok ? r.json() : null)).then(setUsage).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const toggle = () => setIsMobileOpen((open) => !open);
    const close = () => setIsMobileOpen(false);

    window.addEventListener("mp:toggle-sidebar", toggle);
    window.addEventListener("mp:close-sidebar", close);

    return () => {
      window.removeEventListener("mp:toggle-sidebar", toggle);
      window.removeEventListener("mp:close-sidebar", close);
    };
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border gap-3">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7h.01" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m20 7 2 .5-2 .5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 18v3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 17.75V21" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 18a6 6 0 0 0 3.84-10.61" />
          </svg>
        </div>
        <span
          className="text-xl font-bold tracking-tight text-sidebar-fg"
          title="Yes, it's spelled Pegion — on purpose."
        >
          Cold
          <span className="underline decoration-error-500/70 decoration-wavy decoration-[1.5px] underline-offset-4">
            Pegion
          </span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-1">
          {(() => {
            const best = navigation
              .filter((i) => pathname === i.href || pathname?.startsWith(i.href + "/"))
              .sort((a, b) => b.href.length - a.href.length)[0];
            return navigation.map((item) => {
              const isActive = best?.href === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? "bg-sidebar-active text-sidebar-fg font-medium"
                      : "text-sidebar-fg-muted hover:bg-sidebar-hover hover:text-sidebar-fg",
                    "group flex items-center rounded-md px-3 py-2.5 text-sm transition-colors"
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? "text-brand-500" : "text-sidebar-fg-muted group-hover:text-sidebar-fg",
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            });
          })()}
        </nav>
      </div>

      <div className="px-4 pt-3 pb-4 border-t border-sidebar-border space-y-3">
        <a
          href={gmailUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Email support"
          className="flex items-center gap-2 text-xs text-sidebar-fg-muted hover:text-sidebar-fg transition-colors"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span>support@coldpegion.com</span>
        </a>
        <Link href="/dashboard/billing" className="block bg-sidebar-active/50 rounded-lg p-3 hover:bg-sidebar-active transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sidebar-fg-muted uppercase tracking-wider">
              {usage?.planLabel || "Plan"} — today
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-sidebar-fg">Emails sent</span>
                <span className="text-sidebar-fg-muted">
                  {usage ? (usage.unlimited ? `${usage.sentToday}` : `${usage.sentToday} / ${usage.dailyLimit}`) : "—"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-sidebar-active rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: usage && !usage.unlimited && usage.dailyLimit > 0 ? `${Math.min((usage.sentToday / usage.dailyLimit) * 100, 100)}%` : "0%" }}
                />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on large screens) */}
      <div className="hidden lg:flex h-full w-64 flex-col bg-sidebar-bg border-r border-sidebar-border flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (visible only when toggled on mobile/tablet) */}
      {isMobileOpen && (
        <div className="relative z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Wrapper */}
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs transition-transform duration-300 ease-in-out">
            <div className="relative flex w-64 flex-col bg-sidebar-bg border-r border-sidebar-border h-full animate-slide-in-left">
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 text-sidebar-fg-muted hover:text-sidebar-fg p-1 rounded-md hover:bg-sidebar-hover transition-colors"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
