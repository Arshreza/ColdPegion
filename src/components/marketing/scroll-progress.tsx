"use client";

import { useEffect, useRef } from "react";

/** Thin gradient progress bar pinned above the navbar. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      el.style.transform = `scaleX(${p})`;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 gradient-brand"
    />
  );
}
