import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email/transactional";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "forgot-password", 5, 10 * 60_000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { email } = schema.parse(body);
    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.passwordHash) {
      // Create a reset token valid for 1 hour
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      // Save token in the database
      await db.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          token,
          expires,
        },
      });

      // Send the reset email
      await sendPasswordResetEmail({ to: normalizedEmail, token });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
