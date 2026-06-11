import {
  BrainCircuit,
  CalendarClock,
  Globe,
  Inbox,
  Mail,
  Plug,
  Search,
  Send,
  Server,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";

const items: { icon: LucideIcon; label: string }[] = [
  { icon: Sparkles, label: "Claude" },
  { icon: Plug, label: "MCP" },
  { icon: Target, label: "Apollo" },
  { icon: Mail, label: "Gmail" },
  { icon: Inbox, label: "Outlook" },
  { icon: Server, label: "SMTP" },
  { icon: Send, label: "Resend" },
  { icon: BrainCircuit, label: "OpenAI" },
  { icon: Zap, label: "Groq" },
  { icon: Sparkles, label: "Gemini" },
  { icon: Globe, label: "Web search" },
  { icon: Search, label: "ZeroBounce" },
  { icon: CalendarClock, label: "Claude routines" },
];

export function IntegrationsMarquee() {
  const row = items.map((item) => (
    <span
      key={item.label}
      className="mx-3 inline-flex items-center gap-2 rounded-full border border-border bg-background-secondary px-4 py-2 text-sm font-medium text-foreground-secondary shadow-sm"
    >
      <item.icon className="h-4 w-4 text-brand-500" />
      {item.label}
    </span>
  ));

  return (
    <div className="marquee-pause border-y border-border bg-background py-6">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-foreground-muted">
        Plays nicely with your whole stack
      </p>
      <div className="marquee-mask overflow-hidden">
        <div className="animate-marquee flex w-max items-center">
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}
