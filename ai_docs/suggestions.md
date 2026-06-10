# MailPilot AI — Launch Readiness Checklist

_Updated: 2026-06-09_

> Items below are the minimum bar for publishing to real users.
> Everything else (UX polish, new features, code quality) can follow post-launch.

---

## Blockers — Must Fix Before Launch

### Security

**1. Hardcoded credentials in scratch/**
`scratch/test-db-connection.js` has a live Neon connection string with the password. Add `scratch/` to `.gitignore` and rotate the database password now — before any code is public.

**2. Resend webhook signature verification**
`src/app/api/webhooks/resend/route.ts` accepts events without checking the `Svix-Signature` header. Any attacker can POST fake delivery/bounce/open events and corrupt campaign stats or trigger false unsubscribes. Add the `svix` package and verify the signature before touching the database.

**3. Stripe webhook raw body**
`src/app/api/billing/webhook/route.ts` — verify that `stripe.webhooks.constructEvent` receives the raw `Buffer` body (via `request.arrayBuffer()`), not parsed JSON. If Next.js parses it first, signature validation silently fails and billing events are ignored.

### Reliability

**4. Redis eviction policy**
BullMQ requires `noeviction`. Upstash defaults to `optimistic-volatile`, which silently drops queued jobs under memory pressure. Set it in Upstash dashboard: Database → Eviction Policy → `noeviction`. Without this, campaigns randomly stop mid-send.

**5. Process manager for the worker**
`npm run worker` has no supervisor. When the worker process crashes (and it will), email sending stops silently. At minimum: `pm2 start npm --name mailpilot-worker -- run worker` and document it. Better: add a `worker` service to `docker-compose.yml`.

**6. Redis persistence**
If Redis restarts without persistence enabled, all queued BullMQ jobs are lost mid-campaign. Enable RDB or AOF on Redis, or use a Redis Cloud plan with durability. Without this a server restart wipes active campaigns.

### Core UX (breaks the main user flow)

**7. Org invite email**
`POST /api/org/invites` creates an invite record but sends no email to the invitee. Invited users have no way to know they were invited and will never join. Wire up `src/lib/email/transactional.ts` to send the invite link.

**8. Toast feedback on async actions**
Launching a campaign, syncing the inbox, and importing prospects give no visible confirmation. Users re-click buttons thinking nothing happened and end up with duplicate jobs. Add `sonner` (fits the existing stack) and fire a success/error toast on every async action.

**9. Import deduplication**
`POST /api/prospects/import` adds every row without checking for existing emails. A second CSV upload creates duplicate prospects and double-sends. Add a server-side upsert on the existing unique constraint and return "X added, Y skipped" to the UI.

**10. Error monitoring**
Worker crashes and API errors are invisible. Without Sentry (or equivalent), you will have no idea why campaigns are failing for users. Add `@sentry/nextjs` + `@sentry/node` before onboarding anyone.

---

## Ship Shortly After Launch (Week 1–2)

**11. Mailbox health indicator**
A broken OAuth token or failed IMAP sync silently stops reply detection. Show a colored status dot per mailbox in `/dashboard/accounts` based on last sync time and bounce rate. Users need to know when their mailbox is broken.

**12. Daily send cap visibility**
Users have no idea how close they are to their billing plan's daily limit. Add a "X / 500 sent today" counter to the dashboard header so they don't hit the wall mid-campaign without warning.

**13. Sequence step preview**
Let users preview a rendered email with real prospect variable substitution before launching. Catches `Hi {firstName}` → `Hi undefined` before it goes to 500 people. Saves support tickets.

**14. SPF/DKIM/DMARC setup guide**
Deliverability only works if DNS records are correct. Most users won't know how to configure them. Add a step-by-step setup checklist in the deliverability page — even a static guide is better than nothing.

**15. Prisma migrations**
Switch from `prisma db push` (destructive, untracked) to `prisma migrate dev` / `prisma migrate deploy`. Once real users have data in production, a bad `db push` can destroy it.
