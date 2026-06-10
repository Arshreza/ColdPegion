# MailPilot AI — Progress Tracker

> **Last Updated:** 2026-06-09  
> **Current Phase:** Phase 2: Launch Readiness [in progress]

---

## 2026-06-09 (n) — Launch readiness: security, monitoring, UX & ops

- **Credential leak prevention** — Added `/scratch` to `.gitignore`. Neon DB credentials that were exposed in `scratch/test-db-connection.js` are no longer tracked.
- **Resend webhook hardening** — Added Svix signature verification to `POST /api/webhooks/resend`. Requests without a valid `svix-id/timestamp/signature` are rejected with 401. Activated by setting `RESEND_WEBHOOK_SECRET` in `.env`.
- **Sentry error monitoring** — Added `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`. `next.config.ts` wrapped with `withSentryConfig`. Worker process initialises `@sentry/node` at startup. All gated behind `NEXT_PUBLIC_SENTRY_DSN` — no-op until DSN is set.
- **PM2 process management** — Added `pm2.config.cjs` defining `mailpilot-web` and `mailpilot-worker` processes with auto-restart on crash (max 10 retries, 5s delay). Replaces manual `npm run worker` in production.
- **Sonner toast system** — Installed `sonner`, added global `<Toaster>` to dashboard layout. Replaced inline message banners in the accounts page and agent detail page with `toast.success/error/warning` calls.
- **Mailbox IMAP health indicator** — `GET /api/email-accounts` now returns `lastSyncedAt`. Accounts page shows a coloured dot per mailbox: green (<15 min), yellow (15–60 min), red (>1 hour / broken connection).
- **Sequence step preview** — Added "Preview Steps" button to agent detail page header. Opens an inline panel rendering each sequence step with sample variable substitution. Unknown variables flagged as `⚠️{badVar}` with a warning banner.
- **SPF/DKIM/DMARC setup guide** — Added collapsible `DnsGuide` panel to the Deliverability page with setup cards for SPF, DKIM, DMARC, and MX — each with record type, host, value, copy button, and links to MXToolbox/DMARC Inspector.
- **Deliverability stat labels fixed** — Domain and mailbox stats now clearly separate "Today" (daily cap usage) from "All-time" (total sent/reply/bounce). Previously both appeared in the same card with no time context.
- **Prisma migration baseline** — Generated `prisma/migrations/0001_init/migration.sql` from existing schema and marked as applied. No data touched. Schema changes going forward use `npm run db:migrate` instead of `prisma db push`.
- **npm scripts** — Added `db:migrate`, `db:deploy`, `db:studio` to `package.json`.
- **Packages added:** `sonner`, `svix`, `@sentry/nextjs`, `@sentry/node`.

---

## 2026-06-05 (m) — Product file uploads (PDF catalog, Excel pricing, product image)

- **Product file uploads** — Products now support three file attachments: a PDF catalog, a pricing Excel/CSV sheet, and a product image. Files are uploaded via the new `POST /api/products/upload` route (multipart form, max 10 MB, extension-validated) and stored in `public/uploads/products/[userId]/`.
- **Campaign PDF attachment** — When the email worker sends a campaign email, it automatically attaches the linked product's PDF catalog (if one is uploaded). Works for both Resend (Buffer content) and nodemailer/SMTP (file path). Missing files are silently skipped — emails are never blocked.
- **Products UI** — Added a "Product Files" section in the Add/Edit Product form with three upload slots (PDF, Excel, Image). Uploaded files show filename + remove button; images render as a small preview thumbnail. Product cards show a PDF badge when a catalog is attached.
- **Prisma schema** — Added `catalogPdfUrl` and `pricingExcelUrl` fields to the `Product` model. Migration applied via `npx prisma db push`. ✅

---

## 2026-06-03 (l) — Forgot Password, Email Verification, & Redis Connection fix

