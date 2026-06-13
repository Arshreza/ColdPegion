"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, Loader2, Plug, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PROMPT =
  "Find 50 fintech CTOs matching my ICP, write a personal 3-step sequence for each, and launch my outreach agent.";

const CALLS = [
  {
    connector: "apollo",
    call: "people_search(title: 'CTO', industry: 'fintech')",
    result: "50 qualified leads found",
  },
  {
    connector: "coldpegion",
    call: "import_leads('Fintech CTOs', leads[50])",
    result: "50 prospects imported",
  },
  {
    connector: "coldpegion",
    call: "prepare_emails(agent: 'Fintech Outbound', items[150])",
    result: "150 personalized emails written",
  },
  {
    connector: "coldpegion",
    call: "launch_agent('Fintech Outbound')",
    result: "Campaign live — sending at safe limits",
  },
];

const RESPONSE =
  "Done. 50 new prospects imported, every email written personally for its recipient, and your agent is sending. I'll check replies tomorrow morning.";

type CallState = "pending" | "running" | "done";

function ToolCall({
  connector,
  call,
  result,
  state,
}: (typeof CALLS)[number] & { state: CallState }) {
  // Pending steps stay invisible (not unmounted) so the card's final height is
  // reserved up front and the demo never causes layout shift (CLS).
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed sm:text-xs",
        state === "pending" ? "invisible" : "animate-slide-up"
      )}
      aria-hidden={state === "pending"}
    >
      <div className="flex items-center gap-1.5 text-foreground-muted">
        <Plug className="h-3 w-3 shrink-0 text-brand-500" />
        <span className="font-semibold text-foreground-secondary">{connector}</span>
        <span className="truncate">{call}</span>
      </div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1.5",
          state === "running" ? "text-foreground-muted" : "text-success-600"
        )}
      >
        {state === "running" ? (
          <>
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
            running…
          </>
        ) : (
          <>
            <Check className="h-3 w-3 shrink-0" />
            {result}
          </>
        )}
      </div>
    </div>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ClaudeDemo() {
  const [typedPrompt, setTypedPrompt] = useState("");
  const [callStates, setCallStates] = useState<CallState[]>(CALLS.map(() => "pending"));
  const [typedResponse, setTypedResponse] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await sleep(0);
        if (!alive) return;
        setTypedPrompt(PROMPT);
        setCallStates(CALLS.map(() => "done"));
        setTypedResponse(RESPONSE);
        return;
      }

      while (alive) {
        setTypedPrompt("");
        setCallStates(CALLS.map(() => "pending"));
        setTypedResponse("");
        await sleep(600);

        for (let i = 1; i <= PROMPT.length && alive; i++) {
          setTypedPrompt(PROMPT.slice(0, i));
          await sleep(14);
        }
        await sleep(450);

        for (let i = 0; i < CALLS.length && alive; i++) {
          setCallStates((s) => s.map((v, j) => (j === i ? "running" : v)));
          await sleep(850 + i * 120);
          setCallStates((s) => s.map((v, j) => (j === i ? "done" : v)));
          await sleep(280);
        }
        await sleep(350);

        for (let i = 1; i <= RESPONSE.length && alive; i++) {
          setTypedResponse(RESPONSE.slice(0, i));
          await sleep(9);
        }
        await sleep(5000);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-background-secondary p-4 shadow-xl glow-brand sm:p-5">
      {/* window chrome */}
      <div className="mb-4 flex items-center justify-between gap-2 min-w-0">
        <div className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-error-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success-500/70" />
        </div>
        <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full bg-background-tertiary px-2.5 py-1 text-[11px] font-medium text-foreground-secondary">
          <CalendarClock className="h-3 w-3 shrink-0 text-accent-500" />
          <span className="truncate">Claude routine · every weekday, 8:00 AM</span>
        </span>
      </div>

      {/* routine prompt — sized by the invisible full text so typing never shifts layout */}
      <div className="relative ml-auto max-w-[85%] rounded-xl rounded-tr-sm gradient-brand px-3.5 py-2.5 text-xs font-medium text-white sm:text-sm">
        <span className="invisible" aria-hidden="true">
          {PROMPT}
        </span>
        <span className="absolute inset-0 px-3.5 py-2.5">
          {typedPrompt}
          {typedPrompt.length < PROMPT.length && (
            <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 rounded-sm bg-white/80 animate-blink-dot" />
          )}
        </span>
      </div>

      {/* claude response */}
      <div className="mt-3 max-w-[92%] space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent-500" />
          Claude
        </div>
        {CALLS.map((c, i) => (
          <ToolCall key={c.call} {...c} state={callStates[i]} />
        ))}
        {/* response — space reserved by the invisible full text; bubble fades in when typing starts */}
        <div
          className={cn(
            "relative rounded-xl rounded-tl-sm px-3.5 py-2.5 text-xs leading-relaxed text-foreground-secondary sm:text-sm",
            typedResponse ? "animate-fade-in bg-background-tertiary" : "invisible"
          )}
          aria-hidden={!typedResponse}
        >
          <span className="invisible" aria-hidden="true">
            {RESPONSE}
          </span>
          <span className="absolute inset-0 px-3.5 py-2.5">
            {typedResponse}
            {typedResponse && (
              <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 rounded-sm bg-accent-500 animate-blink-dot" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
