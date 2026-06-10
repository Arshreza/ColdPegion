import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/transactional";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user?.id || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(request, "resend-verification", 3, 5 * 60_000); // 3 requests every 5 minutes
  if (limited) return limited;

  try {
    const email = session.user.email.toLowerCase();

    // Check if user is already verified
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Generate token and expiration
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store in DB
    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send verification email
    await sendVerificationEmail({ to: email, token });

    return NextResponse.json({ message: "Verification link resent successfully." });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
