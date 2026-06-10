"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Trash2, Pencil, Check, X, ChevronDown, ChevronRight } from "lucide-react";

interface Item {
  id: string;
  step: number;
  subject: string;
  body: string;
  status: "PENDING" | "SENT";
  prospect: { name: string; email: string; company?: string | null };
}

export function PreparedEmails({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, sent: 0 });
  const [mode, setMode] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string }>({ subject: "", body: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/prepared`);
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
        setCounts(d.counts || { total: 0, pending: 0, sent: 0 });
        setMode(d.sequenceMode || "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [agentId]);

  function startEdit(it: Item) {
    setEditing(it.id);
    setExpanded(it.id);
    setDraft({ subject: it.subject, body: it.body });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/prepared/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...draft } : i)));
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this prepared email?")) return;
    const res = await fetch(`/api/prepared/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setCounts((c) => ({ ...c, total: c.total - 1, pending: Math.max(0, c.pending - 1) }));
    }
  }

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;
  }

  if (counts.total === 0) {
    return (
      <div className="text-center py-10 text-sm text-foreground-muted">
        <Mail className="mx-auto h-8 w-8 opacity-50 mb-2" />
        No prepared emails yet. Have Claude push per-lead emails over MCP with <code>prepare_emails</code>, then review them here before launching.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium text-foreground">{counts.total} prepared</span>
        <span className="text-success-600">{counts.sent} sent</span>
        <span className="text-warning-600">{counts.pending} pending</span>
        {mode === "EXTERNAL" && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600">EXTERNAL mode</span>}
      </div>

      <div className="border border-border rounded-lg divide-y divide-border max-h-[520px] overflow-y-auto">
        {items.map((it) => (
          <div key={it.id} className="text-sm">
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-background-tertiary/50">
              <button onClick={() => setExpanded(expanded === it.id ? null : it.id)} className="text-foreground-muted">
                {expanded === it.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-border text-foreground-secondary shrink-0">Step {it.step + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{it.subject}</p>
                <p className="text-xs text-foreground-muted truncate">{it.prospect.name} · {it.prospect.email}{it.prospect.company ? ` · ${it.prospect.company}` : ""}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${it.status === "SENT" ? "bg-success-500/10 text-success-600" : "bg-warning-500/10 text-warning-600"}`}>{it.status}</span>
              {it.status === "PENDING" && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(it)} className="text-foreground-muted hover:text-foreground p-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(it.id)} className="text-error-600 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>

            {expanded === it.id && (
              <div className="px-3 pb-3 pt-1 bg-background-tertiary/30">
                {editing === it.id ? (
                  <div className="space-y-2">
                    <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className="h-8" placeholder="Subject" />
                    <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(it.id)} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />} Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground-secondary">{it.body}</pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
