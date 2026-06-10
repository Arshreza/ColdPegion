"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart3, Globe, Server, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";

const DNS_RECORDS = [
  {
    type: "SPF",
    name: "SPF — Sender Policy Framework",
    description: "Tells receiving servers which IPs are allowed to send email for your domain. Without this, your emails will likely land in spam.",
    record: "TXT",
    host: "@  (or your domain root)",
    value: "v=spf1 include:_spf.resend.com ~all",
    note: "Replace the include: value with your sending provider's SPF string. Add multiple include: entries if you use more than one provider.",
    status: "required",
  },
  {
    type: "DKIM",
    name: "DKIM — DomainKeys Identified Mail",
    description: "Adds a cryptographic signature to outgoing emails so receivers can verify they weren't tampered with in transit.",
    record: "TXT",
    host: "resend._domainkey  (prefix depends on your provider)",
    value: "Get this from your sending provider's DNS verification page",
    note: "Resend: Dashboard → Domains → your domain → DKIM records. Each provider gives you a unique key.",
    status: "required",
  },
  {
    type: "DMARC",
    name: "DMARC — Domain-based Message Authentication",
    description: "Tells receivers what to do when SPF/DKIM checks fail (quarantine or reject). Also sends you abuse reports.",
    record: "TXT",
    host: "_dmarc",
    value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100",
    note: "Start with p=none (monitor only) and graduate to p=quarantine then p=reject once you are confident SPF and DKIM are green.",
    status: "required",
  },
  {
    type: "MX",
    name: "MX — Mail Exchange (for IMAP reply detection)",
    description: "Required only if you want inbound reply detection to work on a custom domain. If you use Gmail/GSuite or a mailbox provider, this is already set.",
    record: "MX",
    host: "@",
    value: "Set by your mailbox provider (e.g. Google, Outlook)",
    note: "No change needed here — just make sure your domain's MX records point to the same provider you configured in Email Accounts.",
    status: "recommended",
  },
];

function DnsGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-brand-200/60 dark:border-brand-500/20 bg-background shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-background-tertiary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-brand-500" />
          <div>
            <p className="font-semibold text-foreground text-sm">DNS Setup Guide — SPF / DKIM / DMARC</p>
            <p className="text-xs text-foreground-muted mt-0.5">Required before sending at volume. Click to expand setup instructions.</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-foreground-muted" /> : <ChevronDown className="h-4 w-4 text-foreground-muted" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5 space-y-6">
          <p className="text-sm text-foreground-muted leading-relaxed">
            Add these DNS records to every domain you send from. Most domain registrars (Cloudflare, Namecheap, GoDaddy)
            have a DNS management page. Changes can take up to 48 hours to propagate, but usually under 1 hour.
          </p>
          {DNS_RECORDS.map((rec) => (
            <div key={rec.type} className="rounded-lg border border-border bg-background-tertiary/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    rec.status === "required"
                      ? "bg-error-500/10 text-error-600"
                      : "bg-warning-500/10 text-warning-600"
                  }`}>
                    {rec.status.toUpperCase()}
                  </span>
                  <p className="font-semibold text-foreground text-sm">{rec.name}</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <p className="text-xs text-foreground-muted">{rec.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-foreground-muted font-medium mb-1">Record type</p>
                    <code className="bg-background border border-border px-2 py-1 rounded text-foreground">{rec.record}</code>
                  </div>
                  <div>
                    <p className="text-foreground-muted font-medium mb-1">Host / Name</p>
                    <code className="bg-background border border-border px-2 py-1 rounded text-foreground">{rec.host}</code>
                  </div>
                  <div>
                    <p className="text-foreground-muted font-medium mb-1">Value</p>
                    <div className="flex items-center gap-1">
                      <code className="bg-background border border-border px-2 py-1 rounded text-foreground truncate flex-1 block">{rec.value}</code>
                      {!rec.value.startsWith("Get") && !rec.value.startsWith("Set") && (
                        <button
                          title="Copy"
                          onClick={() => { navigator.clipboard.writeText(rec.value); toast.success("Copied!"); }}
                          className="shrink-0 p-1 rounded hover:bg-border"
                        >
                          <Copy className="h-3.5 w-3.5 text-foreground-muted" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-foreground-muted italic">{rec.note}</p>
              </div>
            </div>
          ))}
          <div className="rounded-md bg-brand-500/5 border border-brand-200/50 dark:border-brand-500/20 px-4 py-3 text-xs text-brand-700 dark:text-brand-300">
            <strong>After adding records:</strong> Use{" "}
            <a href="https://mxtoolbox.com/SuperTool.aspx" target="_blank" rel="noopener noreferrer" className="underline">
              MXToolbox
            </a>{" "}
            or{" "}
            <a href="https://dmarcian.com/dmarc-inspector/" target="_blank" rel="noopener noreferrer" className="underline">
              DMARC Inspector
            </a>{" "}
            to verify propagation before launching any campaign.
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ pct, tone }: { pct: number; tone: "brand" | "warning" | "error" }) {
  const color = tone === "error" ? "bg-error-500" : tone === "warning" ? "bg-warning-500" : "bg-brand-500";
  return (
    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function utilTone(u: number): "brand" | "warning" | "error" {
  if (u >= 90) return "error";
  if (u >= 70) return "warning";
  return "brand";
}

export default function DeliverabilityPage() {
  const [loading, setLoading] = useState(true);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/stats/deliverability")
      .then((r) => (r.ok ? r.json() : { mailboxes: [], domains: [] }))
      .then((d) => {
        setMailboxes(d.mailboxes || []);
        setDomains(d.domains || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="space-y-8 max-w-6xl animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-500/10 rounded-lg"><BarChart3 className="h-5 w-5 text-brand-600" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Deliverability</h1>
          <p className="text-foreground-muted text-sm">Per-domain and per-mailbox sending health. Campaigns auto-balance to keep these green.</p>
        </div>
      </div>

      <DnsGuide />

      {mailboxes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-12 text-center text-foreground-muted">
          No mailboxes yet. Connect mailboxes under Email Accounts to see deliverability stats.
        </div>
      ) : (
        <>
          {/* Domain-level */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-brand-500" /> By sending domain</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {domains.map((d) => (
                <div key={d.domain} className="rounded-xl border border-border bg-background shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground truncate">{d.domain}</span>
                    <span className="text-xs text-foreground-muted">{d.mailboxes} mailbox{d.mailboxes === 1 ? "" : "es"}</span>
                  </div>
                  <div className="flex justify-between text-xs text-foreground-muted mb-1">
                    <span>Today {d.sentToday}/{d.dailyLimit}</span>
                    <span>{d.utilization}%</span>
                  </div>
                  <Bar pct={d.utilization} tone={utilTone(d.utilization)} />
                  <div className="border-t border-border/50 mt-3 pt-3">
                    <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-2">All-time</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-sm font-bold text-foreground">{d.sent}</p><p className="text-[10px] text-foreground-muted uppercase">Sent</p></div>
                      <div><p className="text-sm font-bold text-success-600">{d.replyRate}%</p><p className="text-[10px] text-foreground-muted uppercase">Reply</p></div>
                      <div><p className={`text-sm font-bold ${d.bounceRate >= 5 ? "text-error-600" : "text-foreground"}`}>{d.bounceRate}%</p><p className="text-[10px] text-foreground-muted uppercase">Bounce</p></div>
                    </div>
                  </div>
                  {d.bounceRate >= 5 && (
                    <p className="text-[11px] text-error-600 mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> High bounce rate — rest this domain.</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Mailbox-level */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Server className="h-4 w-4 text-brand-500" /> By mailbox</h2>
            <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-background-tertiary border-b border-border text-foreground-muted">
                    <tr>
                      <th className="px-4 py-3">Mailbox</th>
                      <th className="px-4 py-3">Today</th>
                      <th className="px-4 py-3 w-40">Today's usage</th>
                      <th className="px-4 py-3">All-time sent</th>
                      <th className="px-4 py-3">All-time reply</th>
                      <th className="px-4 py-3">All-time bounce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mailboxes.map((m) => (
                      <tr key={m.id} className="hover:bg-background-tertiary/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{m.emailAddress}</div>
                          <div className="text-xs text-foreground-muted">{m.provider} • {m.domain}</div>
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">{m.sentToday}/{m.dailyLimit}</td>
                        <td className="px-4 py-3"><Bar pct={m.utilization} tone={utilTone(m.utilization)} /></td>
                        <td className="px-4 py-3 text-foreground-muted">{m.sent}</td>
                        <td className="px-4 py-3 text-success-600">{m.replyRate}%</td>
                        <td className={`px-4 py-3 ${m.bounceRate >= 5 ? "text-error-600 font-medium" : "text-foreground-muted"}`}>{m.bounceRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
