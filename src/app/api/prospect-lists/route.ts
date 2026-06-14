import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const listSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const me = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    // Return user's own lists + any org-shared lists from org members
    const where = me?.organizationId
      ? {
          OR: [
            { userId: session.user.id },
            {
              isOrgShared: true,
              user: { organizationId: me.organizationId },
            },
          ],
        }
      : { userId: session.user.id };

    const lists = await db.prospectList.findMany({
      where,
      include: {
        _count: { select: { prospects: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error("Prospect List GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = listSchema.parse(body);

    const list = await db.prospectList.create({
      data: {
        userId: session.user.id,
        name: data.name,
        description: data.description,
      },
      include: {
        _count: {
          select: { prospects: true }
        }
      }
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Prospect List POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
