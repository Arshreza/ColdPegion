import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const settingsSchema = z.object({
  dailyEmailLimit: z.number().int().min(1).max(10000).optional(),
  zeroBounceApiKey: z.string().optional().nullable(),
  verifyOnImport: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let settings = await db.globalSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      settings = await db.globalSettings.create({
        data: { userId: session.user.id },
      });
    }

    // Return settings but mask the actual key — just show if it's set
    return NextResponse.json({
      ...settings,
      zeroBounceApiKey: settings.zeroBounceApiKey ? "••••••••••••••••" : null,
      hasZeroBounceKey: !!settings.zeroBounceApiKey,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
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
    const parsed = settingsSchema.parse(body);

    const updateData: any = {};
    if (parsed.dailyEmailLimit !== undefined) updateData.dailyEmailLimit = parsed.dailyEmailLimit;
    if (parsed.verifyOnImport !== undefined) updateData.verifyOnImport = parsed.verifyOnImport;
    if (parsed.zeroBounceApiKey !== undefined) {
      // null = clear the key; string = encrypt and store
      updateData.zeroBounceApiKey = parsed.zeroBounceApiKey ? encrypt(parsed.zeroBounceApiKey) : null;
    }

    const settings = await db.globalSettings.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...(parsed.dailyEmailLimit && { dailyEmailLimit: parsed.dailyEmailLimit }),
        ...(parsed.zeroBounceApiKey && { zeroBounceApiKey: encrypt(parsed.zeroBounceApiKey) }),
        ...(parsed.verifyOnImport !== undefined && { verifyOnImport: parsed.verifyOnImport }),
      },
    });

    return NextResponse.json({
      ...settings,
      zeroBounceApiKey: settings.zeroBounceApiKey ? "••••••••••••••••" : null,
      hasZeroBounceKey: !!settings.zeroBounceApiKey,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
