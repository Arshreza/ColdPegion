"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** 3D mouse-tracking tilt with a moving glare highlight. */
export function Tilt({
  children,
  max = 7,
  className,
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
    el.style.setProperty("--glare-x", `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-y", `${((py + 0.5) * 100).toFixed(1)}%`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        "relative transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]",
        className
      )}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--glare-x, 50%) var(--glare-y, 50%), rgb(255 255 255 / 0.10), transparent 60%)",
        }}
      />
    </div>
  );
}
