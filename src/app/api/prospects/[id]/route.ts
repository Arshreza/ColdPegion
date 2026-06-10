import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  isDnc: z.boolean().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
});

/** PATCH /api/prospects/[id] — update a prospect (e.g. toggle do-not-contact). */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.prospect.findUnique({ where: { id: params.id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

  try {
    const data = patchSchema.parse(await request.json());
    const updated = await db.prospect.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: updated.id, isDnc: updated.isDnc });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/prospects/[id] — remove a prospect entirely. */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await db.prospect.findUnique({ where: { id: params.id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  await db.prospect.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
