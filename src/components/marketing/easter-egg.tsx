"use client";

import { useEffect, useState } from "react";

const SECRET = "claude";
const COLORS = ["#3b82f6", "#8b5cf6", "#60a5fa", "#7c3aed", "#22c55e", "#f59e0b"];

function fireConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:100";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const parts = Array.from({ length: 160 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 13 - 4,
    size: Math.random() * 7 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }));

  const start = performance.now();
  function frame(now: number) {
    const t = now - start;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.rot += p.vr;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      ctx!.globalAlpha = Math.max(0, 1 - t / 2600);
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx!.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

/** Type "claude" anywhere on the marketing site → confetti + pilot mode badge. */
export function EasterEgg() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let buffer = "";
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
      if (buffer === SECRET) {
        buffer = "";
        fireConfetti();
        setUnlocked(true);
        setTimeout(() => setUnlocked(false), 6000);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!unlocked) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 animate-slide-up">
      <div className="flex items-center gap-2.5 rounded-full border-gradient px-5 py-2.5 shadow-xl glow-brand">
        <span className="text-lg">🕊️</span>
        <p className="text-sm font-semibold text-foreground">
          Coo! The pigeons are loose — you typed the magic word.
        </p>
      </div>
    </div>
  );
}
