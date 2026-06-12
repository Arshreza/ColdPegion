import Link from "next/link";
import { Bird } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 group", className)}
      title="Yes, it's spelled Pegion — on purpose."
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-white shadow-md transition-transform group-hover:scale-105">
        <Bird className="h-4.5 w-4.5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">
        {/* The spellcheck squiggle is the brand: we know it's misspelled, we kept it. */}
        Cold
        <span className="gradient-brand-text underline decoration-error-500/80 decoration-wavy decoration-[1.5px] underline-offset-4">
          Pegion
        </span>
      </span>
    </Link>
  );
}
