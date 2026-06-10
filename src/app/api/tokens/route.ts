import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiToken } from "@/lib/mcp/tokens";
import { z } from "zod";

/** GET /api/tokens — list the user's API tokens (never returns the secret). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await db.apiToken.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, createdAt: true },
  });
  return NextResponse.json({ tokens });
}

/** POST /api/tokens — create a token; the plaintext is returned ONCE. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = z.object({ name: z.string().min(1).max(60) }).parse(await request.json());
    const { token, tokenHash, prefix } = generateApiToken();
    const row = await db.apiToken.create({
      data: { userId: session.user.id, name, tokenHash, prefix, scopes: "read,write" },
    });
    return NextResponse.json({ id: row.id, name: row.name, token, prefix }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/tokens?id=... — revoke a token. */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const row = await db.apiToken.findFirst({ where: { id, userId: session.user.id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ success: true });
}
