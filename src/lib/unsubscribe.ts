import crypto from "crypto";

// HMAC-signed, stateless unsubscribe tokens (no schema changes needed).
function key(): string {
  return process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_MASTER_KEY || "coldpigeon-unsub-key";
}

export function makeUnsubToken(prospectId: string): string {
  const sig = crypto.createHmac("sha256", key()).update(prospectId).digest("base64url").slice(0, 24);
  return `${Buffer.from(prospectId).toString("base64url")}.${sig}`;
}

export function verifyUnsubToken(token: string): string | null {
  const [enc, sig] = (token || "").split(".");
  if (!enc || !sig) return null;
  let prospectId: string;
  try {
    prospectId = Buffer.from(enc, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", key()).update(prospectId).digest("base64url").slice(0, 24);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return prospectId;
}
