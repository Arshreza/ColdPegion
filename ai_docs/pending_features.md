# MailPilot AI — Pending Features

Status of everything not yet built, prioritized. Items marked **[building now]**
are implemented in this pass.

## Self-contained (no external paid API) — DONE ✅
1. **Email warmup system (#16)** — ✅ warmup-enabled mailboxes email each other
   on a ramping schedule with a tagged subject; received warmup mail is
   auto-engaged (one bounded reply) and marked read; excluded from inbox + stats.
   Worker poller (`WARMUP_INTERVAL_MINUTES`), UI toggle + daily max + tag per
   mailbox. (`lib/warmup/engine.ts`, `lib/queue/warmup-poller.ts`)
2. **DNC management** — ✅ block/unblock per prospect (UI + `PATCH /api/prospects/[id]`),
   status badge; sending already skips DNC; Sidekick `set_do_not_contact` tool.
3. **Spintax** — ✅ `{hi|hey|hello}` resolved at send time (`lib/spintax.ts`).
4. **Open & click tracking** — ✅ pixel (`/api/track/open/[id]`) + click redirect
   (`/api/track/click/[id]`), HTML built only when the agent's toggle is on.
5. **Agent cloning** — ✅ `POST /api/agents/[id]/clone`, list button, Sidekick
   `clone_agent` tool.

## Self-contained — DONE ✅ (second wave)
6. **Per-prospect timezone scheduling** — ✅ `Prospect.timezone`; the worker
   evaluates the agent's sending window in the prospect's local time (re-delays
   if outside). Importers map a `timezone` column.
7. **Sidekick conversation persistence** — ✅ conversations + messages persisted
   (`/api/sidekick/conversations`), hydrated on open, with a "New chat" control.
8. **Team Sidekick tools** — ✅ `list_team`, `approve_join_request`,
   `set_member_role` (admin-gated).
9. **A/B testing for sequences** — ✅ per-step subject/body variants, random pick
   at send, `Email.variantId` tracking + per-variant reply stats.

## Requires external integration
10. **Subscriptions & billing (#17, Stripe)** — ✅ BUILT (plans, usage caps,
    checkout, portal, webhook, billing page). Inert until Stripe keys are set;
    plan **limits are enforced regardless** (mailboxes, seats, daily emails).
11. **Live Instantly/Apollo list import (#11/#12)** — not yet built; Apollo
    *people search* works via `APOLLO_API_KEY`. (Pulling saved lists needs their
    list APIs.)

## Launch-readiness fixes (this pass)
- Removed hardcoded sidebar "150/500" → real `/api/usage` (today's sends vs the
  effective plan limit) and links to Billing.
- Topbar "Ask AI" launcher + AI Sidekick button now open the Sidekick
  (`mp:open-sidekick` event); removed the dead search box and fake notification
  bell.

---

# PENDING TASKS (prioritized)

## P0 — launch blockers / correctness — DONE ✅
- [x] **Mailbox & agent daily counters now reset** in the worker when a new UTC
  day starts (`EmailAccount.sentToday` and `Agent.sentToday`), so sending no
  longer dies on day two.
- [x] **`List-Unsubscribe` (one-click) + footer link** added to every campaign
  email (RFC 8058 headers + body link, text & HTML), backed by a public
  `/api/unsubscribe/[token]` route (HMAC-signed token) that sets `isDnc` and
  pauses active enrollments. Warmup/internal mail is excluded.

## P1 — mostly DONE ✅
- [x] **Prisma migrations** — baseline migration generated at
  `prisma/migrations/0_init/migration.sql` (+ `migration_lock.toml`). Use
  `prisma migrate deploy` on fresh DBs; on an existing `db push` DB, baseline with
  `prisma migrate resolve --applied 0_init` then `migrate deploy`.
- [x] **Bounce handling** — the IMAP sync detects bounce/NDR mail (MAILER-DAEMON,
  DSN subjects, 5.1.1/550), extracts the failed recipient, sets the prospect to
  `INVALID` + DNC, marks the original send `BOUNCED`, and stops the enrollment.
- [x] **Distributed rate limiting** — `lib/security/rate-limit.ts` now uses Redis
  (`REDIS_URL`) shared across instances, with in-memory fallback.
- [x] **Worker durability** — hourly maintenance job resets daily counters even
  for idle accounts (`lib/queue/maintenance-poller.ts`); the worker also resets
  per-job.
- [ ] **Live Instantly/Apollo saved-list import** — still open (needs their list
  APIs). Apollo *people search* already works via `APOLLO_API_KEY`.

## P2 — polish / nice-to-have
- [ ] **Sidekick history browser.** We persist + hydrate the latest conversation;
  add a list UI to switch between past conversations.
- [ ] **Custom tracking domain** for open/click links (deliverability).
- [ ] **HYBRID sequence mode** isn't differentiated from AI_GENERATED yet.
- [ ] **Automated tests** (unit/integration/e2e) — none currently.
- [ ] **Error monitoring** (e.g. Sentry) + structured logging.
- [ ] Lint cleanup of codebase-wide `any` / setState-in-effect conventions.

## User / ops tasks (not code)
- [ ] `npx prisma db push` on `main`.
- [ ] Set required env: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
  `ENCRYPTION_MASTER_KEY`, `REDIS_URL`.
- [ ] Run the worker (`npm run worker`) under a process manager.
- [ ] Configure sending-domain **SPF / DKIM / DMARC** (critical for deliverability).
- [ ] Optional: Google/Microsoft OAuth apps, `APOLLO_API_KEY`, transactional
  email (`RESEND_API_KEY`/SMTP), Stripe keys + webhook + prices.
