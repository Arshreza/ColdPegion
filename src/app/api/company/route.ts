import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const companySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  valuePropositions: z.string().optional().or(z.literal("")),
  toneOfVoice: z.string().optional().or(z.literal("")),
  targetMarkets: z.string().optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await db.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(profile || null);
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = companySchema.parse(body);

    const profile = await db.companyProfile.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating company profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
