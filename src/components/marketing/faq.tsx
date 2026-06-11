"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-background-secondary shadow-sm">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q}>
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
            >
              <span className="text-sm font-semibold text-foreground sm:text-base">{item.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-foreground-muted transition-transform",
                  open && "rotate-180"
                )}
              />
            </button>
            {open && (
              <p className="animate-fade-in px-5 pb-5 text-sm leading-relaxed text-foreground-secondary">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
