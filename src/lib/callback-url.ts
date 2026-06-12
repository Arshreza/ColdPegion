/**
 * Sanitize a post-login callback URL. Only same-origin relative paths are
 * allowed (e.g. "/api/oauth/authorize?..."); anything absolute or
 * protocol-relative ("//evil.com") falls back to the dashboard so the login
 * page can't be used as an open redirect.
 */
export function sanitizeCallbackUrl(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
