import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/track/click/[id]?u=<url> — record a click and redirect. */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const target = new URL(request.url).searchParams.get("u");

  // Only redirect to safe absolute http(s) targets.
  let dest = "/";
  if (target) {
    try {
      const u = new URL(target);
      if (u.protocol === "http:" || u.protocol === "https:") dest = u.toString();
    } catch {
      /* fall back to home */
    }
  }

  try {
    const email = await db.email.findUnique({ where: { id }, select: { clickedAt: true, status: true } });
    if (email) {
      await db.email.update({
        where: { id },
        data: {
          clickedAt: email.clickedAt ?? new Date(),
          openedAt: email.clickedAt ? undefined : new Date(),
          ...(email.status === "SENT" || email.status === "DELIVERED" || email.status === "OPENED" ? { status: "CLICKED" } : {}),
        },
      });
    }
  } catch {
    /* never block the redirect */
  }

  return NextResponse.redirect(dest, 302);
}
