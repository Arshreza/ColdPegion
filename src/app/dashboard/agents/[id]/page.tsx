"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Pause, Bot, Mail, TrendingUp, MousePointerClick, AlertTriangle, Settings2, MailCheck } from "lucide-react";
import { AgentSettings } from "@/components/shared/agent-settings";
import { PreparedEmails } from "@/components/shared/prepared-emails";
import { Eye } from "lucide-react";

const PREVIEW_VARS: Record<string, string> = {
  firstName: "Alex",
  lastName: "Johnson",
  fullName: "Alex Johnson",
  email: "alex@example.com",
  company: "Acme Corp",
  companyName: "Acme Corp",
  jobTitle: "Head of Marketing",
  title: "Head of Marketing",
  location: "San Francisco",
  senderName: "You",
};

function substituteVars(text: string) {
  return text.replace(/\{(\w+)\}/g, (match, key) => PREVIEW_VARS[key] ?? `⚠️${match}`);
}

function SequencePreview({ agent }: { agent: any }) {
  const steps: any[] = (() => {
    try { return JSON.parse(agent.sequenceSteps || "[]") || []; }
    catch { return []; }
  })();

  const [active, setActive] = useState(0);

  if (steps.length === 0) {
    return (
      <p className="text-sm text-foreground-muted italic">
        No sequence steps saved yet. Use Configure → Sequence to add steps.
      </p>
    );
  }

  const step = steps[active];
  const subject = substituteVars(step.subject || "(AI-generated subject)");
  const body = substituteVars(step.body || "(AI-generated body — will be personalised per prospect)");
  const hasWarning = subject.includes("⚠️") || body.includes("⚠️");

  return (
    <div className="space-y-4">
      <p className="text-xs text-foreground-muted">
        Preview uses sample values: <strong>Alex Johnson @ Acme Corp</strong>. Variables wrapped in ⚠️ are unrecognised.
      </p>
      {/* Step tabs */}
      <div className="flex flex-wrap gap-2">
        {steps.map((_: any, i: number) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              active === i
                ? "bg-brand-500 text-white border-brand-500"
                : "border-border text-foreground-muted hover:border-brand-300"
            }`}
          >
            Step {i + 1}{steps[i].waitDays > 0 ? ` (day +${steps[i].waitDays})` : " (day 0)"}
          </button>
        ))}
      </div>
      {hasWarning && (
        <div className="flex items-center gap-2 text-xs text-warning-600 bg-warning-500/10 rounded-md px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Unrecognised variables detected — check your template for typos.
        </div>
      )}
      {/* Rendered preview */}
      <div className="rounded-lg border border-border bg-background-tertiary/50 overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-background-tertiary text-xs text-foreground-muted font-medium">
          Subject
        </div>
        <div className="px-4 py-3 text-sm text-foreground font-medium">{subject}</div>
      </div>
      <div className="rounded-lg border border-border bg-background-tertiary/50 overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-background-tertiary text-xs text-foreground-muted font-medium">
          Body
        </div>
        <div className="px-4 py-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, rate, color }: { label: string; value: number; rate?: string; color: string }) {
  return (
    <div className={`rounded-xl border bg-background p-4 shadow-sm border-${color}-200/50 dark:border-${color}-500/20`}>
      <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
      {rate !== undefined && (
        <p className={`text-xs mt-1 text-${color}-600 dark:text-${color}-400 font-medium`}>{rate}% rate</p>
      )}
    </div>
  );
}

export default function AgentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [toggling, setToggling] = useState(false);
  const [togglingTracking, setTogglingTracking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrepared, setShowPrepared] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [testing, setTesting] = useState(false);

  async function handleTestSend() {
    const to = window.prompt("Send a test email to:", "");
    if (to === null) return;
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agents/${params.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(to ? { toEmail: to } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.[0]?.message || data.error || "Test failed");
      setMessage({ text: `Test email sent to ${data.to} from ${data.from}.`, type: "success" });
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setTesting(false);
    }
  }
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function fetchAgentData() {
    try {
      const res = await fetch(`/api/agents`);
      if (res.ok) {
        const data = await res.json();
        const found = data.find((a: any) => a.id === params.id);
        if (found) setAgent(found);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/agents/${params.id}/stats`);
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchEmails() {
    try {
      const res = await fetch(`/api/agents/${params.id}/emails`);
      if (res.ok) setEmails(await res.json());
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchAgentData();
    fetchStats();
    fetchEmails();
  }, [params.id]);

  async function handleToggleQueue() {
    setToggling(true);
    try {
      if (agent.status === "ACTIVE") {
        const res = await fetch(`/api/agents/${agent.id}/queue`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to pause agent");
        toast.success(data.message || "Agent paused.");
        setAgent((prev: any) => ({ ...prev, status: "PAUSED" }));
      } else {
        const res = await fetch(`/api/agents/${agent.id}/queue`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start agent");
        toast.success(data.message || "Sequence launched!");
        setAgent((prev: any) => ({ ...prev, status: "ACTIVE" }));
        fetchAgentData();
        fetchEmails();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setToggling(false);
    }
  }

  async function handleToggleTracking(field: "trackOpens" | "trackClicks") {
    if (!agent || !stats) return;
    setTogglingTracking(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/stats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !stats[field] }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStats((prev: any) => ({ ...prev, ...updated }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingTracking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!agent) {
    return <div className="text-center p-12 text-foreground-muted">Agent not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background border border-border p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100 dark:bg-brand-500/10">
            <Bot className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {agent.name}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                agent.status === "ACTIVE" ? "bg-success-500/10 text-success-600" :
                agent.status === "DRAFT" ? "bg-border text-foreground-secondary" :
                "bg-warning-500/10 text-warning-600"
              }`}>
                {agent.status}
              </span>
            </h1>
            <p className="text-foreground-muted mt-0.5 text-sm">{agent.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="border-border" disabled={testing} onClick={handleTestSend}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4 text-foreground-muted" />} Send test
          </Button>
          <Button variant="outline" className="border-border" onClick={() => { setShowPreview((s) => !s); setShowPrepared(false); setShowSettings(false); }}>
            <Eye className="mr-2 h-4 w-4 text-foreground-muted" /> {showPreview ? "Hide Preview" : "Preview Steps"}
          </Button>
          <Button variant="outline" className="border-border" onClick={() => { setShowPrepared((s) => !s); setShowSettings(false); setShowPreview(false); }}>
            <MailCheck className="mr-2 h-4 w-4 text-foreground-muted" /> {showPrepared ? "Hide Prepared" : "Prepared Emails"}
          </Button>
          <Button variant="outline" className="border-border" onClick={() => { setShowSettings((s) => !s); setShowPrepared(false); setShowPreview(false); }}>
            <Settings2 className="mr-2 h-4 w-4 text-foreground-muted" /> {showSettings ? "Hide Settings" : "Configure"}
          </Button>
          <Button
            onClick={handleToggleQueue}
            disabled={toggling}
            className={agent.status === "ACTIVE"
              ? "bg-warning-600 hover:bg-warning-700 text-white"
              : "bg-success-600 hover:bg-success-700 text-white"}
          >
            {toggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
              agent.status === "ACTIVE" ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {agent.status === "ACTIVE" ? "Pause Output" : "Launch Sequence"}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-success-500/10 text-success-600" : "bg-error-500/10 text-error-600"}`}>
          {message.text}
        </div>
      )}

      {showPreview && (
        <div className="bg-background border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Sequence Step Preview</h2>
          <SequencePreview agent={agent} />
        </div>
      )}

      {showPrepared && (
        <div className="bg-background border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">Prepared Emails — review before launch</h2>
          <PreparedEmails agentId={params.id} />
        </div>
      )}

      {showSettings && (
        <AgentSettings agentId={params.id} onSaved={() => { fetchAgentData(); }} />
      )}

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : stats ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Campaign Performance</h2>
            {/* Tracking Toggles */}
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => handleToggleTracking("trackOpens")}
                disabled={togglingTracking}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${stats.trackOpens
                  ? "bg-brand-50 border-brand-200 text-brand-700"
                  : "bg-border/50 border-border text-foreground-muted"}`}
              >
                <TrendingUp className="w-3 h-3" />
                Open Tracking {stats.trackOpens ? "ON" : "OFF"}
              </button>
              <button
                onClick={() => handleToggleTracking("trackClicks")}
                disabled={togglingTracking}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${stats.trackClicks
                  ? "bg-brand-50 border-brand-200 text-brand-700"
                  : "bg-border/50 border-border text-foreground-muted"}`}
              >
                <MousePointerClick className="w-3 h-3" />
                Click Tracking {stats.trackClicks ? "ON" : "OFF"}
              </button>
            </div>
          </div>
          {!stats.trackOpens && (
            <p className="text-xs text-foreground-muted mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-warning-500" />
              Open & click tracking disabled — improves inbox deliverability.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Sent" value={stats.stats.sent} color="brand" />
            <StatCard label="Delivered" value={stats.stats.delivered} color="success" />
            <StatCard label="Opened" value={stats.stats.opened} rate={stats.rates.openRate} color="brand" />
            <StatCard label="Clicked" value={stats.stats.clicked} rate={stats.rates.clickRate} color="warning" />
            <StatCard label="Replied" value={stats.stats.replied} rate={stats.rates.replyRate} color="success" />
            <StatCard label="Bounced" value={stats.stats.bounced} rate={stats.rates.bounceRate} color="error" />
          </div>

          {stats.variants && stats.variants.length > 1 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">A/B Variant Performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.variants.map((v: any) => (
                  <div key={v.label} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs text-foreground-muted">Variant {v.label}</p>
                    <p className="text-lg font-bold text-foreground">{v.replyRate}%</p>
                    <p className="text-xs text-foreground-muted">{v.replied}/{v.sent} replied</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Bottom Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6 md:col-span-1">
          <div className="bg-background border border-border rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4">Targeting</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="text-foreground-muted text-sm">Target Lists</span>
                <span className="font-medium">{agent.prospectLists?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="text-foreground-muted text-sm">Sender Accounts</span>
                <span className="font-medium">{agent.emailAccounts?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground-muted text-sm">Products Assigned</span>
                <span className="font-medium">{agent.products?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-background border border-border rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-2">Agent Guidelines</h3>
            <div className="bg-background-tertiary p-3 rounded-md text-sm border border-border/50 text-foreground-secondary h-48 overflow-y-auto">
              {agent.guidelines || "No specific instructions. Running on generic autopilot."}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-background border border-border rounded-xl shadow-sm p-6 min-h-[350px]">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <div>
                <h3 className="font-semibold text-lg">Recent Outbound</h3>
                <p className="text-sm text-foreground-muted">Emails drafted or sent by this agent.</p>
              </div>
            </div>
            {emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-foreground-muted">
                <Mail className="h-10 w-10 mb-3 opacity-50" />
                <p className="font-medium">No sequences logged yet.</p>
                <p className="text-sm mt-1">Click &quot;Launch Sequence&quot; to start sending emails in the background.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {emails.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-3 border border-border rounded-lg p-3 hover:bg-background-tertiary/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.subject}</p>
                      <p className="text-xs text-foreground-muted truncate">
                        To {e.prospect?.name || e.toEmail}{e.prospect?.company ? ` • ${e.prospect.company}` : ""}
                        {typeof e.sequenceStep === "number" ? ` • Step ${e.sequenceStep + 1}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                      e.status === "SENT" || e.status === "DELIVERED" ? "bg-success-500/10 text-success-600" :
                      e.status === "FAILED" || e.status === "BOUNCED" ? "bg-error-500/10 text-error-600" :
                      e.status === "REPLIED" ? "bg-brand-500/10 text-brand-600" :
                      "bg-border text-foreground-secondary"
                    }`}>
                      {e.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
