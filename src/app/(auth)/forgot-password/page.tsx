"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred. Please try again.");
      } else {
        setSuccess(data.message || "Reset link sent successfully!");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Forgot password?</h2>
        <p className="text-foreground-muted mt-2">
          No worries, we'll send you instructions to reset it.
        </p>
      </div>

      <div className="space-y-6 mt-8">
        {success ? (
          <div className="p-6 text-center bg-success-500/10 border border-success-500/20 rounded-xl space-y-4">
            <CheckCircle2 className="h-12 w-12 text-success-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
              <p className="text-sm text-foreground-muted">
                {success}
              </p>
            </div>
            <div className="pt-2">
              <Link href="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-500 transition-colors inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-error-600 bg-error-500/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-foreground-muted" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  className="pl-9"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-sm font-semibold text-brand-600 hover:text-brand-500 transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
