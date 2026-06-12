"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SalesModalProps {
  onClose: () => void;
}

export function SalesModal({ onClose }: SalesModalProps) {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send");
      }
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Talk to sales</h2>
            <p className="text-sm text-foreground-muted mt-0.5">Tell us about your team and we&apos;ll be in touch.</p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground p-1 rounded-md hover:bg-background-tertiary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-success-500/10 border border-success-500/25 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success-500" />
              </div>
            </div>
            <h3 className="font-semibold text-foreground text-lg">Message sent!</h3>
            <p className="text-sm text-foreground-muted">
              We&apos;ll get back to you within one business day. You can also reach us anytime at{" "}
              <a href="mailto:support@coldpegion.com" className="text-brand-600 hover:underline font-medium">
                support@coldpegion.com
              </a>
              .
            </p>
            <Button onClick={onClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sales-name">Name *</Label>
                <Input
                  id="sales-name"
                  required
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sales-email">Work email *</Label>
                <Input
                  id="sales-email"
                  type="email"
                  required
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sales-company">Company</Label>
              <Input
                id="sales-company"
                placeholder="Acme Inc."
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sales-message">Tell us about your needs *</Label>
              <textarea
                id="sales-message"
                required
                minLength={10}
                rows={4}
                placeholder="Team size, volume, what you're trying to achieve..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-error-600 bg-error-500/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-foreground-muted">
                Or email us at{" "}
                <a href="mailto:support@coldpegion.com" className="text-brand-600 hover:underline">
                  support@coldpegion.com
                </a>
              </p>
              <Button type="submit" disabled={sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send message
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
