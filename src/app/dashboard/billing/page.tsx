"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Check, Zap } from "lucide-react";

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/billing");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") setMsg("Subscription updated — thank you!");
    if (params.get("status") === "cancel") setMsg("Checkout canceled.");
  }, []);

  async function upgrade(plan: string) {
    setBusy(plan);
    setMsg(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not start checkout");
      if (d.url) window.location.href = d.url;
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not open portal");
      if (d.url) window.location.href = d.url;
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (loading || !data) {
    return <div className="flex h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-500/10 rounded-lg"><CreditCard className="h-5 w-5 text-brand-600" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing & Plan</h1>
          <p className="text-foreground-muted text-sm">
            You&apos;re on the <span className="font-semibold text-foreground">{data.limits.label}</span> plan
            {data.planStatus ? ` (${data.planStatus})` : ""}.
          </p>
        </div>
      </div>

      {msg && <div className="p-3 rounded-md text-sm bg-brand-500/10 text-brand-700">{msg}</div>}

      {!data.stripeConfigured && (
        <div className="p-3 rounded-md text-sm bg-warning-500/10 text-warning-700">
          Billing isn&apos;t connected on this instance yet (no Stripe keys). Plans below are illustrative; limits are still enforced.
        </div>
      )}

      {/* Current usage */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs text-foreground-muted uppercase">Mailboxes</p>
          <p className="text-2xl font-bold">{data.usage.mailboxes}<span className="text-sm text-foreground-muted"> / {data.limits.mailboxes === Infinity ? "∞" : data.limits.mailboxes}</span></p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs text-foreground-muted uppercase">Seats</p>
          <p className="text-2xl font-bold">{data.usage.seats}<span className="text-sm text-foreground-muted"> / {data.limits.seats === Infinity ? "∞" : data.limits.seats}</span></p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs text-foreground-muted uppercase">Daily emails</p>
          <p className="text-2xl font-bold">{data.limits.dailyEmails === Infinity ? "∞" : data.limits.dailyEmails}</p>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.plans.filter((p: any) => p.id !== "ENTERPRISE").map((p: any) => {
          const current = p.id === data.plan;
          return (
            <div key={p.id} className={`rounded-xl border bg-background p-5 ${current ? "border-brand-500 ring-1 ring-brand-500" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{p.label}</h3>
                {p.id === "PRO" && <Zap className="h-4 w-4 text-warning-500" />}
              </div>
              <p className="text-2xl font-bold mt-1">${p.priceMonthly}<span className="text-sm text-foreground-muted">/mo</span></p>
              <ul className="mt-4 space-y-2 text-sm text-foreground-secondary">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success-600" /> {p.dailyEmails} emails/day</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success-600" /> {p.mailboxes} mailboxes</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success-600" /> {p.seats} seats</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success-600" /> Lead database + warmup</li>
              </ul>
              <div className="mt-5">
                {current ? (
                  <Button variant="outline" className="w-full" disabled>Current plan</Button>
                ) : p.id === "FREE" ? (
                  <Button variant="outline" className="w-full" disabled>Downgrade in portal</Button>
                ) : (
                  <Button className="w-full" disabled={!data.isAdmin || busy === p.id} onClick={() => upgrade(p.id)}>
                    {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Upgrade to ${p.label}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.plan !== "FREE" && data.isAdmin && (
        <Button variant="outline" onClick={manage} disabled={busy === "portal"}>
          {busy === "portal" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
          Manage subscription
        </Button>
      )}
      {!data.isAdmin && <p className="text-xs text-foreground-muted">Only organization admins can change the plan.</p>}
    </div>
  );
}
