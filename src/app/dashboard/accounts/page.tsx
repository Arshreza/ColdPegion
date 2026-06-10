"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, MailOpen, AlertCircle, CheckCircle2, Server, Send, Trash2, Flame } from "lucide-react";

interface EmailAccount {
  id: string;
  emailAddress: string;
  displayName: string;
  provider: "RESEND" | "GMAIL" | "SMTP";
  status: "CONNECTED" | "ERROR" | "WARMING_UP" | "DISCONNECTED";
  dailyLimit: number;
  sentToday: number;
  isActive: boolean;
  smtpHost?: string | null;
  domain?: string | null;
  sharedWithOrg?: boolean;
  assignedToUserId?: string | null;
  assignedTo?: { id: string; name: string | null; email: string } | null;
  warmupEnabled?: boolean;
  warmupDailyMax?: number;
  warmupTag?: string | null;
  warmupSentToday?: number;
  lastSyncedAt?: string | null;
}

function ImapHealthBadge({ lastSyncedAt, imapEnabled }: { lastSyncedAt?: string | null; imapEnabled?: boolean }) {
  if (!imapEnabled) return null;
  if (!lastSyncedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
        <span className="h-2 w-2 rounded-full bg-warning-400" />
        IMAP: never synced
      </span>
    );
  }
  const diffMin = (Date.now() - new Date(lastSyncedAt).getTime()) / 60000;
  const color = diffMin < 15 ? "bg-success-500" : diffMin < 60 ? "bg-warning-400" : "bg-error-500";
  const label = diffMin < 60
    ? `${Math.round(diffMin)}m ago`
    : `${Math.round(diffMin / 60)}h ago`;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      IMAP synced {label}
    </span>
  );
}

type Provider = "GMAIL" | "RESEND" | "SMTP";

const blankAccount = {
  emailAddress: "",
  displayName: "",
  provider: "GMAIL" as Provider,
  resendApiKey: "",
  gmailAppPassword: "",
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUsername: "",
  smtpPassword: "",
  imapHost: "",
  imapPort: 993,
  imapSecure: true,
  imapUsername: "",
  imapPassword: "",
  dailyLimit: 50,
};

