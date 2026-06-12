"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import { sanitizeCallbackUrl } from "@/lib/callback-url";

function LoginForm() {
  const searchParams = useSearchParams();
  // Honor ?callbackUrl= (e.g. the MCP OAuth authorize flow bounces here and
  // must continue back to /api/oauth/authorize after login).
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        // Full navigation (not router.push) so route-handler destinations like
        // /api/oauth/authorize can issue their own redirects.
        window.location.assign(callbackUrl);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl });
  }

  async function onMicrosoftSignIn() {
    setLoading(true);
    await signIn("microsoft-entra-id", { callbackUrl });
  }

  return (
    <div className="w-full space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-foreground-muted mt-2">
          Enter your details to access your dashboard
        </p>
      </div>

      <div className="space-y-6 mt-8">
        <Button
          variant="outline"
          className="w-full h-12 text-base font-medium"
          type="button"
          onClick={onGoogleSignIn}
          disabled={loading}
        >
          <svg
            className="mr-2 h-5 w-5"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </Button>

        <Button
          variant="outline"
          className="w-full h-12 text-base font-medium"
          type="button"
          onClick={onMicrosoftSignIn}
          disabled={loading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#f25022" d="M1 1h10v10H1z" />
            <path fill="#7fba00" d="M12 1h10v10H12z" />
            <path fill="#00a4ef" d="M1 12h10v10H1z" />
            <path fill="#ffb900" d="M12 12h10v10H12z" />
          </svg>
          Sign in with Microsoft
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-foreground-muted">
              Or continue with
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-error-600 bg-error-500/10 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-brand-600 hover:text-brand-500"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-foreground-muted" />
              <Input
                id="password"
                name="password"
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
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-foreground-muted">
        Don&apos;t have an account?{" "}
        <Link
          href={
            callbackUrl === "/dashboard"
              ? "/register"
              : `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
          }
          className="font-semibold text-brand-600 hover:text-brand-500 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
