/**
 * Email Verification Engine — Zero Bounce Layer
 * 
 * Priority chain:
 * 1. If user has a ZeroBounce API key configured → use their account
 * 2. Otherwise → run our in-house SMTP handshake verification
 * 
 * In-house method performs:
 *   - Regex syntax check
 *   - MX DNS record lookup
 *   - SMTP RCPT TO handshake (without sending anything)
 */

import * as dns from "dns/promises";
import * as net from "net";

export type VerificationResult = {
  status: "VALID" | "INVALID" | "CATCH_ALL" | "DISPOSABLE" | "SPAMTRAP" | "UNKNOWN";
  score: number; // 0–10 quality score (10 = safest to send)
  reason: string;
  method: "third_party" | "in_house";
};

// Known disposable email domain list (subset — expand as needed)
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com",
  "sharklasers.com", "guerrillamail.info", "grr.la", "guerrillamailblock.com",
  "spam4.me", "yopmail.com", "maildrop.cc", "trashmail.com", "dispostable.com",
  "temp-mail.org", "fakeinbox.com", "einrot.com", "tempr.email",
]);

// ============================================================
// THIRD-PARTY: ZeroBounce API
// ============================================================
async function verifyWithZeroBounce(email: string, apiKey: string): Promise<VerificationResult> {
  try {
    const response = await fetch(
      `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}&ip_address=`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) throw new Error(`ZeroBounce API error: ${response.status}`);

    const data = await response.json();

    const statusMap: Record<string, VerificationResult["status"]> = {
      valid: "VALID",
      invalid: "INVALID",
      catch_all: "CATCH_ALL",
      unknown: "UNKNOWN",
      spamtrap: "SPAMTRAP",
      abuse: "SPAMTRAP",
      do_not_mail: "INVALID",
    };

    const scoreMap: Record<string, number> = {
      valid: 9,
      catch_all: 5,
      unknown: 4,
      invalid: 0,
      spamtrap: 0,
      abuse: 0,
      do_not_mail: 0,
    };

    const status = statusMap[data.status] || "UNKNOWN";
    const score = scoreMap[data.status] ?? 3;

    return {
      status,
      score,
      reason: data.sub_status || data.status,
      method: "third_party",
    };
  } catch (err: any) {
    console.warn(`ZeroBounce API failed for ${email}: ${err.message}. Falling back to in-house.`);
    return verifyInHouse(email);
  }
}

// ============================================================
// IN-HOUSE: Multi-layer SMTP Handshake Verification
// ============================================================
async function checkDisposable(domain: string): Promise<boolean> {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

async function resolveMxRecords(domain: string): Promise<string[]> {
  try {
    const records = await dns.resolveMx(domain);
    // Sort by priority (lower number = higher priority)
    return records
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange);
  } catch {
    return [];
  }
}

function smtpHandshake(mxHost: string, email: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false); // Treat timeout as unknown/risky
    }, 8000);

    const socket = net.createConnection(25, mxHost);
    let stage = 0;
    let buffer = "";

    const sendCmd = (cmd: string) => socket.write(`${cmd}\r\n`);

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\r\n");

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.substring(0, 3), 10);

        if (stage === 0 && code === 220) {
          stage = 1;
          sendCmd("EHLO mail-pilot-verify.com");
        } else if (stage === 1 && (code === 250 || code === 220)) {
          stage = 2;
          sendCmd("MAIL FROM:<verify@mail-pilot-verify.com>");
        } else if (stage === 2 && code === 250) {
          stage = 3;
          sendCmd(`RCPT TO:<${email}>`);
        } else if (stage === 3) {
          clearTimeout(timeout);
          sendCmd("QUIT");
          socket.destroy();
          // 250 or 251 = exists, 550/551/553 = does not exist
          resolve(code === 250 || code === 251);
          return;
        } else if (code >= 400) {
          // Temporary or permanent error
          clearTimeout(timeout);
          socket.destroy();
          resolve(false);
          return;
        }
      }
      buffer = "";
    });

    socket.on("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function verifyInHouse(email: string): Promise<VerificationResult> {
  // Step 1: Syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { status: "INVALID", score: 0, reason: "invalid_syntax", method: "in_house" };
  }

  const domain = email.split("@")[1].toLowerCase();

  // Step 2: Disposable check
  if (await checkDisposable(domain)) {
    return { status: "DISPOSABLE", score: 1, reason: "disposable_domain", method: "in_house" };
  }

  // Step 3: MX lookup
  const mxHosts = await resolveMxRecords(domain);
  if (mxHosts.length === 0) {
    return { status: "INVALID", score: 0, reason: "no_mx_records", method: "in_house" };
  }

  // Step 4: SMTP handshake against primary MX
  // NOTE: Many large providers (Gmail, Outlook) block SMTP probing and return 250 regardless
  // (this is the "catch-all" behavior). We still try and mark risky domains accordingly.
  const primaryMx = mxHosts[0];
  const knownCatchAllProviders = ["google.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com"];
  const isCatchAllProvider = knownCatchAllProviders.some((p) => primaryMx.includes(p));

  if (isCatchAllProvider) {
    // We can't definitively confirm via SMTP — mark as CATCH_ALL with medium score
    return { status: "CATCH_ALL", score: 6, reason: "major_provider_catch_all", method: "in_house" };
  }

  // For business/custom domains — attempt live SMTP probe
  try {
    const smtpResult = await smtpHandshake(primaryMx, email);
    if (smtpResult) {
      return { status: "VALID", score: 8, reason: "smtp_accepted", method: "in_house" };
    } else {
      return { status: "INVALID", score: 1, reason: "smtp_rejected", method: "in_house" };
    }
  } catch {
    return { status: "UNKNOWN", score: 3, reason: "smtp_error", method: "in_house" };
  }
}

// ============================================================
// MAIN EXPORT — Smart dispatcher
// ============================================================
export async function verifyEmail(
  email: string,
  zeroBounceApiKey?: string | null
): Promise<VerificationResult> {
  if (zeroBounceApiKey) {
    return verifyWithZeroBounce(email, zeroBounceApiKey);
  }
  return verifyInHouse(email);
}

/**
 * Bulk verify with concurrency control (max 5 simultaneous to avoid rate limiting)
 */
export async function verifyEmailBatch(
  emails: string[],
  zeroBounceApiKey?: string | null,
  concurrency = 5
): Promise<Map<string, VerificationResult>> {
  const results = new Map<string, VerificationResult>();
  
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((email) => verifyEmail(email, zeroBounceApiKey).then((r) => ({ email, result: r })))
    );
    for (const { email, result } of batchResults) {
      results.set(email, result);
    }
  }

  return results;
}
