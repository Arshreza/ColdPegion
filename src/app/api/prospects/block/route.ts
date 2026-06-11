import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const blockSchema = z.object({
  email: z.string().email(),
  isDnc: z.boolean(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { email, isDnc } = blockSchema.parse(body);

    const prospect = await db.prospect.upsert({
      where: {
        userId_email: {
          userId: session.user.id,
          email: email,
        }
      },
      update: {
        isDnc: isDnc,
      },
      create: {
        userId: session.user.id,
        email: email,
        isDnc: isDnc,
      }
    });

    return NextResponse.json({ id: prospect.id, email: prospect.email, isDnc: prospect.isDnc });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Prospect block error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