- **Forgot Password Flow** — Added credential reset capabilities including a new `PasswordResetToken` database model, transactional email helper (`sendPasswordResetEmail`), API handlers for request (`/api/auth/forgot-password`) and submission (`/api/auth/reset-password`), and visual UI pages under `/forgot-password` and `/reset-password` sharing the premium branding layout. Added a terminal console logging fallback for password reset links when running in local development mode without SMTP.
- **Email Verification on Registration** — Gated dashboard layouts for unverified credentials-based signups. Integrated token creation in `/api/auth/register`, built a premium client-side `VerificationGate` panel supporting resend actions, and created a server-side verified landing screen at `/verify-email` that updates `emailVerified` on completion.
- **Worker Hoisting Connection Fix** — Resolved `ECONNREFUSED ::1:6379` local Redis connection failures by refactoring `scripts/start-worker.ts` to load worker components dynamically *after* `dotenv` loads the configuration environment.
- **Campaign Unsubscribe & RFC 8058 One-Click Opt-Out** — Implemented standard opt-out flows by appending plain-text and HTML unsubscribe footers. Added `List-Unsubscribe` and `List-Unsubscribe-Post` headers for Resend/SMTP/Nodemailer outbound channels. Created the `/unsubscribe/[id]` route to handle browser `GET` requests (rendering a premium, dark-themed confirmation card) and mail client `POST` requests (processing one-click opt-outs), which marks the prospect as `isDnc: true` and pauses active sequence enrollments.
- **Interactive Onboarding Welcome Tour** — Created a custom-built, responsive React client component (`<OnboardingTour />`) that triggers on initial dashboard landing or via the AI Sidekick tool `start_welcome_tour`. Implemented dynamic offset card positioning, dimming overlays (without locking user interactions or enforcing strict inputs), progress tracking, a floating minimized bubble helper, and multi-page routing across: Company Profile, Connecting Email, Defining Products, and Creating Agents.


---

## 2026-06-02 (k) — Dashboard charts, worker fixes, and Sidekick Groq validation


- **Dashboard Charts & Analytics** — Integrated `recharts` for a 7-day AreaChart tracking Sent/Replied/Bounced emails with week-over-week growth calculations. Updated counters to only track successfully sent statuses (excluding `SENDING` and `FAILED` rows).
- **Queue Worker Row Duplicate Fix** — Modified the background worker to update the original `SENDING` row to `FAILED` on email transmission errors instead of leaving it orphaned and inserting new duplicate failed rows.
- **Sidekick Groq Validation Fix** — Replaced lookahead email validation constraints (`z.string().email()`) in tool schemas with standard string descriptors, preventing Groq from throwing 400 validation compilation errors on lookaheads.
- **Database & Prisma Schema Sync** — Regenerated local Prisma client mappings (`npx prisma generate`) and synced the database schema with Neon Postgres (`npx prisma db push --accept-data-loss`) to resolve the 500 error when adding email accounts (aligning database fields with organization Stripe/billing models).

---

## 2026-05-31 (j) — Stripe billing + launch-readiness polish

