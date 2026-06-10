import { lookup } from "dns/promises";
import net from "net";

/**
 * SSRF protection for server-side fetches of user-supplied URLs (website
 * scraping / product + company extraction). Blocks non-http(s) schemes and any
 * host that resolves to a private, loopback, link-local, or cloud-metadata
 * address — and re-validates across redirects.
 */

export class SsrfError extends Error {}

function ipIsBlocked(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true; // this-host, private, loopback
    if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true; // loopback / unspecified
    if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local
    if (v.startsWith("fe80")) return true; // link-local
    if (v.startsWith("::ffff:")) return ipIsBlocked(v.replace("::ffff:", "")); // IPv4-mapped
    return false;
  }
  return true; // unknown format — block
}

/** Validate a URL is safe to fetch; throws SsrfError otherwise. */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only http(s) URLs are allowed.");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new SsrfError("Requests to internal hosts are not allowed.");
  }

  // If the host is a literal IP, check it directly; otherwise resolve all A/AAAA.
  if (net.isIP(host)) {
    if (ipIsBlocked(host)) throw new SsrfError("Requests to private addresses are not allowed.");
  } else {
    const results = await lookup(host, { all: true }).catch(() => {
      throw new SsrfError("Could not resolve host.");
    });
    if (!results.length) throw new SsrfError("Could not resolve host.");
    for (const r of results) {
      if (ipIsBlocked(r.address)) throw new SsrfError("Requests to private addresses are not allowed.");
    }
  }

  return url;
}

/**
 * Fetch with SSRF protection. Follows up to `maxRedirects` hops, re-validating
 * the destination of every redirect (the classic SSRF bypass).
 */
export async function safeFetch(rawUrl: string, init: RequestInit = {}, maxRedirects = 3): Promise<Response> {
  let current = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafeUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new SsrfError("Too many redirects.");
}
