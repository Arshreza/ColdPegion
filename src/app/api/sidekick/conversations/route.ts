import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/org";

/** GET /api/sidekick/conversations — list the user's recent conversations. */
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await db.sidekickConversation.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ conversations });
}
