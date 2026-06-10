import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

async function ownedPrepared(id: string, userId: string) {
  const pe = await db.preparedEmail.findUnique({ where: { id }, include: { agent: { select: { userId: true } } } });
  if (!pe || pe.agent.userId !== userId) return null;
  return pe;
}

/** PATCH /api/prepared/[id] — edit a prepared email's subject/body. */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pe = await ownedPrepared(params.id, session.user.id);
  if (!pe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pe.status === "SENT") return NextResponse.json({ error: "This email was already sent." }, { status: 400 });

  try {
    const data = z.object({ subject: z.string().min(1).optional(), body: z.string().min(1).optional() }).parse(await request.json());
    const updated = await db.preparedEmail.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: updated.id, subject: updated.subject, body: updated.body });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/prepared/[id] — remove a prepared email. */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pe = await ownedPrepared(params.id, session.user.id);
  if (!pe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.preparedEmail.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
