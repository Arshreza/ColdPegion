import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "reset-password", 5, 10 * 60_000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { token, password } = schema.parse(body);

    // Find the token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await db.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Hash and update password
    const passwordHash = await hash(password, 12);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete the token so it cannot be used again
    await db.passwordResetToken.delete({
      where: { id: resetToken.id },
    }).catch(() => {});

    // Optionally delete all other tokens for this email too
    await db.passwordResetToken.deleteMany({
      where: { email: resetToken.email },
    }).catch(() => {});

    return NextResponse.json({ message: "Password reset successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
