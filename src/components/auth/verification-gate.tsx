"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, LogOut, CheckCircle2 } from "lucide-react";

export function VerificationGate({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/verify/resend", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend verification email.");
      } else {
        setSuccess(data.message || "Verification email sent successfully!");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background-tertiary p-6 animate-fade-in">
      <div className="max-w-md w-full bg-background border border-border rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-6 w-6 text-brand-600 animate-bounce" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
          <p className="text-sm text-foreground-muted">
            We sent a verification link to <strong className="text-foreground">{email}</strong>.
            Please verify your email address to access your dashboard.
          </p>
        </div>

        {success && (
          <div className="p-3 text-sm text-success-600 bg-success-500/10 border border-success-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-error-600 bg-error-500/10 border border-error-500/20 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleResend}
            className="w-full h-11"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full h-11 border-border text-foreground hover:bg-foreground/5 gap-2"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
