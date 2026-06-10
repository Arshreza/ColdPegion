"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!token) {
      setError("Reset token is missing. Please request a new link.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full space-y-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-error-600">Invalid Link</h2>
        <p className="text-foreground-muted mt-2">
          The password reset token is missing. Please request a new password reset link.
        </p>
        <div className="pt-4">
          <Link href="/forgot-password" className="w-full inline-flex justify-center items-center h-11 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Create new password</h2>
        <p className="text-foreground-muted mt-2">
          Your new password must be different from previous passwords.
        </p>
      </div>

      <div className="space-y-6 mt-8">
        {success ? (
          <div className="p-6 text-center bg-success-500/10 border border-success-500/20 rounded-xl space-y-4">
            <CheckCircle2 className="h-12 w-12 text-success-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Password updated</h3>
              <p className="text-sm text-foreground-muted">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/login" className="w-full inline-flex justify-center items-center h-11 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors gap-2">
                Sign in <ArrowRight className="h-4 w-4" />
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
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-foreground-muted" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  className="pl-9"
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
              <p className="text-xs text-foreground-muted">
                Must be at least 8 characters with one uppercase letter and one number.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-foreground-muted" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
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
                  Resetting password...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
