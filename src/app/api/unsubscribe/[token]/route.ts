import { db } from "@/lib/db";
import { verifyUnsubToken } from "@/lib/unsubscribe";

async function unsubscribe(token: string): Promise<boolean> {
  const prospectId = verifyUnsubToken(token);
  if (!prospectId) return false;
  const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) return false;
  await db.prospect.update({ where: { id: prospectId }, data: { isDnc: true } });
  await db.sequenceEnrollment.updateMany({
    where: { prospectId, status: "ACTIVE" },
    data: { status: "PAUSED" },
  });
  return true;
}

/** POST — RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). */
export async function POST(_request: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const ok = await unsubscribe(token);
  return new Response(JSON.stringify({ unsubscribed: ok }), {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "application/json" },
  });
}

/** GET — when a recipient clicks the unsubscribe link in the email body. */
export async function GET(_request: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const ok = await unsubscribe(token);
  const message = ok
    ? "You've been unsubscribed. You won't receive any further emails from us."
    : "This unsubscribe link is invalid or has expired.";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head>
  <body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:440px;margin:80px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;text-align:center;">
      <div style="font-size:40px;margin-bottom:8px;">${ok ? "✅" : "⚠️"}</div>
      <h1 style="font-size:18px;color:#111;margin:0 0 8px;">${ok ? "Unsubscribed" : "Link not valid"}</h1>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">${message}</p>
    </div>
  </body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