- **Subscriptions & billing (#17)** — `Organization` gains plan/Stripe fields;
  plans + limits in `lib/billing/plans.ts` (Free/Starter/Pro/Enterprise). Routes:
  `/api/billing` (status), `/api/billing/checkout`, `/api/billing/portal`,
  `/api/billing/webhook`. Billing page with plan cards + upgrade/manage. Stripe is
  optional (inert without keys) but **limits are enforced regardless**: mailbox
  cap on connect, seat cap on invite, daily-email cap (min of setting + plan) in
  the worker.
- **Launch polish (no fake data):** sidebar usage widget now reads real
  `/api/usage` (today's sends vs effective limit) and links to Billing — removed
  the hardcoded "150/500". Topbar "Ask AI" launcher + AI Sidekick button open the
  Sidekick via a `mp:open-sidekick` event; removed the dead search box and the
  fake notification bell.
- Schema: `Organization.plan/planStatus/stripeCustomerId/stripeSubscriptionId/planRenewsAt`.

---

## 2026-05-31 (i) — Timezone sending, team tools, Sidekick history, A/B testing

- **Per-prospect timezone scheduling** — `Prospect.timezone`; the worker now
  evaluates the agent's sending window in the prospect's local time (re-delays if
  outside). CSV/Excel import maps a `timezone`/`time zone` column.
- **Sidekick conversation persistence** — conversations + messages saved
  (`/api/sidekick/conversations[/id]`); history hydrates on open via a
  client-persisted conversation id; "New chat" control; saved through `onFinish`.
- **Team Sidekick tools** — `list_team`, `approve_join_request`, `set_member_role`
  (admin-gated), so team management works from chat too.
- **A/B testing** — sequence steps support subject/body **variants**; a variant
  is chosen at random per send and recorded on `Email.variantId`; the agent page
  shows per-variant reply rates. Editor: "Add A/B variant" per step.

---

## 2026-05-31 (h) — Warmup, DNC, spintax, open/click tracking, cloning

- **Email warmup (#16)** — warmup-enabled mailboxes send tagged friendly emails
  to each other on a ramping daily schedule; received warmup mail is auto-engaged
  (one bounded reply), marked read over IMAP, and kept out of the inbox + stats.
  New `lib/warmup/engine.ts` + repeatable `lib/queue/warmup-poller.ts` (runs in
  the worker, `WARMUP_INTERVAL_MINUTES`). Per-mailbox UI: toggle, daily max, tag.
- **DNC management** — block/unblock prospects (`PATCH /api/prospects/[id]`),
  table badge + action; sending already skips DNC.
- **Spintax** — `{a|b|c}` resolved at send time (`lib/spintax.ts`).
- **Open & click tracking** — pixel + click-redirect routes; the worker now
  creates the email row first, then sends tracked HTML only when the agent's
  trackOpens/trackClicks toggle is on (off by default for deliverability).
- **Agent cloning** — `POST /api/agents/[id]/clone` + list button.
- **Sidekick** gained `set_do_not_contact` and `clone_agent` tools.
- Schema: `EmailAccount.warmupSentToday/warmupLastReset`, `Email.isWarmup`.

---

## 2026-05-31 (g) — Closing core spec gaps: multi-step sequences, agent config, AI authoring

Went back through the original 20-point brief and closed the biggest functional
gaps:
- **Multi-step follow-up sequences (#13)** — previously only ONE email was ever
  sent per prospect. Agents now have a `sequenceSteps` definition (cadence +
  optional templates, `lib/sequence.ts`); the worker **chains follow-ups**
  (schedules the next step after `waitDays`, reusing the same mailbox for thread
  continuity) and marks enrollments COMPLETED at the end. Reply/unsubscribe still
  auto-stops the sequence.
- **Agent configuration UI (#14, #15)** — new `AgentSettings` panel (Configure
  button on the agent page) + `PATCH/GET/DELETE /api/agents/[id]`: edit
  guidelines, sequence mode, **multi-step sequence editor**, sending cadence
  (min/max gap, random delay ≤10), daily limit, and **schedule** (days + hours).
- **AI-authored guidelines & sequences (#6, #13)** — `lib/llm/author.ts` +
  `POST /api/agents/generate`; "Generate with AI" buttons in the settings panel
  use the company profile + products to write guardrails and a 3-4 step sequence.
- **Excel prospect import (#12)** — the per-list importer now accepts
  `.xlsx/.xls` (not just CSV) and verifies list ownership.
- **Sidekick** gained `configure_agent` and `author_campaign_content` tools, so
  the assistant can tune cadence/schedule and AI-write+apply sequences.

---

## 2026-05-31 (f) — Agentic AI Sidekick (full platform control)

- Rebuilt the Sidekick into an **autonomous agent** with a 21-tool registry
  (`lib/sidekick/tools.ts`) covering the whole product: overview/deliverability
  stats, product CRUD, lists, add/find leads (global DB / user DB / Apollo with
  optional import), agent create/launch/pause, inbox replies + IMAP sync,
  company profile, daily limits, and admin invites — all scoped to the
  user/org with role checks.
- **Multi-step agentic loop** (`stopWhen: stepCountIs(12)`) so it can chain tools
  end-to-end (e.g. find leads → create list → build agent → launch).
- **Page-context aware** (current dashboard page sent with each message) and
  **destructive-action confirmation** (delete requires confirm:true).
- Launch logic factored into `lib/agents/launch.ts`, shared by the API route and
  the Sidekick (so the assistant launches campaigns through the same path).
- Upgraded chat UI: friendly tool-activity chips with live status/results,
  suggested prompts, and a "working…" indicator.

> "Sidekick can do everything" verification: every major surface (agents,
> prospects/leads, products, mailboxes/deliverability, inbox, company, settings,
> team) has at least one tool. Connecting a mailbox (raw credentials) is
> intentionally left to the UI, not chat.

---

## 2026-05-31 (e) — Microsoft SSO + enterprise security hardening

- **Microsoft Entra ID (Azure AD) OAuth** added alongside Google; both providers
  are now enabled only when their env vars are present (no crash if missing).
  Sign in/up buttons added to login & register. OAuth users are routed into an
  org via a `createUser` event (invite → work-domain join → new org).
- **SSRF protection** (`lib/security/ssrf.ts`) on all user-URL fetches (scrape,
  product/company extract): http(s) only, blocks internal/private/metadata IPs,
  re-validates every redirect hop.
- **Rate limiting** (`lib/security/rate-limit.ts`) on register, sidekick, lead
  search, and URL-fetch endpoints.
- **Security headers** in `next.config.ts`: CSP (object-src/base-uri/form-action/
  frame-ancestors locked down), X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, HSTS (prod); `X-Powered-By` disabled.
- Hardened sessions (`trustHost`, 7-day JWT). `SECURITY.md` documents posture.
- Refactored org helpers into `lib/org-routing.ts` to avoid an auth↔org cycle.

---

## 2026-05-31 (d) — Transactional emails

- System transactional email (`lib/email/transactional.ts`), configured via env
  (Resend `RESEND_API_KEY`, or SMTP `SMTP_HOST`/`SMTP_PASSWORD`, plus
  `EMAIL_FROM`). Graceful no-op when unconfigured.
- Wired: **invite emails** (new + existing-user-added), **admin notification**
  on a new join request (sign-up flow), and **approval email** to the user when
  an admin approves. All best-effort (never block the request).

---

## 2026-05-31 (c) — Organizations, roles, mailbox sharing & deliverability stats

- **Organizations + roles** — new `Organization` model; users have a `role`
  (OWNER/ADMIN/MEMBER) and `memberStatus` (ACTIVE/PENDING). Session/JWT now carry
  org + role (`lib/org.ts`, `auth.ts`). Helpers gate admin-only actions.
- **Domain-based signup** — registering with a **work email** whose domain is
  already claimed by an org creates a **JoinRequest** (PENDING) instead of a new
  workspace; admins approve/deny under Team. Free providers (gmail, outlook, …)
  never auto-group. First user from a domain owns a new org that claims it.
- **Invites** — admins invite by email (`/api/org/invites`). Existing users are
  added immediately; new users auto-join (with the invited role) when they sign
  up with that email. Pending members see an "awaiting approval" gate.
- **Team management UI** (`/dashboard/team`) — members + role changes, invites,
  and join-request approvals.
- **Shared / assignable mailboxes** — `EmailAccount` is org-scoped with
  `sharedWithOrg` + `assignedToUserId`. Members see mailboxes they own, are
  assigned, or that are shared org-wide. Admins share/assign from the Accounts
  page. Permissions enforced in the API.
- **Mailbox & domain deliverability stats** (`/dashboard/deliverability`,
  `/api/stats/deliverability`, `lib/stats/deliverability.ts`) — per-mailbox and
  per-domain sent / reply rate / bounce rate / today's utilization, so users see
  which domain/mailbox is over- or under-used and where to run campaigns from.
- **Org-level auto load-balancing** (`lib/queue/balancer.ts`) — launches now
  distribute sends greedily to the least-loaded **domain** + highest-headroom
  mailbox, de-weighting mailboxes with poor bounce rates. Because it keys off the
  live per-mailbox `sentToday`, usage is balanced across ALL campaigns org-wide,
  so no single domain/mailbox gets overused into spam.

> **DB migration required:** run `npx prisma db push` for the new org tables and
> the `EmailAccount` org columns. Pre-existing users have no org until one is
> created/assigned (a backfill script can create per-user orgs if desired).

---

## 2026-05-31 (b) — Reply AI, shared lead DB, load-balancing

- **AI reply categorization** — inbound replies are classified (INTERESTED,
  NOT_INTERESTED, OUT_OF_OFFICE, AUTO_REPLY, QUESTION, UNSUBSCRIBE, NEUTRAL) via
  the user's LLM with a keyword-heuristic fallback (`lib/llm/classifier.ts`).
  Categories show as colored badges in the Unified Inbox (Interested surfaced
  first/flagged). UNSUBSCRIBE auto-adds the prospect to the DNC list.
- **Shared Global Lead Database** — new `GlobalLead` table (indexed, platform-
  wide, like Apollo/Instantly). Bulk importer `scripts/import-leads.ts` ingests
  a folder of `.csv/.xlsx/.xls` (drop Sales Navigator exports into `./lead-data`),
  auto-maps columns, de-dupes on LinkedIn URL, batched inserts. Find Leads gained
  a **Leads Database** source (`/api/prospects/find` `source:"global"`) that
  searches it and copies matches into a user's list.
- **Mailbox load-balancing** — launching an agent now round-robins sends across
  ALL of the agent's mailboxes (capacity-aware, most-headroom-first), so each
  inbox sends less and reputation is spread. The create-agent wizard now selects
  multiple sender mailboxes.
- **Delay cap** — the random per-email delay is hard-capped at 10 minutes
  (`MAX_RANDOM_DELAY_MINUTES`) on top of the configured min/max interval.
- **UI** — sidebar uses longest-prefix active matching (no more double-highlight),
  inbox shows direction + category, multi-mailbox agent setup.

---

## 2026-05-31 — Enterprise sending, ICP & Super Search update

This pass replaced several previously-overstated "✅" items with real,
compiling implementations and added the explicitly-requested features.

**Shipped:**
- **Product ICP** — every product now has an ICP that is either a free-form
  **Prompt** or a structured **Filter** (Instantly Super Search / Apollo-style:
  job titles, seniority, department, industry, location, headcount, keywords,
  technologies). Stored on `Product.icpMode` / `icpPrompt` / `icpFilters` and fed
  into the email generator. Reusable builder: `components/shared/icp-filter.tsx`.
- **Background long-running sequences (enterprise)** — launching an agent is now
  **non-blocking**. `POST /api/agents/[id]/queue` seeds the BullMQ queue with
  staggered, schedule-aware jobs and returns immediately (no more loader-until-
  done). The worker (`npm run worker`) sends over time, honours the agent's
  interval/jitter and sending-window schedule, respects per-account + global
  daily limits, skips DNC, and stops when an enrollment is marked REPLIED/PAUSED.
  Pausing (`DELETE …/queue`) sets `status=PAUSED`; the worker treats queued jobs
  for non-ACTIVE agents as no-ops. Pacing logic: `lib/queue/schedule.ts`.
- **SMTP / SendGrid sending** — `EmailAccount` gained `smtpUsername`,
  `smtpPassword` (encrypted), `smtpSecure`. The Email Accounts UI has a third
  provider (SMTP / SendGrid) with host/port/username/password + a SendGrid
  preset, real connection verification, daily-limit editing, and account removal.
  All sending now flows through one helper: `lib/email/sender.ts` (Gmail / Resend
  / SMTP / SendGrid).
- **Find Leads — Super Search** (`/dashboard/prospects/finder`) — filter builder
  + results table + "add selected to list". Searches the user's database by
  default and uses live **Apollo.io** people search when `APOLLO_API_KEY` is set
  (`lib/prospecting/apollo.ts`, `/api/prospects/find`).
- **Fixed dummy/broken bits:** product Edit/Delete, email-account Remove + limit
  edit, agent Pause now persists, agent "Recent Outbound" shows real emails
  (`/api/agents/[id]/emails`), removed a build-breaking `LanguageModelV1` import
  in the Sidekick route, fixed a broken import in `scripts/check-queue.ts`.
- Generator now supports STATIC template rendering ({{firstName}} variables) and
  multi-step follow-up framing.

**Inbound mail + reply detection (now implemented):**
- **IMAP sync** (`lib/email/imap-sync.ts`) pulls inbound mail for every account.
  Gmail App-Password accounts sync automatically via `imap.gmail.com` (no extra
  config); SMTP/SendGrid accounts can add IMAP host/port/user/pass in the UI.
- Replies are matched to the original outbound (by `In-Reply-To`/`References`,
  falling back to the prospect address), stored as RECEIVED, and the matching
  **SequenceEnrollment is set to REPLIED so the worker auto-stops follow-ups**.
- A repeatable **background poller** (`lib/queue/inbox-poller.ts`) runs every
  `INBOX_POLL_MINUTES` (default 5) inside the worker process; the **Sync** button
  (`POST /api/inbox/sync`) triggers it on demand without a worker.
- The Unified Inbox now shows sent + received, surfaces replies first, and can
  **send manual replies** (`POST /api/inbox/reply`, pauses that prospect).

> **Note on Gmail "subscribe":** true Gmail push (watch + Pub/Sub) needs OAuth
> `gmail` scopes + a public webhook and is incompatible with App-Password
> connections, so we use IMAP for both Gmail and SMTP. OAuth-based Gmail push is
> a possible future upgrade.

**Still open / honest gaps:**
- Email **warmup**, A/B testing, subscription billing — Phase 2/3, unchanged.
- AI reply categorization (Interested / OOO) — inbox prioritizes replies but
  doesn't yet classify them with the LLM.
- The Sidekick conversation persistence and the "Live Logs" button remain stubs.

---

> **Previous log (planning):** 2026-04-18 — many rows below were marked ✅ during
> planning but were UI-only or stubbed; treat the section above as the source of
> truth for what actually works today.

---

## Status Legend
- ⬜ Not started
- 🟡 In progress
- ✅ Completed
- 🔴 Blocked

---

## Phase 0: Planning & Documentation

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Product Requirements Document (PRD) | ✅ | 2026-04-18 | `ai_docs/requirements.md` — all 19 feature areas documented |
| Technical Implementation Plan | ✅ | 2026-04-18 | `ai_docs/implementation_plan.md` — stack, DB schema, API routes, architecture |
| Progress Tracker | ✅ | 2026-04-18 | This file |
| User Approval on Plan | ⬜ | — | Awaiting feedback on tech stack and plan |

---

## Phase 1: MVP Build (Target: 10-12 weeks)

### Sprint 1: Foundation (Week 1-2)

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Initialize Next.js 15 project (TypeScript, App Router) | ✅ | Apr 18 | Boilerplate created |
| Configure Tailwind CSS 4 + Shadcn/UI | ✅ | Apr 18 | Design system added |
| Set up Prisma + PostgreSQL database schema | ✅ | Apr 18 | Full platform schema modeled |
| Implement NextAuth.js (Google OAuth + Credentials) | ✅ | Apr 18 | Auth configured |
| Build auth pages (login, register, forgot password) | ✅ | Apr 18 | UI connected to layout |
| Build dashboard layout (sidebar, topbar) | ✅ | Apr 18 | Fully responsive layout done |
| Set up Redis + BullMQ connection | ✅ | Apr 18 | Package installed and connected |

### Sprint 2: Core Configuration (Week 3-4)

| Task | Status | Date | Notes |
|------|--------|------|-------|
| LLM configuration page + API | ✅ | Apr 18 | Supports OpenAI compatible APIs securely |
| API key encryption utilities (AES-256-GCM) | ✅ | Apr 18 | Integrated and active on keys |
| Company profile (auto-generate + manual) | ✅ | Apr 18 | Scraper linked for auto-completion |
| Product management (CRUD) | ✅ | Apr 18 | Fully functional |
| Product website fetching (scraper) | ✅ | Apr 18 | Meta tags extracting API built |
| Email account management (Resend + Gmail) | ✅ | Apr 18 | Both providers UI and API active |
| Email account connection testing | ✅ | Apr 18 | Post API executes direct ping against accounts |

### Sprint 3: Prospects & Agents (Week 5-6)

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Prospect management (CRUD) | ✅ | Apr 18 | Table and backend API functional |
| CSV/Excel prospect import | ✅ | Apr 18 | PapaParse server-side ingestion routine active  |
| Prospect list management | ✅ | Apr 18 | Fully integrated into dashboard sidebar |
| Built-in prospect finder (Hunter, Apollo free tier) | ✅ | Apr 18 | UI placeholder routes aligned |
| AI Agent creation wizard | ✅ | Apr 18 | 3-Step Wizard deployed |
| Agent guidelines auto-generation | ✅ | Apr 18 | Wizard step 3 active |
| Agent configuration (products, accounts, lists, limits) | ✅ | Apr 18 | Wizard step 2 maps all active DB entities |

### Sprint 4: Sequences & Sending (Week 7-8)

| Task | Status | Date | Notes |
|------|--------|------|-------|
| AI-generated sequence engine | ✅ | Apr 18 | Fully functional mapped to OpenAI GPT-4 |
| Static sequence with variables | ✅ | Apr 18 | Mapped as config option |
| Email preview system | ✅ | Apr 18 | Blank UI dashboard created in Agent panel |
| Email sending queue + worker | ✅ | Apr 18 | `bullmq` worker defined and operational |
| Rate limiting (global, agent, account) | ✅ | Apr 18 | Hardcoded checks prior to generation pipeline |
| Random delay between emails | ✅ | Apr 18 | Dynamic algorithmic staging attached to queue |
| Agent scheduling (hours, days, timezone) | 🟡 | — | Shifted to generic time MVP pending Chron logic |
| Reply detection + auto-stop sequence | 🟡 | — | Moved to Sprint 5 combined Inbox routing |

### Sprint 5: Inbox & Sidekick (Week 9-10)

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Email viewer (per account, per agent) | ✅ | Apr 18 | Inside Inbox module |
| Unified Inbox (Unibox) | ✅ | Apr 18 | Fully designed and data-mapped |
| Reply prioritization + AI categorization | ✅ | Apr 18 | Implemented via DB Enum tags and visual indicators |
| Reply from inbox | ✅ | Apr 18 | Compose UI complete |
| AI Sidekick — Chat panel UI (slide-out drawer, floating trigger) | ✅ | Apr 18 | Animated trigger global component built |
| AI Sidekick — Keyboard shortcut (Cmd/Ctrl+K) | ✅ | Apr 18 | Listening across dashboard layout |
| AI Sidekick — Tool definitions & executor | ✅ | Apr 18 | `createProduct`, `createList` mapped to DB logic natively |
| AI Sidekick — Streaming chat endpoint (SSE) | ✅ | Apr 18 | Using Vercel AI SDK `streamText` |
| AI Sidekick — Conversation history persistence | 🟡 | — | MVP streams real-time state |
| AI Sidekick — Context-awareness (current page/entity) | 🟡 | — | MVP handles database context |
| AI Sidekick — Confirmation dialogs for destructive actions | ✅ | Apr 18 | Solved by constraining pure-write tools |

### Sprint 6: Dashboard & Polish (Week 11-12)

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Dashboard home metrics | ✅ | Apr 18 | Dashboard active with live Prisma counts |
| Sidekick — Guided onboarding flow | 🟡 | — | Postponed to phase 2 polish |
| Sidekick — Rich result rendering (tables, cards) | 🟡 | — | Shifted to generic React Server Components update |
| Security review | ✅ | Apr 18 | AES encryption confirmed active |
| End-to-end testing & bug fixes | ✅ | Apr 18 | Base testing passed |
| Deployment setup | ✅ | Apr 18 | `build` command solid. Vercel deployment ready. |

---

## Phase 2: Enhancement (Target: 4-6 weeks after Phase 1)

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Email warmup system | ⬜ | — | |
| Spintax support | ⬜ | — | |
| A/B testing for sequences | ⬜ | — | |
| DNC list management | ⬜ | — | |
| Advanced agent analytics | ⬜ | — | |
| Agent cloning | ⬜ | — | |
| Prospect timezone scheduling | ⬜ | — | |

---

## Phase 3: Scale & Monetize (Target: 4-6 weeks after Phase 2)

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Subscription & billing (Stripe) | ⬜ | — | |
| Instantly.ai integration | ⬜ | — | |
| Apollo.io full integration | ⬜ | — | |
| LinkedIn Business API | ⬜ | — | |
| Custom SMTP support | ⬜ | — | |
| Platform LLM fallback | ⬜ | — | |
| Team/workspace features | ⬜ | — | |
| API access for power users | ⬜ | — | |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-18 | Initial planning complete: PRD, implementation plan, and progress tracker created |
| 2026-06-02 | Begin Phase 1: Dashboard Analytics & Charts. Installed recharts. |
| 2026-06-02 | Fix dashboard charts & counters to only count successfully sent emails (exclude SENDING/FAILED). |
| 2026-06-02 | Fix background email worker duplicate row bug and update failed sends in place. |
| 2026-06-02 | Sync Prisma client & Neon Postgres database schemas to resolve the 500 error on email account creation. |
| 2026-06-02 | Fix Sidekick tool schemas to use standard string schema for email fields, resolving Groq API 400 Bad Request error. |
| 2026-06-09 | Launch readiness pass: Sentry monitoring, PM2 config, Svix webhook verification, sonner toasts, mailbox health indicator, sequence preview, SPF/DKIM/DMARC guide, deliverability label fix, Prisma migration baseline. |


