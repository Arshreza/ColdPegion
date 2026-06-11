import Link from "next/link";
import { Bird } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-white shadow-md transition-transform group-hover:scale-105">
        <Bird className="h-4.5 w-4.5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">
        Cold<span className="gradient-brand-text">Pigeon</span>
      </span>
    </Link>
  );
}
