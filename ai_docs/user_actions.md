# MailPilot AI — User Action Items

This document tracks all configuration tasks you need to do outside the codebase (services, env vars, secrets, etc.)

> **I update this file automatically whenever a new external dependency is added.**

---

## ✅ Status: What's Already Done
- `DATABASE_URL` — Prisma local dev instance is running (your `.env` has it)
- All code is TypeScript error-free ✅

---

## 🔴 Environment Variables — Still Needed

Create/update your `.env` file at `d:\startups\marketing-ai\.env` with the following:

---

### 1. `DATABASE_URL`
- **Required For:** All database reads/writes (Users, Agents, Prospects, Emails)
- **Status:** ✅ Already set (Prisma local dev). For production, replace with a real hosted DB.
- **Production option:** [Neon.tech](https://neon.tech/) → Create project → Copy connection string (`postgres://...`)

---

### 2. `NEXTAUTH_SECRET`
- **Required For:** Encrypting user sessions. Without this, login will not work.
- **How to get:**
  - Option A (Terminal): `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  - Option B (Browser): Go to [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) → Copy the output
- **Example:** `NEXTAUTH_SECRET="mK3xP9qZ2vL8nR5wA1cD7eH0jF4tU6iO"`

---

### 3. `NEXTAUTH_URL`
- **Required For:** OAuth redirect URLs.
- **Local dev:** `NEXTAUTH_URL="http://localhost:3000"`
- **Production:** Set to your actual domain (e.g. `https://mailpilot.yourdomain.com`)

---

### 4. `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- **Required For:** "Sign in with Google" OAuth button on login page.
- **How to get:**
  1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
  2. Create a new project → **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
  3. Application type: **Web application**
  4. Authorized JavaScript origins: `http://localhost:3000`
  5. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
  6. Click Create → copy **Client ID** and **Client Secret**
- **Optional:** If you don't want Google login, you can skip this and use email/password only (register page still works).

---

### 4b. `MICROSOFT_CLIENT_ID` & `MICROSOFT_CLIENT_SECRET` *(optional — Microsoft SSO)*
- **Required For:** "Sign in with Microsoft" (Microsoft Entra ID / Azure AD).
- **How to get:**
  1. [entra.microsoft.com](https://entra.microsoft.com/) → App registrations →
     New registration.
  2. Redirect URI (Web): `http://localhost:3000/api/auth/callback/microsoft-entra-id`
     (and your production URL).
  3. Copy the **Application (client) ID**; create a **client secret** under
     Certificates & secrets.
  4. For single‑tenant, set `MICROSOFT_TENANT_ID` to your tenant ID; otherwise it
     defaults to `common` (multi‑tenant + personal accounts).
- **Add to `.env`:**
  ```env
  MICROSOFT_CLIENT_ID=""
  MICROSOFT_CLIENT_SECRET=""
  # MICROSOFT_TENANT_ID="common"
  ```
- The button only appears/works when these are set.

---

### 5. `REDIS_URL`
- **Required For:** Background email sending queue (BullMQ). Without Redis, agents can't send emails.
- **How to get (easiest — free tier):**
  1. Go to [upstash.com](https://upstash.com/) → Create account → **Create Database**
  2. Region: pick nearest to you
  3. In the database dashboard → scroll to **Connect** → select **IORedis** tab
  4. Copy the `rediss://default:...@...upstash.io:6379` URL
- **Example:** `REDIS_URL="rediss://default:AbCdEf@us1-fast-bird-12345.upstash.io:6379"`
- **Note:** The `rediss://` prefix (with double `s`) means TLS — our code handles this automatically.

---

### 6. `ENCRYPTION_MASTER_KEY`
- **Required For:** AES-256-GCM encryption of all sensitive keys stored in the DB (LLM API keys, Gmail passwords, ZeroBounce key, Resend keys).
- **How to get:**
  - Must be exactly **64 hex characters** (32 bytes)
  - Run in terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Copy the full output
- **Example:** `ENCRYPTION_MASTER_KEY="a3f8c2d1e0b4a7f9c6d2e1b8a5f3c0d7e4b1a8f5c2d9e6b3a0f7c4d1e8b5a2"`
- ⚠️ **Never change this after you've saved encrypted keys in the DB.** Everything would become unreadable.

---

### 7. `APOLLO_API_KEY` *(Optional — enables live lead sourcing)*
- **Required For:** The **Find Leads → Super Search** tool to pull *new* prospects
  from Apollo.io. Without it, Super Search still works but only filters prospects
  already in your database.
- **How to get:** [apollo.io](https://www.apollo.io/) → Settings → Integrations →
  API → create an API key.
- **Add to `.env`:** `APOLLO_API_KEY="..."`

---

### 7b. Import your lead database (10M+ LinkedIn / Sales Navigator rows)
You can preload a **shared, searchable lead pool** that all users can query in
**Find Leads → Leads Database** (like Apollo/Instantly).
1. Create a folder `./lead-data` in the project root.
2. Drop your exported `.csv` / `.xlsx` / `.xls` files there (Google Drive exports).
3. Run the importer:
   ```bash
   npx tsx scripts/import-leads.ts ./lead-data --source sales_navigator
   ```
- Columns are auto-mapped (First/Last/Full Name, Title, Company, Industry,
  Company Size, Location/Country, Email, LinkedIn URL, Phone, etc.).
- De-dupes on LinkedIn URL; rows are inserted in batches. Re-running is safe.
- Only leads **with an email** are returned for campaign import.
- For 10M+ rows, run on the machine hosting Postgres and import file-by-file
  (each file is loaded fully into memory, so keep individual exports reasonable).

---

### 8. Email sending providers (per-account, set in the UI — no env needed)
Connect inboxes under **Dashboard → Email Accounts**. Three options:
- **Gmail** — Google App Password (requires 2-Step Verification).
- **Resend** — Resend API key (verified sending domain).
- **SMTP / SendGrid** — host, port, username, password.
  - **SendGrid:** host `smtp.sendgrid.net`, port `587`, username `apikey`,
    password = your SendGrid API key (there's a one-click "Use SendGrid preset").
  - Works equally for Mailgun, Amazon SES, Postmark, or any SMTP relay.
All credentials are AES-256-GCM encrypted before storage.

---

### 9. Background worker (REQUIRED for sending + reply detection)
Agents send in the **background** via BullMQ, and the same worker process polls
mailboxes over **IMAP** to detect replies and auto-stop sequences. Run it
alongside the app (needs `REDIS_URL`):
```bash
npm run worker        # or: npm run dev:full  (Next.js + worker together)
```
- Launching an agent no longer blocks the browser — it enqueues staggered,
  schedule-aware jobs and the worker delivers them over time.
- Inbound mail is polled every `INBOX_POLL_MINUTES` (default 5). You can also hit
  **Sync** in the Unified Inbox to pull mail on demand without a worker running.

**IMAP / reply detection setup:**
- **Gmail:** automatic — we connect to `imap.gmail.com` with the same App
  Password. Nothing extra to configure.
- **SMTP / SendGrid / custom:** add IMAP host/port/username/password in the
  Email Accounts form (optional — only needed for reply detection).
- Optional env: `INBOX_POLL_MINUTES="5"`.

**Email warmup:** enable warmup per mailbox under Email Accounts (toggle + daily
max + optional subject tag). Needs **2+ warmup-enabled mailboxes** so they can
email each other. The worker runs warmup every `WARMUP_INTERVAL_MINUTES`
(default 30). Warmup mail is excluded from your inbox and deliverability stats.

---

### 10. `ZEROBOUNCE_API_KEY` *(Optional)*
- **Required For:** Premium email verification via ZeroBounce's API (higher accuracy than in-house).
- **In-house verification works without this key** (DNS MX + SMTP handshake). This is only needed if you want ZeroBounce's premium verification.
- **How to get:**
  1. Go to [app.zerobounce.net](https://app.zerobounce.net/members/apikey)
  2. Sign up → copy API Key from dashboard
- **Note:** You can also set this directly **inside the app** at Settings → Email Verification (it gets encrypted and stored). No need to put it in `.env`.

---

## 📋 Complete `.env` Template

Copy this into your `.env` file and fill in the blanks:

```env
# Database Connection (Raw URL used by Next.js & @prisma/adapter-pg)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mailpilot_dev?sslmode=disable"

# Database Connection for CLI Operations (Used for migrations)
DATABASE_URL_UNPOOLED="postgresql://postgres:postgres@localhost:5432/mailpilot_dev"

# Auth
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

# Optional: Google OAuth Credentials (for "Sign in with Google" button)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Optional: Microsoft Entra ID OAuth Credentials (for "Sign in with Microsoft" button)
# MICROSOFT_CLIENT_ID=""
# MICROSOFT_CLIENT_SECRET=""
# MICROSOFT_TENANT_ID="common"

# Redis / Queue
REDIS_URL="redis://127.0.0.1:6379"

# Encryption (CRITICAL — generate once, never change)
ENCRYPTION_MASTER_KEY=""

# Optional: Apollo.io API Key (enables live lead sourcing in Find Leads -> Super Search)
# APOLLO_API_KEY=""

# Optional: ZeroBounce API Key (enables premium, high-accuracy email validation)
# ZEROBOUNCE_API_KEY=""

# Optional: System Transactional Emails (for automated invitations & request approvals)
# Option A — Resend:
# RESEND_API_KEY="re_your_api_key"
# EMAIL_FROM="MailPilot <no-reply@yourdomain.com>"

# Option B — SMTP / SendGrid:
# SMTP_HOST="smtp.sendgrid.net"
# SMTP_PORT="587"
# SMTP_USER="apikey"
# SMTP_PASSWORD="your-api-key"
# SMTP_SECURE="false"   # set to true for SSL port 465
# EMAIL_FROM="MailPilot <no-reply@yourdomain.com>"
```

---

## 🏢 Organizations & Team (enterprise)

- **Sign up with your work email.** The first person from a company domain (e.g.
  `you@acme.com`) creates the organization and becomes its **Owner**. Free inbox
  domains (gmail/outlook/…) always get a personal workspace.
- **Teammates who sign up later with the same domain** land in an *awaiting
  approval* state — an Owner/Admin approves them under **Dashboard → Team**.
- **Invites:** Admins can invite by email under Team. Invited people auto-join
  (with the assigned role) when they register with that email — no email service
  required for this to work.
- **Mailboxes are shared at the org level.** Admins can mark a mailbox shared or
  private and assign it to a specific member from **Dashboard → Email Accounts**.
- **Deliverability** (**Dashboard → Deliverability**) shows per-domain and
  per-mailbox send volume, reply rate, bounce rate and daily utilization.
- **Auto load-balancing** spreads campaign sends across your domains/mailboxes
  so none gets overused — no setup needed.

### Transactional email (invites / approvals) — optional
Invite, join-request, and approval emails are sent through a **system** email
provider (separate from your campaign mailboxes), configured via env. If none is
set, the flows still work in-app (no email is sent) — just share the signup link.

Pick ONE:
```env
# Option A — Resend
RESEND_API_KEY="re_..."
EMAIL_FROM="MailPilot <no-reply@yourdomain.com>"

# Option B — SMTP / SendGrid
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="your-smtp-password-or-api-key"
# SMTP_SECURE="false"   # true for port 465
EMAIL_FROM="MailPilot <no-reply@yourdomain.com>"

# Used to build links in emails (falls back to NEXTAUTH_URL)
# APP_URL="https://app.yourdomain.com"
```

---

## 💳 Billing (Stripe) — optional

Plan limits (mailboxes / seats / daily emails) are **always enforced**. To accept
payments and let users upgrade, set:
```env
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # from your webhook endpoint
STRIPE_PRICE_STARTER="price_..."    # Stripe Price IDs for each paid plan
STRIPE_PRICE_PRO="price_..."
```
- Add a webhook endpoint in Stripe pointing to `/api/billing/webhook`
  (events: `checkout.session.completed`, `customer.subscription.*`).
- Without these keys the Billing page still shows plans + enforced limits, but
  checkout is disabled.

---

## 🗄️ Database — Run Migrations

After setting `DATABASE_URL`, run this to create all tables:

```bash
npx prisma migrate dev --name init
```

If you already have a DB and want to sync without generating a migration:

```bash
npx prisma db push
```

**Production (migrations):** a baseline migration lives at
`prisma/migrations/0_init/`. On a fresh database run `npx prisma migrate deploy`.
If your existing DB was created with `db push`, baseline it once:
```bash
npx prisma migrate resolve --applied 0_init
npx prisma migrate deploy
```

---

## 📦 Install & Run

```bash
npm install
npm run dev
```

The app will run at `http://localhost:3000`.

---

## 🚀 When You're Ready to Deploy

For production (e.g. Vercel):
1. Push code to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Set all the env vars above in **Vercel → Project → Settings → Environment Variables**
4. Change `NEXTAUTH_URL` to your production domain
5. Update Google OAuth redirect URIs to production URL

---

*Last updated: 2026-04-18 | Auto-maintained by AI assistant*
