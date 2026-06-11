# ColdPigeon — Email Marketing Automation Platform

Welcome to **ColdPigeon**, an advanced email automation dashboard powered by Next.js, Prisma ORM, BullMQ, and LLM integrations. This platform allows you to create AI-driven sales agents that generate highly personalized cold outreach emails based on your product specs, target prospect profiles, and custom rules, sending them directly via verified SMTP accounts.

This guide is designed to help junior developers set up the project locally from scratch.

---

## 🛠️ Prerequisites

Before you start, make sure you have the following installed on your machine:

1. **Node.js**: Version `18.x` or `20.x` (Recommended: `20.x` LTS).
2. **PostgreSQL**: A running instance of PostgreSQL (either local or cloud-hosted).
3. **Redis**: Needed for BullMQ background email queues. You can run a local Redis instance or get a free serverless Redis instance from [Upstash](https://upstash.com).
4. **LLM Provider API Key**:
   - **Groq API Key** (Recommended): Sign up at [Groq Console](https://console.groq.com/) and create an API key. Supported models include `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, or other Groq models.
   - Or **OpenAI / Google Gemini** credentials.
5. **Sender Email Credentials**:
   - For Gmail, you MUST enable **2-Step Verification** on your Google account and generate a 16-character **App Password** (do not use your regular account password).

---

## 📁 Key Project Structure

Here are the main folders and files you should be aware of:

*   `src/app/` — Next.js 16 App Router pages and API endpoints.
    *   `src/app/api/agents/[id]/queue/route.ts` — Handlers for initiating campaigns and sending emails directly.
    *   `src/app/api/settings/llm/route.ts` — LLM configuration endpoint.
*   `src/lib/` — Shared libraries (Prisma DB client, NextAuth, queue, encryption).
    *   `src/lib/queue/worker.ts` — BullMQ Background Worker implementation.
    *   `src/lib/queue/connection.ts` — Redis queue connection setup.
    *   `src/lib/llm/generator.ts` — Prompt construction and LLM completions.
    *   `src/lib/encryption.ts` — Helper for securely storing App Passwords via `aes-256-gcm`.
*   `prisma/` — DB Schema (`schema.prisma`) and migrations.
*   `scripts/` — Auxiliary helper scripts (database seeding, manual account setup, diagnostic tests).

---

## 🚀 Local Setup Instructions

Follow these steps in order to get the project running locally:

### 1. Extract the Project
Unzip the project folder into your target workspace directory.

### 2. Install Dependencies
Open your terminal inside the project root and install the Node packages:
```bash
npm install
```

### 3. Configure the Environment Variables
Create a file named `.env` in the root folder of the project. Copy the template below and update the connection details:

```env
# Database Connection (Raw URL used by Next.js & @prisma/adapter-pg)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coldpigeon_dev?sslmode=disable"

# Database Connection for CLI Operations (Used for migrations)
DATABASE_URL_UNPOOLED="postgresql://postgres:postgres@localhost:5432/coldpigeon_dev"

# Authentication Config
NEXTAUTH_SECRET="your_generated_32_character_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Google OAuth Credentials (for "Sign in with Google" button)
# GOOGLE_CLIENT_ID="your_google_client_id"
# GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Optional: Microsoft Entra ID OAuth Credentials (for "Sign in with Microsoft" button)
# MICROSOFT_CLIENT_ID="your_microsoft_client_id"
# MICROSOFT_CLIENT_SECRET="your_microsoft_client_secret"
# MICROSOFT_TENANT_ID="common"

# Redis Queue Connection (Local Redis or Upstash URL)
REDIS_URL="redis://127.0.0.1:6379"

# Encryption Key (Must be a 32-byte hex string to encrypt/decrypt SMTP passwords)
ENCRYPTION_MASTER_KEY="your_32_byte_hex_string"

# Optional: Apollo.io API Key (enables live lead sourcing in Find Leads -> Super Search)
# APOLLO_API_KEY="your_apollo_api_key"

# Optional: ZeroBounce API Key (enables premium, high-accuracy email validation)
# ZEROBOUNCE_API_KEY="your_zerobounce_api_key"

# Optional: System Transactional Emails (for automated invitations & request approvals)
# Option A — Resend:
# RESEND_API_KEY="re_your_api_key"
# EMAIL_FROM="ColdPigeon <no-reply@yourdomain.com>"

# Option B — SMTP / SendGrid:
# SMTP_HOST="smtp.sendgrid.net"
# SMTP_PORT="587"
# SMTP_USER="apikey"
# SMTP_PASSWORD="your-api-key"
# SMTP_SECURE="false"   # set to true for SSL port 465
# EMAIL_FROM="ColdPigeon <no-reply@yourdomain.com>"
```

> [!TIP]
> You can generate a random 32-character secret for `NEXTAUTH_SECRET` and a 64-character hex key (32-byte) for `ENCRYPTION_MASTER_KEY` by running the following command in your terminal:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 4. Database Initialization
Once your database credentials are set up in your `.env` file, initialize the schema:

```bash
# Push the Prisma schema directly to your PostgreSQL database
npx prisma db push

# Generate the Prisma client types
npx prisma generate
```

---

### 5. Choose Database & Queue Setup
Before you run the application, choose one of the two database and queue configurations below to complete your environment:

#### Option A: Cloud-Hosted Setup (Zero-Install — Recommended)
For the most robust and hassle-free developer experience (bypassing local PostgreSQL installation, Memurai UAC blocks, or WebAssembly PGlite proxy connection crashes), use a free **Neon.tech** Cloud Postgres database and a free **Upstash.com** Cloud Redis queue. 
*   Paste your Neon connection string into `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in `.env`.
*   Paste your Upstash IORedis URL into `REDIS_URL` in `.env`.

#### Option B: Local Setup (via Prisma Postgres PGlite)
If you prefer to develop locally using the owner's Prisma Postgres configuration, you must start the local PGlite database proxy server in your terminal:
```bash
# Start the local database server in detached background mode
npx prisma dev -p 51213 -P 51214 -d
```

---

## 🚀 Running the Application

Depending on how you wish to process emails, you can run the server in three modes:

> [!IMPORTANT]
> **The ESM Hoisting Bug:** Because this repository compiles as ES Modules (`tsx`), the background worker may evaluate Redis variables before the `.env` file is loaded from disk, defaulting to `localhost` and throwing `ECONNREFUSED` timeouts.
> If this happens, always launch the application by injecting the connection variables directly into your shell:
> *   **Windows (PowerShell):** `$env:REDIS_URL="your_upstash_url"; $env:DATABASE_URL="your_neon_url"; npm run dev:full`
> *   **macOS / Linux:** `REDIS_URL="your_upstash_url" DATABASE_URL="your_neon_url" npm run dev:full`

### Mode A: Full Development (Recommended)
Use this command to start both the Next.js development server and the BullMQ background worker concurrently:
```bash
npm run dev:full
```

### Mode B: Next.js Web Server Only
If you want to only run the frontend and API routes (e.g., if you are testing direct email sending APIs and do not need a background queue):
```bash
npm run dev
```

### Mode C: Background Queue Worker Only
If you wish to spin up a dedicated worker process on another terminal window or background container:
```bash
npm run worker
```



---

## 💻 Manual Setup & Testing Scripts

In the `scripts/` directory, there are helpful CLI scripts. You can run them using `node` or `tsx` (TypeScript executor):

*   **Register real email account programmatically**:
    If you want to quickly seed your target Gmail account and target prospects directly into the DB without click flows, edit the parameters inside `scripts/setup-real-account.js` and execute:
    ```bash
    node scripts/setup-real-account.js
    ```
*   **Test LLM / Groq connectivity**:
    Verify that your LLM API configuration works before using the dashboard:
    ```bash
    node scripts/test-gemini.js
    ```

---

## 🖥️ UI Campaign Launch Walkthrough

Once your server is running, follow this step-by-step flow in your browser to launch your first automated outreach campaign:

1.  **Register / Log In**:
    *   Open [http://localhost:3000](http://localhost:3000).
    *   Register a new account or log in via the credentials form.
2.  **Configure LLM Settings**:
    *   Go to **Settings** in the left sidebar.
    *   Under **LLM Connection**, input:
        *   **API Base URL**: `https://api.groq.com/openai/v1`
        *   **Model Name**: `openai/gpt-oss-120b` (or another model supported by your key)
        *   **API Key**: Your Groq API Key.
    *   Click **Save LLM Config**.
3.  **Add a Product**:
    *   Navigate to **Products** and click **Add Product**.
    *   Provide your product details, target audience, and unique selling points (USPs). This info is injected into the prompt so the AI agent writes relevant content.
4.  **Create a Prospect List**:
    *   Go to **Prospects** and click **New List** (e.g., "Outreach Test").
    *   Click **Add Lead** to add your test recipients (e.g., their name, email, company, and job title).
5.  **Connect Email Sender Account**:
    *   Navigate to **Email Accounts**.
    *   Enter your display name, sender email address, select `GMAIL` as the provider, and paste your generated **Google App Password**.
    *   Click **Connect & Verify** to establish a secure SMTP connection.
6.  **Create and Launch the AI Agent**:
    *   Go to **AI Agents** and click **Create Agent**.
    *   **Step 1**: Set Agent Name and operational guidelines (e.g., tone, formatting, length limits).
    *   **Step 2**: Select your target prospect lists and sender accounts.
    *   **Step 3**: Select the product you want to sell.
    *   Click **Create Agent**.
    *   On the Agent Dashboard, click the green **Launch Sequence** button to generate personalized outreach and send the emails immediately.

---

## 🔍 Troubleshooting

*   **Redis Connection Errors**:
    Ensure your Redis server is running. If you are using Upstash over SSL, check that your `REDIS_URL` starts with `rediss://` or contains `upstash.io` so that the connection library dynamically enables SSL/TLS.
*   **Decryption Errors (`Invalid Key Length` / `bad decrypt`)**:
    SMTP app passwords are encrypted in the database using `aes-256-gcm` with the `ENCRYPTION_MASTER_KEY`. If you modify this key in `.env` after saving accounts, existing stored credentials will fail to decrypt. Keep the key consistent!
*   **Gmail Sending Blocked / Invalid Login**:
    Double-check that you did not enter your master account password. You MUST use a Google **App Password** generated under *Google Account -> Security -> 2-Step Verification -> App Passwords*.
