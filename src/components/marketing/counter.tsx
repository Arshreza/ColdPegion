"use client";

import { useEffect, useRef, useState } from "react";

/** Counts a stat like "10x", "100%", "$0", "3 min" up from zero when scrolled into view. */
export function Counter({ value, className }: { value: string; className?: string }) {
  const match = value.match(/^([^0-9]*)([\d,]+)(.*)$/);
  const target = match ? parseInt(match[2].replace(/,/g, ""), 10) : null;
  const prefix = match?.[1] ?? "";
  const suffix = match?.[3] ?? "";

  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(target === null ? value : `${prefix}0${suffix}`);

  useEffect(() => {
    if (target === null) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setDisplay(value);
          return;
        }
        const start = performance.now();
        const duration = 1300;
        const fmt = match![2].includes(",");
        function tick(now: number) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          const n = Math.round(eased * target!);
          setDisplay(`${prefix}${fmt ? n.toLocaleString("en-US") : n}${suffix}`);
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
