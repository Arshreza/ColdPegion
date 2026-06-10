import Link from "next/link";
import { db } from "@/lib/db";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    token?: string;
    email?: string;
  }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return <ErrorCard message="Verification token or email is missing. Please check your link." />;
  }

  try {
    const normalizedEmail = email.toLowerCase();

    // Verify token
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        token,
      },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return <ErrorCard message="This verification link is invalid or has expired. Please log in and request a new one." />;
    }

    // Update user
    await db.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date() },
    });

    // Delete token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: normalizedEmail,
          token,
        },
      },
    }).catch(() => {});

    return (
      <div className="min-h-screen flex items-center justify-center bg-background-tertiary p-6 animate-fade-in">
        <div className="max-w-md w-full bg-background border border-border rounded-2xl shadow-lg p-8 text-center space-y-6">
          <div className="w-12 h-12 bg-success-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-success-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Email verified!</h1>
            <p className="text-sm text-foreground-muted">
              Thank you for verifying your email address. Your MailPilot AI account is now fully unlocked.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="w-full inline-flex justify-center items-center h-11 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors gap-2"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Verification error:", error);
    return <ErrorCard message="Something went wrong during verification. Please try again." />;
  }
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-tertiary p-6 animate-fade-in">
      <div className="max-w-md w-full bg-background border border-border rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="w-12 h-12 bg-error-500/10 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="h-6 w-6 text-error-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Verification failed</h1>
          <p className="text-sm text-foreground-muted">{message}</p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full inline-flex justify-center items-center h-11 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
