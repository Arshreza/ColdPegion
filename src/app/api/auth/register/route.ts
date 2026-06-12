import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { deriveDomain, isFreeDomain, findOrgForDomain } from "@/lib/org";
import { sendJoinRequestAdminEmail, sendVerificationEmail } from "@/lib/email/transactional";
import { enforceRateLimit } from "@/lib/security/rate-limit";

async function createAndSendVerification(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save the verification token in the VerificationToken table
  await db.verificationToken.create({
    data: {
      identifier: email.toLowerCase(),
      token,
      expires,
    },
  });

  // Send the email
  await sendVerificationEmail({ to: email, token });
}


const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "register", 5, 10 * 60_000);
  if (limited) return limited;
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hash(validatedData.password, 12);

    const normalizedEmail = validatedData.email.toLowerCase();

    let organizationId: string;
    let role: "OWNER" | "ADMIN" | "MEMBER" = "OWNER";
    let memberStatus: "ACTIVE" | "PENDING" = "ACTIVE";
    let joinPending = false;

    // 1. A pending invite always wins — the invitee joins immediately.
    const invite = await db.orgInvite.findFirst({
      where: { email: normalizedEmail, status: "PENDING", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (invite) {
      organizationId = invite.organizationId;
      role = invite.role;
      memberStatus = "ACTIVE";
      await db.orgInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } }).catch(() => {});
      const user = await db.user.create({
        data: { name: validatedData.name, email: validatedData.email, passwordHash, organizationId, role, memberStatus },
      });
      await db.globalSettings.create({ data: { userId: user.id } });
      await createAndSendVerification(user.email);
      return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, joinPending: false }, { status: 201 });
    }

    // 2. Otherwise route by work-email domain.
    const domain = deriveDomain(validatedData.email);
    const existingOrg = await findOrgForDomain(domain);

    if (existingOrg) {
      // Their company is already on the platform — request to join (pending).
      organizationId = existingOrg.id;
      role = "MEMBER";
      memberStatus = "PENDING";
      joinPending = true;
    } else {
      // First user from this domain — create the organization, they own it.
      const orgName = domain && !isFreeDomain(domain) ? domain : `${validatedData.name}'s Workspace`;
      const org = await db.organization.create({
        data: {
          name: orgName,
          primaryDomain: domain && !isFreeDomain(domain) ? domain : null,
        },
      });
      organizationId = org.id;
      if (domain && !isFreeDomain(domain)) {
        await db.emailDomain.create({ data: { organizationId: org.id, domain } }).catch(() => {});
      }
    }

    // Create user
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        organizationId,
        role,
        memberStatus,
      },
    });

    try {
      await createAndSendVerification(user.email);
    } catch (err) {
      console.error("Failed to send verification email:", err);
    }

    if (joinPending) {
      await db.joinRequest.create({ data: { organizationId, userId: user.id } }).catch(() => {});
      // Notify org admins that someone wants to join.
      const [org, admins] = await Promise.all([
        db.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
        db.user.findMany({
          where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
          select: { email: true },
        }),
      ]);
      await Promise.allSettled(
        admins.map((a) =>
          sendJoinRequestAdminEmail({
            to: a.email,
            orgName: org?.name || "your team",
            requesterName: user.name,
            requesterEmail: user.email,
          })
        )
      );
    }

    // Create default global settings
    await db.globalSettings.create({
      data: {
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        joinPending,
        message: joinPending
          ? "Your company is already on ColdPegion. An admin must approve your request to join."
          : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
