import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";
import { Sidekick } from "@/components/shared/sidekick";
import { OnboardingTour } from "@/components/shared/onboarding-tour";
import { isTransactionalConfigured } from "@/lib/email/transactional";
import { db } from "@/lib/db";
import { VerificationGate } from "@/components/auth/verification-gate";
import { Toaster } from "sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Retrieve user verification details from database
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true, passwordHash: true, createdAt: true },
  });

  const CUTOFF_DATE = new Date("2026-06-04T00:00:00Z");

  // Gate credentials users who registered after the cutoff and haven't verified their email (only if transactional mail is configured).
  if (
    isTransactionalConfigured() &&
    dbUser?.passwordHash &&
    !dbUser?.emailVerified &&
    dbUser?.createdAt &&
    dbUser.createdAt >= CUTOFF_DATE
  ) {
    return <VerificationGate email={dbUser.email} />;
  }

  // Gate members whose join request hasn't been approved yet.
  if (session.user?.memberStatus === "PENDING") {

    return (
      <div className="flex h-screen items-center justify-center bg-background-tertiary p-6">
        <div className="max-w-md text-center bg-background border border-border rounded-xl shadow-sm p-8">
          <h1 className="text-xl font-bold text-foreground">Awaiting approval</h1>
          <p className="text-sm text-foreground-muted mt-3">
            Your company is already on ColdPegion. An administrator needs to approve your request to
            join the team before you can access the dashboard. You&apos;ll get in as soon as they do.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen bg-background-tertiary">
        <Sidebar />
        
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          
          <main className="flex-1 overflow-y-auto outline-none">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
              {children}
            </div>
          </main>
        </div>
        
        {/* Global Floating Sidekick Component */}
        <Sidekick />

        {/* Welcome Onboarding Tour Helper */}
        <OnboardingTour />
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </SessionProvider>
  );
}
