"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserPlus, Database, Globe, Layers } from "lucide-react";
import { IcpFilterBuilder, emptyIcpFilters, type IcpFilters } from "@/components/shared/icp-filter";

interface Found {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
}

export default function FinderPage() {
  const [filters, setFilters] = useState<IcpFilters>({ ...emptyIcpFilters });
  const [source, setSource] = useState<"database" | "global" | "apollo">("global");
  const [apolloConfigured, setApolloConfigured] = useState(false);
  const [databaseSize, setDatabaseSize] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Found[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);

  const [lists, setLists] = useState<any[]>([]);
  const [targetList, setTargetList] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/prospect-lists")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setLists(data);
        if (data.length) setTargetList(data[0].id);
      })
      .catch(() => {});
  }, []);

  async function runSearch() {
    setSearching(true);
    setMessage(null);
    setSearched(true);
    try {
      const res = await fetch("/api/prospects/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setApolloConfigured(Boolean(data.apolloConfigured));
      if (typeof data.databaseSize === "number") setDatabaseSize(data.databaseSize);
      setResults(data.results || []);
      setSelected(new Set());
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((r) => r.email)));
  }

  async function importSelected() {
    if (!targetList || selected.size === 0) return;
    setImporting(true);
    setMessage(null);
    try {
      const chosen = results.filter((r) => selected.has(r.email));
      const res = await fetch("/api/prospects/find", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: targetList, prospects: chosen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setMessage({ text: `Imported ${data.imported} prospects into the list.`, type: "success" });
      setSelected(new Set());
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Find Leads — Super Search</h1>
        <p className="text-foreground-muted mt-1 text-sm">
          Build an Instantly / Apollo-style filter and pull matching prospects into a list.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-success-500/10 text-success-600" : "bg-error-500/10 text-error-600"}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-xl border border-border bg-background shadow-sm p-6 space-y-6">
        <IcpFilterBuilder value={filters} onChange={setFilters} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSource("global")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${source === "global" ? "bg-brand-50 border-brand-200 text-brand-700" : "border-border text-foreground-muted"}`}
            >
              <Layers className="h-3.5 w-3.5" /> Leads Database{databaseSize !== null ? ` (${databaseSize.toLocaleString()})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setSource("database")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${source === "database" ? "bg-brand-50 border-brand-200 text-brand-700" : "border-border text-foreground-muted"}`}
            >
              <Database className="h-3.5 w-3.5" /> My Prospects
            </button>
            <button
              type="button"
              onClick={() => setSource("apollo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${source === "apollo" ? "bg-brand-50 border-brand-200 text-brand-700" : "border-border text-foreground-muted"}`}
            >
              <Globe className="h-3.5 w-3.5" /> Apollo.io {apolloConfigured ? "" : "(needs API key)"}
            </button>
          </div>
          <Button onClick={runSearch} disabled={searching}>
            {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </div>

      {searched && (
        <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
            <p className="text-sm font-medium text-foreground">
              {searching ? "Searching..." : `${results.length} prospects found`}
            </p>
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  title="Target list"
                  value={targetList}
                  onChange={(e) => setTargetList(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                >
                  {lists.length === 0 ? <option value="">No lists — create one first</option> : lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <Button size="sm" disabled={importing || selected.size === 0 || !targetList} onClick={importSelected}>
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Add {selected.size > 0 ? `${selected.size} ` : ""}to list
                </Button>
              </div>
            )}
          </div>

          {searching ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
          ) : results.length === 0 ? (
            <div className="p-10 text-center text-sm text-foreground-muted">
              No matches. {source === "apollo" && !apolloConfigured ? "Set APOLLO_API_KEY to enable live Apollo search, or " : ""}
              try broader filters or import a CSV under Prospects.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-background-tertiary border-b border-border text-foreground-muted font-medium">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={selected.size === results.length && results.length > 0} onChange={toggleAll} />
                    </th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, idx) => (
                    <tr key={r.email || idx} className="hover:bg-background-tertiary/50">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={selected.has(r.email)} onChange={() => toggle(r.email)} />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {`${r.firstName || ""} ${r.lastName || ""}`.trim() || "—"}
                        <div className="text-xs font-normal text-foreground-muted">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground-muted">{r.jobTitle || "—"}</td>
                      <td className="px-4 py-3 text-foreground-muted">{r.companyName || "—"}</td>
                      <td className="px-4 py-3 text-foreground-muted">{r.location || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