export default function EmailAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newAccount, setNewAccount] = useState({ ...blankAccount });
  const [members, setMembers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/email-accounts");
      if (res.ok) setAccounts(await res.json());
    } catch (error) {
      console.error("Failed to load accounts", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrg() {
    try {
      const res = await fetch("/api/org");
      if (res.ok) {
        const d = await res.json();
        setMembers(d.members || []);
        setIsAdmin(Boolean(d.me?.isAdmin));
      }
    } catch {
      /* solo user without org */
    }
  }

  async function updateAccount(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/email-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const merged: EmailAccount = { ...a, ...patch, ...updated };
          if ("assignedToUserId" in patch) {
            const m = members.find((x) => x.id === patch.assignedToUserId);
            merged.assignedTo = patch.assignedToUserId ? (m ? { id: m.id, name: m.name, email: m.email } : a.assignedTo ?? null) : null;
          }
          return merged;
        })
      );
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Update failed");
    }
  }

  useEffect(() => {
    fetchAccounts();
    fetchOrg();
  }, []);

  function applySendGridPreset() {
    setNewAccount((prev) => ({
      ...prev,
      provider: "SMTP",
      smtpHost: "smtp.sendgrid.net",
      smtpPort: 587,
      smtpSecure: false,
      smtpUsername: "apikey",
    }));
  }

  async function handleAddAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/email-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.[0]?.message || data.error || "Failed to add account");

      if (data.status === "ERROR") {
        toast.warning(`Saved, but connection test failed: ${data.lastError}`);
      } else {
        toast.success("Email account successfully connected!");
      }
      setIsAddingMode(false);
      setNewAccount({ ...blankAccount });
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to add email account");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this email account? Any agents using it will stop sending.")) return;
    try {
      const res = await fetch(`/api/email-accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        toast.success("Account removed.");
      } else {
        toast.error("Failed to remove account.");
      }
    } catch {
      toast.error("Failed to remove account.");
    }
  }

  async function handleUpdateLimit(id: string, dailyLimit: number) {
    try {
      const res = await fetch(`/api/email-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimit }),
      });
      if (res.ok) {
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, dailyLimit } : a)));
      }
    } catch (error) {
      console.error(error);
    }
  }

  const providerCard = (value: Provider, icon: React.ReactNode, label: string) => (
    <div
      className={`border rounded-lg p-4 cursor-pointer text-center flex flex-col items-center gap-2 ${
        newAccount.provider === value ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-border"
      }`}
      onClick={() => setNewAccount({ ...newAccount, provider: value })}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Email Accounts</h1>
          <p className="text-foreground-muted mt-1 text-sm">Connect your inboxes to start sending outreach.</p>
        </div>
        <Button onClick={() => setIsAddingMode(!isAddingMode)} id="onboarding-connect-email">
          {isAddingMode ? "Cancel" : <><Plus className="mr-2 h-4 w-4" /> Connect Account</>}
        </Button>
      </div>

      {isAddingMode && (
        <div className="rounded-xl border border-border bg-background shadow-sm animate-slide-up">
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-semibold text-foreground">Connect a New Mailbox</h2>
          </div>

          <form onSubmit={handleAddAccount} className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Connection Type</Label>
              <div className="grid grid-cols-3 gap-4">
                {providerCard("GMAIL", <MailOpen className="h-6 w-6 text-red-500" />, "Google / Gmail")}
                {providerCard("RESEND", <Server className="h-6 w-6 text-neutral-800 dark:text-neutral-200" />, "Resend API")}
                {providerCard("SMTP", <Send className="h-6 w-6 text-brand-500" />, "SMTP / SendGrid")}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="displayName">Sender Name (Display Name)</Label>
                <Input id="displayName" value={newAccount.displayName} onChange={(e) => setNewAccount({ ...newAccount, displayName: e.target.value })} placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailAddress">Email Address</Label>
                <Input id="emailAddress" type="email" value={newAccount.emailAddress} onChange={(e) => setNewAccount({ ...newAccount, emailAddress: e.target.value })} placeholder="john@example.com" required />
              </div>
            </div>

            {newAccount.provider === "GMAIL" && (
              <div className="space-y-2 border-t border-border pt-4">
                <Label htmlFor="gmailAppPassword">Google App Password</Label>
                <Input id="gmailAppPassword" type="password" value={newAccount.gmailAppPassword} onChange={(e) => setNewAccount({ ...newAccount, gmailAppPassword: e.target.value })} placeholder="16-character app password" required />
                <p className="text-xs text-foreground-muted">
                  Enable 2-Step Verification in Google, then generate an App Password. Do not use your normal account password.
                </p>
              </div>
            )}

            {newAccount.provider === "RESEND" && (
              <div className="space-y-2 border-t border-border pt-4">
                <Label htmlFor="resendApiKey">Resend API Key</Label>
                <Input id="resendApiKey" type="password" value={newAccount.resendApiKey} onChange={(e) => setNewAccount({ ...newAccount, resendApiKey: e.target.value })} placeholder="re_..." required />
                <p className="text-xs text-foreground-muted">Ensure the sending domain is verified in your Resend account.</p>
              </div>
            )}

            {newAccount.provider === "SMTP" && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground-muted">Works with SendGrid, Mailgun, Amazon SES, Postmark, or any SMTP relay.</p>
                  <Button type="button" variant="outline" size="sm" onClick={applySendGridPreset}>Use SendGrid preset</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input id="smtpHost" value={newAccount.smtpHost} onChange={(e) => setNewAccount({ ...newAccount, smtpHost: e.target.value })} placeholder="smtp.sendgrid.net" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input id="smtpPort" type="number" value={newAccount.smtpPort} onChange={(e) => setNewAccount({ ...newAccount, smtpPort: parseInt(e.target.value) || 587 })} placeholder="587" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUsername">Username</Label>
                    <Input id="smtpUsername" value={newAccount.smtpUsername} onChange={(e) => setNewAccount({ ...newAccount, smtpUsername: e.target.value })} placeholder='SendGrid: "apikey"' />
                    <p className="text-xs text-foreground-muted">Leave blank to use the email address. For SendGrid use <code>apikey</code>.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">Password / API Key</Label>
                    <Input id="smtpPassword" type="password" value={newAccount.smtpPassword} onChange={(e) => setNewAccount({ ...newAccount, smtpPassword: e.target.value })} placeholder="SMTP password or SendGrid API key" required />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={newAccount.smtpSecure} onChange={(e) => setNewAccount({ ...newAccount, smtpSecure: e.target.checked })} />
                  Use TLS/SSL on connect (port 465). Leave off for STARTTLS on port 587.
                </label>

                <div className="border-t border-dashed border-border pt-4 space-y-4">
                  <p className="text-sm font-medium text-foreground-secondary">Inbound (IMAP) — optional, enables reply detection & unified inbox</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="imapHost">IMAP Host</Label>
                      <Input id="imapHost" value={newAccount.imapHost} onChange={(e) => setNewAccount({ ...newAccount, imapHost: e.target.value })} placeholder="imap.your-provider.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapPort">Port</Label>
                      <Input id="imapPort" type="number" value={newAccount.imapPort} onChange={(e) => setNewAccount({ ...newAccount, imapPort: parseInt(e.target.value) || 993 })} placeholder="993" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imapUsername">IMAP Username</Label>
                      <Input id="imapUsername" value={newAccount.imapUsername} onChange={(e) => setNewAccount({ ...newAccount, imapUsername: e.target.value })} placeholder="Defaults to email address" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapPassword">IMAP Password</Label>
                      <Input id="imapPassword" type="password" value={newAccount.imapPassword} onChange={(e) => setNewAccount({ ...newAccount, imapPassword: e.target.value })} placeholder="Mailbox password" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {newAccount.provider === "GMAIL" && (
              <div className="rounded-md bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 p-3 text-xs text-brand-700 dark:text-brand-300">
                Reply detection is automatic for Gmail — we connect to <code>imap.gmail.com</code> using the same app password to detect replies and stop sequences.
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-4">
              <Label htmlFor="dailyLimit">Daily Sending Limit</Label>
              <Input id="dailyLimit" type="number" min={1} value={newAccount.dailyLimit} onChange={(e) => setNewAccount({ ...newAccount, dailyLimit: parseInt(e.target.value) || 50 })} className="max-w-[160px]" />
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <Button type="submit" disabled={adding}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect & Verify
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-12 text-center">
          <MailOpen className="mx-auto h-12 w-12 text-foreground-muted/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No accounts connected</h3>
          <p className="mt-1 text-sm text-foreground-muted mb-6">Connect an email account to start sending campaigns.</p>
          <Button onClick={() => setIsAddingMode(true)}><Plus className="mr-2 h-4 w-4" /> Connect Mailbox</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc) => (
            <div key={acc.id} className="rounded-xl border border-border bg-background shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{acc.emailAddress}</h3>
                    <p className="text-sm text-foreground-muted">{acc.displayName} • {acc.provider}{acc.smtpHost ? ` • ${acc.smtpHost}` : ""}</p>
                  </div>
                  {acc.status === "CONNECTED" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-500/10 px-2 py-1 text-xs font-medium text-success-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                    </span>
                  ) : acc.status === "ERROR" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-error-500/10 px-2 py-1 text-xs font-medium text-error-600">
                      <AlertCircle className="h-3.5 w-3.5" /> Disconnected
                    </span>
                  ) : null}
                </div>

                <div className="bg-background-tertiary rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground-secondary font-medium">Daily Limit Usage</span>
                    <span className="text-foreground font-medium">{acc.sentToday} / {acc.dailyLimit}</span>
                  </div>
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min((acc.sentToday / acc.dailyLimit) * 100, 100)}%` }} />
                  </div>
                </div>

                <div className="mt-2">
                  <ImapHealthBadge lastSyncedAt={acc.lastSyncedAt} imapEnabled />
                </div>

                {/* Org sharing & assignment */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${acc.sharedWithOrg ? "bg-success-500/10 text-success-600" : "bg-border text-foreground-secondary"}`}>
                    {acc.sharedWithOrg ? "Shared with team" : "Private"}
                  </span>
                  {acc.assignedTo && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600">
                      Assigned: {acc.assignedTo.name || acc.assignedTo.email}
                    </span>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => updateAccount(acc.id, { sharedWithOrg: !acc.sharedWithOrg })}
                        className="underline text-foreground-muted hover:text-foreground"
                      >
                        {acc.sharedWithOrg ? "Make private" : "Share"}
                      </button>
                      {members.length > 0 && (
                        <select
                          title="Assign mailbox"
                          value={acc.assignedToUserId || ""}
                          onChange={(e) => updateAccount(acc.id, { assignedToUserId: e.target.value || null })}
                          className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name || m.email}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Warmup */}
                <div className="mt-3 rounded-lg border border-border bg-background-tertiary/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary">
                      <Flame className={`h-4 w-4 ${acc.warmupEnabled ? "text-warning-500" : "text-foreground-muted"}`} /> Warmup
                    </span>
                    <button
                      type="button"
                      onClick={() => updateAccount(acc.id, { warmupEnabled: !acc.warmupEnabled })}
                      className={`relative h-5 w-9 rounded-full transition-colors ${acc.warmupEnabled ? "bg-warning-500" : "bg-border"}`}
                      title="Toggle warmup"
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${acc.warmupEnabled ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>
                  {acc.warmupEnabled && (
                    <div className="mt-3 grid grid-cols-2 gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Daily max</Label>
                        <Input
                          type="number"
                          min={1}
                          defaultValue={acc.warmupDailyMax ?? 10}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value);
                            if (v && v !== acc.warmupDailyMax) updateAccount(acc.id, { warmupDailyMax: v });
                          }}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Subject tag</Label>
                        <Input
                          defaultValue={acc.warmupTag ?? ""}
                          placeholder="optional"
                          onBlur={(e) => {
                            if (e.target.value !== (acc.warmupTag ?? "")) updateAccount(acc.id, { warmupTag: e.target.value });
                          }}
                          className="h-8"
                        />
                      </div>
                      <p className="col-span-2 text-[11px] text-foreground-muted">
                        Sent {acc.warmupSentToday ?? 0}/{acc.warmupDailyMax ?? 10} warmup emails today. Needs 2+ warmup-enabled mailboxes.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-background-tertiary px-5 py-3 border-t border-border flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                  <span>Limit</span>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={acc.dailyLimit}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value);
                      if (v && v !== acc.dailyLimit) handleUpdateLimit(acc.id, v);
                    }}
                    className="h-8 w-20"
                  />
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-500/10" onClick={() => handleRemove(acc.id)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
