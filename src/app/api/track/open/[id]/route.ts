import { db } from "@/lib/db";

// 1x1 transparent GIF.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** GET /api/track/open/[id] — open-tracking pixel. */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const email = await db.email.findUnique({ where: { id }, select: { openedAt: true, status: true } });
    if (email && !email.openedAt) {
      await db.email.update({
        where: { id },
        data: {
          openedAt: new Date(),
          // Don't downgrade a more-advanced status (e.g. REPLIED/CLICKED).
          ...(email.status === "SENT" || email.status === "DELIVERED" ? { status: "OPENED" } : {}),
        },
      });
    }
  } catch {
    /* never fail a pixel request */
  }
  return new Response(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, private" },
  });
}
