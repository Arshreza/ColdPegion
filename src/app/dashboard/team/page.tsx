"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UsersRound, UserPlus, ShieldCheck, Check, X, Trash2, Mail } from "lucide-react";

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/org");
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isAdmin = data?.me?.isAdmin;
  const isOwner = data?.me?.role === "OWNER";

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/org/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.[0]?.message || d.error || "Failed");
      setMessage({ text: d.message || "Invited", type: "success" });
      setInviteEmail("");
      load();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, role: string) {
    await fetch("/api/org/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    load();
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    await fetch(`/api/org/members?userId=${userId}`, { method: "DELETE" });
    load();
  }

  async function handleJoin(id: string, action: "approve" | "deny") {
    await fetch("/api/org/join-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    load();
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/org/invites?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return <div className="flex h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  }

  if (!data?.org) {
    return <div className="text-center p-12 text-foreground-muted">No organization found for your account.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-500/10 rounded-lg"><UsersRound className="h-5 w-5 text-brand-600" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.org.name}</h1>
          <p className="text-foreground-muted text-sm">
            Team & roles{data.org.primaryDomain ? ` • ${data.org.primaryDomain}` : ""} • You are {data.me.role}
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-success-500/10 text-success-600" : "bg-error-500/10 text-error-600"}`}>{message.text}</div>
      )}

      {/* Join requests */}
      {isAdmin && data.joinRequests?.length > 0 && (
        <div className="rounded-xl border border-warning-200 bg-warning-50/40 dark:bg-warning-500/5 shadow-sm">
          <div className="border-b border-border p-4 font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-warning-600" /> Pending join requests ({data.joinRequests.length})
          </div>
          <div className="divide-y divide-border">
            {data.joinRequests.map((j: any) => (
              <div key={j.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{j.user.name || j.user.email}</p>
                  <p className="text-xs text-foreground-muted">{j.user.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleJoin(j.id, "approve")}><Check className="h-4 w-4 mr-1" /> Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => handleJoin(j.id, "deny")}><X className="h-4 w-4 mr-1" /> Deny</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite */}
      {isAdmin && (
        <div className="rounded-xl border border-border bg-background shadow-sm">
          <div className="border-b border-border p-4 font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-500" /> Invite a teammate
          </div>
          <form onSubmit={invite} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteRole">Role</Label>
              <select id="inviteRole" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}</Button>
          </form>
          {data.invites?.length > 0 && (
            <div className="border-t border-border p-4 space-y-2">
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Pending invites</p>
              {data.invites.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span>{inv.email} <span className="text-foreground-muted">• {inv.role}</span></span>
                  <Button size="sm" variant="ghost" className="h-7 text-error-600" onClick={() => revokeInvite(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
        <div className="border-b border-border p-4 font-semibold text-foreground">Members ({data.members.length})</div>
        <table className="w-full text-sm text-left">
          <thead className="bg-background-tertiary border-b border-border text-foreground-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.members.map((m: any) => (
              <tr key={m.id} className="hover:bg-background-tertiary/50">
                <td className="px-4 py-3 font-medium text-foreground">{m.name || "—"}{m.id === data.me.id && <span className="ml-2 text-xs text-brand-600">(you)</span>}</td>
                <td className="px-4 py-3 text-foreground-muted">{m.email}</td>
                <td className="px-4 py-3">
                  {isAdmin && m.id !== data.me.id && (m.role !== "OWNER" || isOwner) ? (
                    <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                      {isOwner && <option value="OWNER">Owner</option>}
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs"><ShieldCheck className="h-3.5 w-3.5 text-brand-500" /> {m.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.memberStatus === "ACTIVE" ? "bg-success-500/10 text-success-600" : "bg-warning-500/10 text-warning-600"}`}>{m.memberStatus}</span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {m.id !== data.me.id && m.role !== "OWNER" && (
                      <Button size="sm" variant="ghost" className="h-7 text-error-600" onClick={() => removeMember(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
