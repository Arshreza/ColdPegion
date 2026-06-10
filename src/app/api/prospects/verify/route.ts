import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyEmail } from "@/lib/verification/email-verifier";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Fetch user's ZeroBounce key if configured
    const settings = await db.globalSettings.findUnique({ where: { userId: session.user.id } });
    const apiKey = settings?.zeroBounceApiKey ? decrypt(settings.zeroBounceApiKey) : null;

    const result = await verifyEmail(email, apiKey);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
