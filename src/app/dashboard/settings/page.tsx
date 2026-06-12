"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Server, Settings as SettingsIcon, Save, ShieldCheck, Plug } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingLlm, setSavingLlm] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingZb, setSavingZb] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [llmConfig, setLlmConfig] = useState({
    apiBaseUrl: "https://api.openai.com/v1",
    apiKey: "",
    modelName: "gpt-4o",
    hasKey: false,
  });

  const [globalSettings, setGlobalSettings] = useState({
    dailyEmailLimit: 500,
    verifyOnImport: false,
  });

  const [zbSettings, setZbSettings] = useState({
    apiKey: "",
    hasKey: false,
  });

  const [apolloSettings, setApolloSettings] = useState({
    apiKey: "",
    hasKey: false,
  });
  const [savingApollo, setSavingApollo] = useState(false);

  const [instantlySettings, setInstantlySettings] = useState({
    apiKey: "",
    hasKey: false,
  });
  const [savingInstantly, setSavingInstantly] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [llmRes, settingsRes] = await Promise.all([
          fetch("/api/settings/llm"),
          fetch("/api/settings"),
        ]);

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          if (llmData) {
            setLlmConfig({
              apiBaseUrl: llmData.apiBaseUrl || "https://api.openai.com/v1",
              apiKey: llmData.hasKey ? "••••••••••••••••••••••••" : "",
              modelName: llmData.modelName || "gpt-4o",
              hasKey: llmData.hasKey,
            });
          }
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData) {
            setGlobalSettings({
              dailyEmailLimit: settingsData.dailyEmailLimit || 500,
              verifyOnImport: settingsData.verifyOnImport || false,
            });
            setZbSettings({
              apiKey: settingsData.hasZeroBounceKey ? "••••••••••••••••" : "",
              hasKey: settingsData.hasZeroBounceKey || false,
            });
            setApolloSettings({
              apiKey: settingsData.hasApolloKey ? "••••••••••••••••" : "",
              hasKey: settingsData.hasApolloKey || false,
            });
            setInstantlySettings({
              apiKey: settingsData.hasInstantlyKey ? "••••••••••••••••" : "",
              hasKey: settingsData.hasInstantlyKey || false,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleLlmSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingLlm(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(llmConfig),
      });
      if (!res.ok) throw new Error("Failed to save LLM config");
      const data = await res.json();
      setLlmConfig(prev => ({
        ...prev,
        hasKey: data.hasKey,
        apiKey: data.hasKey ? "••••••••••••••••••••••••" : prev.apiKey,
      }));
      setMessage({ text: "LLM configuration saved successfully", type: "success" });
    } catch (error) {
      setMessage({ text: "Failed to save LLM configuration", type: "error" });
    } finally {
      setSavingLlm(false);
    }
  }

  async function handleGlobalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingGlobal(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyEmailLimit: globalSettings.dailyEmailLimit, verifyOnImport: globalSettings.verifyOnImport }),
      });
      if (!res.ok) throw new Error("Failed to save Global Settings");
      setMessage({ text: "Global settings saved successfully", type: "success" });
    } catch (error) {
      setMessage({ text: "Failed to save Global settings", type: "error" });
    } finally {
      setSavingGlobal(false);
    }
  }

  async function handleZbSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingZb(true);
    setMessage(null);
    try {
      // Only send if it's not the masked placeholder
      const keyToSend = zbSettings.apiKey === "••••••••••••••••" ? undefined : zbSettings.apiKey || null;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zeroBounceApiKey: keyToSend }),
      });
      if (!res.ok) throw new Error("Failed to save ZeroBounce settings");
      const data = await res.json();
      setZbSettings({ apiKey: data.hasZeroBounceKey ? "••••••••••••••••" : "", hasKey: data.hasZeroBounceKey });
      setMessage({ text: "ZeroBounce configuration saved", type: "success" });
    } catch (error) {
      setMessage({ text: "Failed to save ZeroBounce config", type: "error" });
    } finally {
      setSavingZb(false);
    }
  }

  async function handleApolloSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingApollo(true);
    setMessage(null);
    try {
      const keyToSend = apolloSettings.apiKey === "••••••••••••••••" ? undefined : apolloSettings.apiKey || null;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apolloApiKey: keyToSend }),
      });
      if (!res.ok) throw new Error("Failed to save Apollo settings");
      const data = await res.json();
      setApolloSettings({ apiKey: data.hasApolloKey ? "••••••••••••••••" : "", hasKey: data.hasApolloKey });
      setMessage({ text: "Apollo API key saved", type: "success" });
    } catch {
      setMessage({ text: "Failed to save Apollo API key", type: "error" });
    } finally {
      setSavingApollo(false);
    }
  }

  async function handleInstantlySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingInstantly(true);
    setMessage(null);
    try {
      const keyToSend = instantlySettings.apiKey === "••••••••••••••••" ? undefined : instantlySettings.apiKey || null;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instantlyApiKey: keyToSend }),
      });
      if (!res.ok) throw new Error("Failed to save Instantly settings");
      const data = await res.json();
      setInstantlySettings({ apiKey: data.hasInstantlyKey ? "••••••••••••••••" : "", hasKey: data.hasInstantlyKey });
      setMessage({ text: "Instantly API key saved", type: "success" });
    } catch {
      setMessage({ text: "Failed to save Instantly API key", type: "error" });
    } finally {
      setSavingInstantly(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Settings</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === "success" ? "bg-success-500/10 text-success-600" : "bg-error-500/10 text-error-600"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6">
        {/* LLM Configuration */}
        <div className="rounded-xl border border-border bg-background shadow-sm" id="onboarding-llm-config">
          <div className="border-b border-border p-6 flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <Server className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">LLM Connection</h2>
              <p className="text-sm text-foreground-muted">Configure your OpenAI (or compatible API) for generating emails.</p>
            </div>
          </div>
          <form onSubmit={handleLlmSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">API Base URL</Label>
                <Input id="apiBaseUrl" value={llmConfig.apiBaseUrl} onChange={(e) => setLlmConfig({ ...llmConfig, apiBaseUrl: e.target.value })} placeholder="https://api.openai.com/v1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelName">Model Name</Label>
                <Input id="modelName" value={llmConfig.modelName} onChange={(e) => setLlmConfig({ ...llmConfig, modelName: e.target.value })} placeholder="gpt-4o" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (Stored encrypted using AES-256)</Label>
              <Input id="apiKey" type="password" value={llmConfig.apiKey} onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })} placeholder={llmConfig.hasKey ? "Key configured. Enter new key to replace." : "sk-..."} required={!llmConfig.hasKey} />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingLlm}>
                {savingLlm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save LLM Config
              </Button>
            </div>
          </form>
        </div>

        {/* Email Verification — ZeroBounce */}
        <div className="rounded-xl border border-border bg-background shadow-sm">
          <div className="border-b border-border p-6 flex items-center gap-3">
            <div className="p-2 bg-success-500/10 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Email Verification (ZeroBounce)</h2>
              <p className="text-sm text-foreground-muted">
                Protect your sender reputation. Add a ZeroBounce API key to use premium verification, or leave blank to use our built-in SMTP + MX verification engine.
              </p>
            </div>
          </div>
          <form onSubmit={handleZbSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zbApiKey">ZeroBounce API Key (optional)</Label>
              <Input
                id="zbApiKey"
                type="password"
                value={zbSettings.apiKey}
                onChange={(e) => setZbSettings({ ...zbSettings, apiKey: e.target.value })}
                placeholder={zbSettings.hasKey ? "Key configured. Enter new key to replace." : "Leave blank to use in-house verification"}
              />
              <p className="text-xs text-foreground-muted">
                Get your API key at <a href="https://app.zerobounce.net/members/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">zerobounce.net</a>. The in-house engine works without any key using DNS + SMTP handshake verification.
              </p>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-border">
              <input
                type="checkbox"
                id="verifyOnImport"
                checked={globalSettings.verifyOnImport}
                onChange={(e) => setGlobalSettings({ ...globalSettings, verifyOnImport: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border accent-brand-600"
              />
              <div>
                <Label htmlFor="verifyOnImport" className="cursor-pointer">Auto-verify on CSV import (default)</Label>
                <p className="text-xs text-foreground-muted mt-1">
                  When enabled, the import dialog will have verification checked by default. Users can still override per-import.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingZb}>
                {savingZb ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Verification Config
              </Button>
            </div>
          </form>
        </div>

        {/* Integrations */}
        <div className="rounded-xl border border-border bg-background shadow-sm" id="integrations">
          <div className="border-b border-border p-6 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Plug className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
              <p className="text-sm text-foreground-muted">Connect Apollo.io for lead enrichment and Instantly for sending infrastructure.</p>
            </div>
          </div>

          {/* Apollo */}
          <div className="border-b border-border">
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground text-sm">Apollo.io</span>
                {apolloSettings.hasKey && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2 py-0.5 text-xs text-success-600 font-medium">Connected</span>
                )}
              </div>
              <p className="text-xs text-foreground-muted">Use your Apollo API key to enrich prospects and pull leads directly from Apollo&#39;s B2B database.</p>
            </div>
            <form onSubmit={handleApolloSubmit} className="px-6 pb-5 pt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="apolloApiKey">Apollo API Key</Label>
                <Input
                  id="apolloApiKey"
                  type="password"
                  value={apolloSettings.apiKey}
                  onChange={(e) => setApolloSettings({ ...apolloSettings, apiKey: e.target.value })}
                  placeholder={apolloSettings.hasKey ? "Key configured. Enter new key to replace." : "ap_..."}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={savingApollo} size="sm">
                  {savingApollo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Apollo Key
                </Button>
              </div>
            </form>
          </div>

          {/* Instantly */}
          <div>
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground text-sm">Instantly.ai</span>
                {instantlySettings.hasKey && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2 py-0.5 text-xs text-success-600 font-medium">Connected</span>
                )}
              </div>
              <p className="text-xs text-foreground-muted">Connect Instantly to use its sending infrastructure and warm-up pool alongside your MailPilot campaigns.</p>
            </div>
            <form onSubmit={handleInstantlySubmit} className="px-6 pb-5 pt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="instantlyApiKey">Instantly API Key</Label>
                <Input
                  id="instantlyApiKey"
                  type="password"
                  value={instantlySettings.apiKey}
                  onChange={(e) => setInstantlySettings({ ...instantlySettings, apiKey: e.target.value })}
                  placeholder={instantlySettings.hasKey ? "Key configured. Enter new key to replace." : "inst_..."}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={savingInstantly} size="sm">
                  {savingInstantly ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Instantly Key
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Global Limits */}
        <div className="rounded-xl border border-border bg-background shadow-sm">
          <div className="border-b border-border p-6 flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <SettingsIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Global Sending Limits</h2>
              <p className="text-sm text-foreground-muted">Set platform-wide safety rails for agent operations.</p>
            </div>
          </div>
          <form onSubmit={handleGlobalSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyLimit">Daily Email Limit (Across All Agents)</Label>
                <Input id="dailyLimit" type="number" min="1" max="10000" value={globalSettings.dailyEmailLimit} onChange={(e) => setGlobalSettings({ ...globalSettings, dailyEmailLimit: parseInt(e.target.value) || 500 })} required />
                <p className="text-xs text-foreground-muted">Hard cap. Agents pause automatically when this limit is reached.</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingGlobal}>
                {savingGlobal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Global Limits
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


