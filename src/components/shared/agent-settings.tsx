"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Plus, Trash2, Save, Clock, Mail, ListChecks } from "lucide-react";

interface Variant {
  subject?: string;
  body?: string;
}
interface Step {
  waitDays: number;
  subject?: string;
  body?: string;
  variants?: Variant[];
}

const DAYS = [
  { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" }, { v: 4, l: "Thu" },
  { v: 5, l: "Fri" }, { v: 6, l: "Sat" }, { v: 0, l: "Sun" },
];

export function AgentSettings({ agentId, onSaved }: { agentId: string; onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [genGuidelines, setGenGuidelines] = useState(false);
  const [genSequence, setGenSequence] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState<any>(null);
  const [steps, setSteps] = useState<Step[]>([{ waitDays: 0 }]);
  const [days, setDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [productIds, setProductIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        if (res.ok) {
          const a = await res.json();
          setForm({
            name: a.name || "",
            description: a.description || "",
            guidelines: a.guidelines || "",
            sequenceMode: a.sequenceMode || "AI_GENERATED",
            dailyEmailLimit: a.dailyEmailLimit ?? 100,
            minIntervalMinutes: a.minIntervalMinutes ?? 1,
            maxIntervalMinutes: a.maxIntervalMinutes ?? 5,
            randomDelayMax: a.randomDelayMax ?? 3,
            scheduleTimezone: a.scheduleTimezone || "UTC",
            scheduleStartHour: a.scheduleStartHour ?? 9,
            scheduleEndHour: a.scheduleEndHour ?? 17,
            includeUnsubscribe: a.includeUnsubscribe ?? true,
          });
          setProductIds((a.products || []).map((p: any) => p.productId || p.product?.id).filter(Boolean));
          try {
            const parsed = a.sequenceSteps ? JSON.parse(a.sequenceSteps) : null;
            if (Array.isArray(parsed) && parsed.length) setSteps(parsed);
          } catch { /* keep default */ }
          const d = (a.scheduleDays || "1,2,3,4,5").split(",").map((x: string) => parseInt(x)).filter((n: number) => !isNaN(n));
          setDays(new Set(d));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  function update(patch: any) { setForm((f: any) => ({ ...f, ...patch })); }
  function updateStep(i: number, patch: Partial<Step>) {
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  }
  function addStep() { setSteps((s) => [...s, { waitDays: 3, subject: "", body: "" }]); }
  function removeStep(i: number) { setSteps((s) => s.filter((_, idx) => idx !== i)); }
  function addVariant(i: number) {
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, variants: [...(st.variants || []), { subject: "", body: "" }] } : st)));
  }
  function updateVariant(i: number, vi: number, patch: Partial<Variant>) {
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, variants: (st.variants || []).map((v, j) => (j === vi ? { ...v, ...patch } : v)) } : st)));
  }
  function removeVariant(i: number, vi: number) {
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, variants: (st.variants || []).filter((_, j) => j !== vi) } : st)));
  }
  function toggleDay(v: number) {
    setDays((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }

  async function generate(type: "guidelines" | "sequence") {
    type === "guidelines" ? setGenGuidelines(true) : setGenSequence(true);
    setMsg(null);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, productIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (type === "guidelines" && data.guidelines) update({ guidelines: data.guidelines });
      if (type === "sequence" && Array.isArray(data.steps) && data.steps.length) {
        setSteps(data.steps);
        update({ sequenceMode: "STATIC" });
      }
      setMsg({ text: "Generated with AI ✨", type: "success" });
    } catch (e: any) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setGenGuidelines(false);
      setGenSequence(false);
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduleDays: Array.from(days).sort().join(","),
          steps: steps.map((s, i) => ({
            waitDays: i === 0 ? 0 : Number(s.waitDays) || 0,
            subject: s.subject || undefined,
            body: s.body || undefined,
            variants: (s.variants || []).filter((v) => v.subject || v.body).map((v) => ({ subject: v.subject || undefined, body: v.body || undefined })),
          })),
          productIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.[0]?.message || data.error || "Save failed");
      setMsg({ text: "Settings saved", type: "success" });
      onSaved?.();
    } catch (e: any) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-md text-sm ${msg.type === "success" ? "bg-success-500/10 text-success-600" : "bg-error-500/10 text-error-600"}`}>{msg.text}</div>
      )}

      {/* Guidelines */}
      <section className="bg-background border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-brand-500" /> AI Guidelines</h3>
          <Button variant="outline" size="sm" onClick={() => generate("guidelines")} disabled={genGuidelines}>
            {genGuidelines ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />} Generate
          </Button>
        </div>
        <textarea
          className="w-full min-h-[110px] rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={form.guidelines}
          onChange={(e) => update({ guidelines: e.target.value })}
          placeholder="Tone, length, personalization rules, what to avoid, CTA…"
        />
      </section>

      {/* Sequence */}
      <section className="bg-background border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-brand-500" /> Sequence</h3>
          <div className="flex items-center gap-2">
            <select value={form.sequenceMode} onChange={(e) => update({ sequenceMode: e.target.value })} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
              <option value="AI_GENERATED">AI per-prospect</option>
              <option value="STATIC">Static templates</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => generate("sequence")} disabled={genSequence}>
              {genSequence ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />} Generate
            </Button>
          </div>
        </div>
        <p className="text-xs text-foreground-muted">
          {form.sequenceMode === "AI_GENERATED"
            ? "Each step's content is AI-written per prospect; set the wait (in days) between steps. Use Generate to also pre-write templates."
            : "Static templates with {{firstName}}, {{companyName}}, {{jobTitle}} variables."}
          {" "}Sending stops automatically when a prospect replies.
        </p>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{i === 0 ? "Step 1 — first email" : `Step ${i + 1} — follow-up`}</span>
                <div className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-xs text-foreground-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" /> wait
                      <input type="number" min={0} value={step.waitDays} onChange={(e) => updateStep(i, { waitDays: parseInt(e.target.value) || 0 })} className="w-14 h-7 rounded border border-border bg-background px-1.5 text-xs" /> days
                    </span>
                  )}
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="text-error-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
              {(form.sequenceMode === "STATIC" || step.subject || step.body) && (
                <>
                  <div className="space-y-2">
                    {(step.variants && step.variants.length > 0) && <span className="text-[11px] font-medium text-foreground-muted">Variant A</span>}
                    <Input value={step.subject || ""} onChange={(e) => updateStep(i, { subject: e.target.value })} placeholder="Subject (e.g. Quick idea for {{companyName}})" className="h-9" />
                    <textarea value={step.body || ""} onChange={(e) => updateStep(i, { body: e.target.value })} placeholder="Email body…" className="w-full min-h-[90px] rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </div>

                  {(step.variants || []).map((v, vi) => (
                    <div key={vi} className="space-y-2 border-l-2 border-brand-200 pl-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-foreground-muted">Variant {String.fromCharCode(66 + vi)}</span>
                        <button type="button" onClick={() => removeVariant(i, vi)} className="text-error-600"><Trash2 className="h-3 w-3" /></button>
                      </div>
                      <Input value={v.subject || ""} onChange={(e) => updateVariant(i, vi, { subject: e.target.value })} placeholder="Subject (variant)" className="h-9" />
                      <textarea value={v.body || ""} onChange={(e) => updateVariant(i, vi, { body: e.target.value })} placeholder="Email body (variant)…" className="w-full min-h-[90px] rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                  ))}

                  <button type="button" onClick={() => addVariant(i)} className="text-xs text-brand-600 hover:underline">
                    + Add A/B variant
                  </button>
                </>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addStep}><Plus className="h-3.5 w-3.5 mr-1" /> Add follow-up</Button>
        </div>
      </section>

      {/* Sending cadence + limits */}
      <section className="bg-background border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-brand-500" /> Sending cadence & limits</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Daily limit</Label>
            <Input type="number" min={1} value={form.dailyEmailLimit} onChange={(e) => update({ dailyEmailLimit: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Min gap (min)</Label>
            <Input type="number" min={0} value={form.minIntervalMinutes} onChange={(e) => update({ minIntervalMinutes: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Max gap (min)</Label>
            <Input type="number" min={0} value={form.maxIntervalMinutes} onChange={(e) => update({ maxIntervalMinutes: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Random delay (≤10)</Label>
            <Input type="number" min={0} max={10} value={form.randomDelayMax} onChange={(e) => update({ randomDelayMax: Math.min(10, parseInt(e.target.value) || 0) })} />
          </div>
        </div>

        <div className="flex flex-col space-y-1.5 pt-4 border-t border-border">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeUnsubscribe"
              checked={form.includeUnsubscribe}
              onChange={(e) => update({ includeUnsubscribe: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <Label htmlFor="includeUnsubscribe" className="text-sm font-medium leading-none cursor-pointer">
              Include "Unsubscribe" buttons &amp; headers in campaign emails
            </Label>
          </div>
          <p className="text-xs text-foreground-muted pl-6">
            Highly recommended for marketing/sales campaigns. Turn off only for 1:1 outreach like job applications and resumes, as bulk sending without unsubscribe headers violates provider rules.
          </p>
        </div>
      </section>

      {/* Schedule */}
      <section className="bg-background border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-brand-500" /> Schedule (UTC)</h3>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button key={d.v} onClick={() => toggleDay(d.v)} className={`text-xs px-3 py-1.5 rounded-full border ${days.has(d.v) ? "bg-brand-500 text-white border-brand-500" : "border-border text-foreground-muted"}`}>{d.l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Start hour</Label>
            <Input type="number" min={0} max={23} value={form.scheduleStartHour} onChange={(e) => update({ scheduleStartHour: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>End hour</Label>
            <Input type="number" min={0} max={23} value={form.scheduleEndHour} onChange={(e) => update({ scheduleEndHour: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone label</Label>
            <Input value={form.scheduleTimezone} onChange={(e) => update({ scheduleTimezone: e.target.value })} placeholder="UTC" />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save settings
        </Button>
      </div>
    </div>
  );
}
