"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, Search, UserPlus, Database, Globe,
  Layers, Zap, Sparkles, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { IcpFilterBuilder, emptyIcpFilters, type IcpFilters } from "@/components/shared/icp-filter";
import { useEffect } from "react";

interface Found {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  seniority?: string;
  department?: string;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
  source?: string;
  phone?: string;
  website?: string;
}

function hasActiveFilters(f: IcpFilters) {
  return (
    f.jobTitles.length + f.seniorities.length + f.departments.length +
    f.industries.length + f.locations.length + f.headcount.length +
    f.keywords.length + f.technologies.length > 0
  );
}

export default function FinderPage() {
  const [query, setQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const [filters, setFilters] = useState<IcpFilters>({ ...emptyIcpFilters });
  const [source, setSource] = useState<"database" | "global" | "apollo" | "instantly">("global");
  const [apolloConfigured, setApolloConfigured] = useState(false);
  const [instantlyConfigured, setInstantlyConfigured] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [databaseSize, setDatabaseSize] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Found[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);

  const [lists, setLists] = useState<any[]>([]);
  const [targetList, setTargetList] = useState("");
  const [importing, setImporting] = useState(false);
  const [enrichLimit, setEnrichLimit] = useState(50);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const isInstantly = source === "instantly";
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/prospect-lists")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setLists(data);
        if (data.length) setTargetList(data[0].id);
      })
      .catch(() => {});
  }, []);

  async function runAiParse() {
    const q = query.trim();
    if (!q) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/prospects/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI parse failed");
      setFilters({ ...emptyIcpFilters, ...data.filters });
      setShowFilters(true);
      // Auto-run search after parsing
      await runSearch({ ...emptyIcpFilters, ...data.filters });
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function runSearch(overrideFilters?: IcpFilters) {
    setSearching(true);
    setMessage(null);
    setSearched(true);
    try {
      const res = await fetch("/api/prospects/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: overrideFilters ?? filters, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      if (data.apolloConfigured !== undefined) setApolloConfigured(Boolean(data.apolloConfigured));
      if (data.instantlyConfigured !== undefined) setInstantlyConfigured(Boolean(data.instantlyConfigured));
      if (typeof data.databaseSize === "number") setDatabaseSize(data.databaseSize);
      setTotalCount(typeof data.totalCount === "number" ? data.totalCount : null);
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
      if (next.has(email)) next.delete(email); else next.add(email);
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

  async function importFromInstantly() {
    if (!targetList || enrichLimit < 1) return;
    setImporting(true);
    setMessage(null);
    try {
      const startRes = await fetch("/api/prospects/instantly-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, limit: enrichLimit, listId: targetList }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || "Failed to start Instantly import");

      const poll = `/api/prospects/instantly-import?resourceId=${encodeURIComponent(startData.resourceId)}&listId=${encodeURIComponent(targetList)}`;
      for (let attempt = 0; attempt < 100; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const res = await fetch(poll);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Instantly import failed");
        if (data.status === "complete") {
          setMessage({
            text: data.imported > 0
              ? `Imported ${data.imported} enriched prospects (with emails) into the list.`
              : "Enrichment finished but returned no leads with emails — try broader filters.",
            type: data.imported > 0 ? "success" : "error",
          });
          return;
        }
      }
      throw new Error("Enrichment is taking longer than expected — re-run the import in a few minutes.");
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setImporting(false);
    }
  }

  const activeFilterCount = (
    filters.jobTitles.length + filters.seniorities.length + filters.departments.length +
    filters.industries.length + filters.locations.length + filters.headcount.length +
    filters.keywords.length + filters.technologies.length
  );

  return (
    <div className="space-y-5 max-w-6xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Find Leads</h1>
        <p className="text-foreground-muted mt-1 text-sm">
          Search your leads database or use AI to describe who you&apos;re looking for.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm flex items-start justify-between gap-3 ${message.type === "success" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="shrink-0 mt-0.5"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* AI Search Bar */}
      <div className="rounded-xl border border-brand-500/30 bg-gradient-to-r from-brand-500/5 to-accent-500/5 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-semibold text-foreground">AI Search</span>
          <span className="text-xs text-foreground-muted">— describe who you want in plain English</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && runAiParse()}
              placeholder='e.g. "HR managers at software companies in India" or "CTOs at startups with 11-50 employees"'
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          <Button onClick={runAiParse} disabled={aiLoading || !query.trim()} className="shrink-0">
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">{aiLoading ? "Searching…" : "AI Search"}</span>
          </Button>
        </div>
        {aiError && (
          <p className="mt-2 text-xs text-red-500">{aiError}</p>
        )}
      </div>

      {/* Filter Builder */}
      <div className="rounded-xl border border-border bg-background shadow-sm">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowFilters(!showFilters)}
          onKeyDown={(e) => e.key === "Enter" && setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-background-tertiary/50 transition-colors rounded-t-xl cursor-pointer select-none"
        >
          <span className="flex items-center gap-2">
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFilters({ ...emptyIcpFilters }); }}
                className="text-xs text-foreground-muted hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            )}
            {showFilters ? <ChevronUp className="h-4 w-4 text-foreground-muted" /> : <ChevronDown className="h-4 w-4 text-foreground-muted" />}
          </div>
        </div>

        {showFilters && (
          <div className="px-5 pb-5 pt-1 space-y-6 border-t border-border">
            <IcpFilterBuilder value={filters} onChange={setFilters} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border pt-4">
              {/* Source selector */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "global" as const, label: "Leads Database", icon: Layers, suffix: databaseSize !== null ? ` (${databaseSize.toLocaleString()})` : "" },
                  { key: "database" as const, label: "My Prospects", icon: Database, suffix: "" },
                  { key: "apollo" as const, label: "Apollo.io", icon: Globe, suffix: apolloConfigured ? "" : " (needs API key)" },
                  { key: "instantly" as const, label: "Instantly", icon: Zap, suffix: instantlyConfigured ? "" : " (needs API key)" },
                ].map(({ key, label, icon: Icon, suffix }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSource(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${
                      source === key
                        ? "bg-brand-500/10 border-brand-500/40 text-brand-600 dark:text-brand-400 font-medium"
                        : "border-border text-foreground-muted hover:border-brand-300"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}{suffix}
                  </button>
                ))}
              </div>
              <Button onClick={() => runSearch()} disabled={searching}>
                {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {searched && (
        <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
            <p className="text-sm font-medium text-foreground">
              {searching
                ? "Searching…"
                : isInstantly && totalCount !== null
                  ? `${totalCount.toLocaleString()} matches — previewing ${results.length} (emails revealed on import)`
                  : results.length === 0
                    ? "No matches found"
                    : `${results.length} prospect${results.length !== 1 ? "s" : ""} found`}
            </p>
            {results.length > 0 && !searching && (
              <div className="flex items-center gap-2">
                <select
                  title="Target list"
                  value={targetList}
                  onChange={(e) => setTargetList(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                >
                  {lists.length === 0
                    ? <option value="">No lists — create one first</option>
                    : lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {isInstantly ? (
                  <>
                    <input
                      type="number"
                      title="How many leads to enrich and import"
                      min={1} max={1000}
                      value={enrichLimit}
                      onChange={(e) => setEnrichLimit(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                      className="h-9 w-20 rounded-md border border-border bg-background px-2 text-sm"
                    />
                    <Button size="sm" disabled={importing || !targetList} onClick={importFromInstantly}>
                      {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                      {importing ? "Enriching…" : `Import ${enrichLimit} with emails`}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" disabled={importing || selected.size === 0 || !targetList} onClick={importSelected}>
                    {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {selected.size > 0 ? `Add ${selected.size} to list` : "Select leads to add"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {!searching && isInstantly && results.length > 0 && (
            <p className="px-4 py-2 text-xs text-foreground-muted border-b border-border bg-background-tertiary/40">
              Importing runs an Instantly SuperSearch enrichment — 1 credit per lead, verified work emails included.
            </p>
          )}

          {searching ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Search className="h-8 w-8 text-foreground-muted/30 mx-auto" />
              <p className="text-sm font-medium text-foreground">No matches</p>
              <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                {source === "global"
                  ? "Try broader filters — or switch to My Prospects if you've imported leads."
                  : source === "apollo" && !apolloConfigured
                    ? "Connect your Apollo API key in Settings → Integrations."
                    : source === "instantly" && !instantlyConfigured
                      ? "Connect your Instantly API key in Settings → Integrations."
                      : "Try removing some filters or use broader terms."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-background-tertiary border-b border-border text-foreground-muted font-medium text-xs uppercase tracking-wide">
                  <tr>
                    {!isInstantly && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand-600"
                          checked={selected.size === results.length && results.length > 0}
                          onChange={toggleAll}
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Title / Dept</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Industry</th>
                    <th className="px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, idx) => (
                    <tr
                      key={r.email || idx}
                      className={`hover:bg-background-tertiary/50 transition-colors ${!isInstantly && selected.has(r.email) ? "bg-brand-500/5" : ""}`}
                      onClick={() => !isInstantly && toggle(r.email)}
                    >
                      {!isInstantly && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand-600"
                            checked={selected.has(r.email)}
                            onChange={() => toggle(r.email)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {`${r.firstName || ""} ${r.lastName || ""}`.trim() || "—"}
                        </div>
                        <div className={`text-xs text-foreground-muted ${!r.email && isInstantly ? "italic" : ""}`}>
                          {r.email || (isInstantly ? "revealed on import" : "—")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground-secondary">{r.jobTitle || "—"}</div>
                        {(r.seniority || r.department) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {r.seniority && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-background-tertiary text-foreground-muted">
                                {r.seniority}
                              </span>
                            )}
                            {r.department && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-brand-500/10 text-brand-600 dark:text-brand-400">
                                {r.department}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">{r.companyName || "—"}</td>
                      <td className="px-4 py-3 text-foreground-secondary">{r.industry || "—"}</td>
                      <td className="px-4 py-3 text-foreground-secondary">{r.location || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!searching && results.length > 0 && !isInstantly && (
            <div className="px-4 py-3 border-t border-border bg-background-tertiary/30 flex items-center justify-between text-xs text-foreground-muted">
              <span>
                {selected.size > 0
                  ? `${selected.size} of ${results.length} selected`
                  : `${results.length} results — click a row or use checkboxes to select`}
              </span>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="hover:text-foreground transition-colors">
                  Clear selection
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
