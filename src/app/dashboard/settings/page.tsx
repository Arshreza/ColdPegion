"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Server, Settings as SettingsIcon, Save, ShieldCheck } from "lucide-react";

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


