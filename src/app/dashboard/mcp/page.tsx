"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plug, Plus, Trash2, Copy, Check, KeyRound, ShieldAlert } from "lucide-react";

export default function McpPage() {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/tokens");
    if (res.ok) setTokens((await res.json()).tokens || []);
    setLoading(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setNewToken(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Claude connector" }),
      });
      const d = await res.json();
      if (res.ok) {
        setNewToken(d.token);
        setName("");
        load();
      }
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this token? Any Claude connector using it will stop working.")) return;
    await fetch(`/api/tokens?id=${id}`, { method: "DELETE" });
    load();
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const mcpUrl = `${origin}/api/mcp`;
  const desktopConfig = `{
  "mcpServers": {
    "coldpegion": {
      "url": "${mcpUrl}",
      "headers": { "Authorization": "Bearer ${newToken || "YOUR_TOKEN"}" }
    }
  }
}`;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-500/10 rounded-lg"><Plug className="h-5 w-5 text-brand-600" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Connect to Claude (MCP)</h1>
          <p className="text-foreground-muted text-sm">
            Drive your entire ColdPegion account from Claude — mine leads, write sequences, and launch campaigns
            using your own Claude subscription.
          </p>
        </div>
      </div>

      {/* Step 1 — token */}
      <section className="rounded-xl border border-border bg-background shadow-sm">
        <div className="border-b border-border p-4 flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4 text-brand-500" /> 1. Create an access token
        </div>
        <form onSubmit={create} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="tname">Token name</Label>
            <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Claude connector" />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Create token</>}
          </Button>
        </form>

        {newToken && (
          <div className="mx-4 mb-4 p-3 rounded-lg bg-warning-500/10 border border-warning-200">
            <p className="text-xs text-warning-700 flex items-center gap-1.5 mb-2"><ShieldAlert className="h-3.5 w-3.5" /> Copy this now — it won&apos;t be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background border border-border rounded px-2 py-1.5 break-all">{newToken}</code>
              <Button size="sm" variant="outline" onClick={() => copy(newToken, "tok")}>
                {copied === "tok" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}

        {!loading && tokens.length > 0 && (
          <div className="border-t border-border divide-y divide-border">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium">{t.name}</span>
                  <span className="text-foreground-muted ml-2 font-mono text-xs">{t.prefix}…</span>
                  <span className="text-foreground-muted ml-2 text-xs">{t.lastUsedAt ? `last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : "never used"}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-error-600" onClick={() => revoke(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Step 2 — connect */}
      <section className="rounded-xl border border-border bg-background shadow-sm">
        <div className="border-b border-border p-4 font-semibold">2. Add the connector in Claude</div>
        <div className="p-4 space-y-4 text-sm">
          <div>
            <p className="text-foreground-secondary mb-1.5">MCP server URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background-tertiary border border-border rounded px-2 py-1.5">{mcpUrl}</code>
              <Button size="sm" variant="outline" onClick={() => copy(mcpUrl, "url")}>
                {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-foreground-secondary mb-1.5">Claude Desktop — add to <code>claude_desktop_config.json</code>:</p>
            <div className="relative">
              <pre className="text-xs bg-background-tertiary border border-border rounded p-3 overflow-x-auto">{desktopConfig}</pre>
              <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => copy(desktopConfig, "cfg")}>
                {copied === "cfg" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <p className="text-xs text-foreground-muted">
            On claude.ai, use <strong>Settings → Connectors → Add custom connector</strong> and paste just the URL above —
            it supports <strong>one-click OAuth sign-in</strong>, so no token is needed there (the token above is for
            Claude Desktop / header-based clients).
          </p>
          <div className="rounded-lg border border-border bg-background-tertiary/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground-secondary">Marketing at scale — zero platform tokens:</p>
            <p className="text-foreground-muted">
              Ask your Claude to <em>&quot;mine 500 SaaS VPs of Sales, <code>import_leads</code> into a list, create an
              agent, then <code>prepare_emails</code> with a unique email for each lead, and launch.&quot;</em>
            </p>
            <p className="text-foreground-muted">
              Claude writes every email on <strong>your</strong> Claude plan; ColdPegion just sends them — no platform LLM,
              no API key needed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
