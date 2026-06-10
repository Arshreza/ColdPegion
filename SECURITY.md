# Security

This document summarizes MailPilot AI's security posture and how to report issues.

## Authentication & SSO
- **Providers:** email/password (bcrypt, cost 12), Google OAuth, and **Microsoft
  Entra ID (Azure AD)**. OAuth providers are only enabled when their env vars are
  present, so a missing app never breaks auth.
- **Sessions:** JWT strategy with a 7‑day max age; `trustHost` is enabled for
  managed/proxied deployments. Cookies are HTTP‑only and `Secure` in production
  (NextAuth defaults).
- OAuth sign‑ups are routed into an organization (invite → work‑domain join
  request → new org) via the `createUser` event, matching the credentials flow.

## Authorization & multi‑tenancy
- Every API route checks the session and scopes queries by `userId`, and—where
  relevant—by `organizationId`.
- Mailbox sharing/assignment and team management are gated by org role
  (`OWNER`/`ADMIN`); only an `OWNER` can grant/revoke `OWNER`.
- Pending members (unapproved join requests) are blocked from the dashboard.

## Secrets at rest
- All third‑party credentials (LLM API keys, Gmail app passwords, Resend keys,
  SMTP/IMAP passwords, ZeroBounce keys) are encrypted with **AES‑256‑GCM**
  (`ENCRYPTION_MASTER_KEY`, 32‑byte hex) before storage and never returned by GET
  endpoints.

## SSRF protection
- Server‑side fetches of user‑supplied URLs (website scraping, product/company
  extraction) go through `lib/security/ssrf.ts`, which:
  - allows only `http(s)`,
  - blocks `localhost`/`*.internal`/`*.local`,
  - resolves DNS and blocks private, loopback, link‑local, CGNAT and
    cloud‑metadata (`169.254.169.254`) addresses,
  - **re‑validates every redirect hop** (the classic SSRF bypass).

## Rate limiting
- Sensitive endpoints are rate‑limited per IP (`lib/security/rate-limit.ts`):
  registration (5 / 10 min), AI Sidekick (30 / min), lead search (30 / min),
  and each URL‑fetch endpoint (20 / min). In‑memory by default; back it with
  Redis for multi‑instance deployments.

## HTTP security headers
Set globally in `next.config.ts`:
`Content-Security-Policy` (object‑src `none`, base‑uri `self`, form‑action
`self`, frame‑ancestors `none`), `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and
`Strict-Transport-Security` (production). `X-Powered-By` is disabled.

## Input validation
- All request bodies are validated with `zod`.

## Deliverability safety
- Per‑mailbox/per‑domain send limits, org‑level load balancing, randomized send
  delays (capped at 10 min), DNC handling, and unsubscribe auto‑honoring reduce
  spam/abuse risk.

## Reporting a vulnerability
Email the maintainer or open a private security advisory. Please do not file
public issues for sensitive vulnerabilities.

## Operator checklist
- Set a strong, unique `NEXTAUTH_SECRET` and a 64‑hex `ENCRYPTION_MASTER_KEY`
  (never change the latter after data exists).
- Serve only over HTTPS in production; set `NEXTAUTH_URL` to the real origin.
- Restrict database and Redis network access; rotate OAuth client secrets.
