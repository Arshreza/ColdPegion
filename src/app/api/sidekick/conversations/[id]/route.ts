import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/org";

/** GET /api/sidekick/conversations/[id] — messages, shaped as UIMessages. */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const convo = await db.sidekickConversation.findFirst({ where: { id, userId: me.id } });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db.sidekickMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  const messages = rows
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => ({
      id: m.id,
      role: m.role === "USER" ? "user" : "assistant",
      parts: [{ type: "text", text: m.content }],
    }));

  return NextResponse.json({ id: convo.id, title: convo.title, messages });
}

/** DELETE /api/sidekick/conversations/[id] — delete a conversation. */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const convo = await db.sidekickConversation.findFirst({ where: { id, userId: me.id } });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.sidekickConversation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
