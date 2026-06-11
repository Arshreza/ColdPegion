"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Ban,
  Loader2,
  Search,
  Trash2,
  Upload,
  Globe,
  Mail,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Entry {
  id: string;
  value: string;
  reason: string | null;
  createdAt: string;
}

interface AddResult {
  added: number;
  duplicates: number;
  invalid: number;
  prospectsBlocked: number;
}

export default function SuppressionPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pasteValue, setPasteValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AddResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppressions?page=${p}&search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setTotal(data.total);
        setPageSize(data.pageSize);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(page, search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [page, search, load]);

  async function handleResponse(res: Response) {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error && typeof data.error === "string" ? data.error : "Something went wrong.");
      return;
    }
    setResult(data);
    setPasteValue("");
    setPage(1);
    load(1, search);
  }

  async function addPasted() {
    const values = pasteValue.split(/[\r\n;,]+/).map((v) => v.trim()).filter(Boolean);
    if (values.length === 0) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/suppressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      await handleResponse(res);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadFile(file: File) {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/suppressions", { method: "POST", body: formData });
      await handleResponse(res);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function remove(entry: Entry) {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setTotal((t) => Math.max(0, t - 1));
    try {
      await fetch(`/api/suppressions?id=${entry.id}`, { method: "DELETE" });
    } catch {
      load(page, search);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ban className="h-6 w-6 text-error-500" /> Suppression List
        </h1>
        <p className="text-sm text-foreground-muted mt-1 max-w-2xl">
          Addresses and domains here are <span className="font-medium">never emailed</span> by any
          campaign — even if they get imported as prospects later. Use it for unsubscribes from
          previous tools, legal opt-outs, existing customers and competitors.
        </p>
      </div>

      <div className="bg-background border border-border rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Add emails or domains</h2>
        <textarea
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          placeholder={"jane@acme.com\ncompetitor.com\n@agency.io"}
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-foreground-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={addPasted} disabled={submitting || !pasteValue.trim()}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
            Suppress
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={submitting}>
            <Upload className="h-4 w-4 mr-2" /> Upload CSV / TXT
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
          />
          <span className="text-xs text-foreground-muted">
            One entry per line or comma-separated. Whole domains like <code>acme.com</code> block every address at that company.
          </span>
        </div>

        {result && (
          <div className="flex items-start gap-2 rounded-md bg-success-500/10 border border-success-500/20 px-3 py-2 text-sm text-success-600">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Added {result.added} {result.added === 1 ? "entry" : "entries"}
              {result.duplicates > 0 && ` · ${result.duplicates} already on the list`}
              {result.invalid > 0 && ` · ${result.invalid} invalid skipped`}
              {result.prospectsBlocked > 0 && ` · ${result.prospectsBlocked} existing prospects marked do-not-contact`}
            </span>
          </div>
        )}
        {error && (
          <div className="rounded-md bg-error-500/10 border border-error-500/20 px-3 py-2 text-sm text-error-600">
            {error}
          </div>
        )}
      </div>

      <div className="bg-background border border-border rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search suppressed emails/domains..."
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <span className="text-sm text-foreground-muted whitespace-nowrap">
            {total} {total === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-foreground-muted">
            {search ? "No entries match your search." : "Your suppression list is empty."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const isDomain = entry.value.startsWith("@");
                return (
                  <tr key={entry.id} className="hover:bg-background-secondary/50">
                    <td className="px-4 py-3 font-mono text-foreground">{entry.value}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-background-secondary px-2 py-1 text-xs text-foreground-muted">
                        {isDomain ? <Globe className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                        {isDomain ? "Whole domain" : "Email"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted capitalize">{entry.reason || "—"}</td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => remove(entry)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-foreground-muted">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
