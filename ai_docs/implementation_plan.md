# MailPilot AI — Technical Implementation Plan

> **Version:** 1.0  
> **Date:** 2026-04-18  
> **Status:** Draft — Awaiting Approval  

---

## 1. Technology Stack

### Frontend
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 15** (App Router) | SSR/SSG, API routes, file-based routing, built-in middleware |
| Language | **TypeScript** | Type safety across frontend & backend |
| UI Library | **Shadcn/UI** + **Radix UI** | Accessible, composable, customizable components |
| Styling | **Tailwind CSS 4** | Rapid UI development, consistent design tokens |
| State | **Zustand** | Lightweight client state management |
| Forms | **React Hook Form** + **Zod** | Validation, type-safe forms |
| Charts | **Recharts** | Dashboard analytics visualizations |
| Rich Editor | **TipTap** | Email template editing, guidelines editing |

### Backend
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | **Node.js 22 LTS** | Same language as frontend, excellent async I/O |
| API | **Next.js API Routes** (App Router) | Co-located with frontend, serverless-ready |
| Database | **PostgreSQL 16** (via Supabase or self-hosted) | Relational data, JSONB for flexible schemas |
| ORM | **Prisma** | Type-safe queries, migrations, relation handling |
| Queue | **BullMQ** + **Redis** | Background jobs for email sending, scraping, AI generation |
| Auth | **NextAuth.js v5** (Auth.js) | Google OAuth, credentials provider, JWT sessions |
| Email Sending | **Resend SDK** / **Nodemailer** (Gmail SMTP) | Dual-provider email dispatch |
| Web Scraping | **Cheerio** + **Puppeteer** (for JS-heavy sites) | Product fetching, company profile generation |
| AI/LLM | **OpenAI SDK** (configured to user's API base URL) | Compatible with any OpenAI-format API |
| File Upload | **Multer** + **Papa Parse** (CSV) / **xlsx** (Excel) | Prospect import |
| Encryption | **Node.js crypto** (AES-256-GCM) | API key encryption at rest |
| Scheduling | **node-cron** + **BullMQ repeatable jobs** | Agent scheduling, warmup schedules |

### Infrastructure
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Hosting | **Vercel** (frontend) + **Railway/Render** (workers) | Easy deploy, auto-scaling |
| Database | **Supabase** (managed PostgreSQL) or **Neon** | Free tier available, managed backups |
| Redis | **Upstash Redis** | Serverless Redis, free tier for dev |
| File Storage | **Supabase Storage** or **AWS S3** | Product images, CSV uploads |
| Monitoring | **Sentry** | Error tracking and alerting |

---

## 2. Project Structure

```
marketing-ai/
├── ai_docs/                          # Documentation
│   ├── requirements.md
│   ├── implementation_plan.md
│   └── progress.md
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth pages (login, register)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Authenticated dashboard
│   │   │   ├── layout.tsx            # Sidebar + topbar layout
│   │   │   ├── page.tsx              # Dashboard home / overview
│   │   │   ├── agents/
│   │   │   │   ├── page.tsx          # List all agents
│   │   │   │   ├── new/page.tsx      # Create agent wizard
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Agent detail + metrics
│   │   │   │       ├── sequences/page.tsx
│   │   │   │       ├── prospects/page.tsx
│   │   │   │       └── settings/page.tsx
│   │   │   ├── products/
│   │   │   │   ├── page.tsx          # Product list
│   │   │   │   └── new/page.tsx      # Add product (manual/website)
│   │   │   ├── prospects/
│   │   │   │   ├── page.tsx          # Global prospect list
│   │   │   │   ├── import/page.tsx   # CSV/Excel import
│   │   │   │   └── finder/page.tsx   # Built-in prospect finder
│   │   │   ├── inbox/
│   │   │   │   └── page.tsx          # Unified inbox (Unibox)
│   │   │   ├── email-accounts/
│   │   │   │   ├── page.tsx          # Manage email accounts
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Account emails view
│   │   │   │       └── settings/page.tsx
│   │   │   ├── company/
│   │   │   │   └── page.tsx          # Company profile
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx          # General settings
│   │   │   │   ├── llm/page.tsx      # LLM configuration
│   │   │   │   └── limits/page.tsx   # Global email limits
│   │   │   └── warmup/               # Phase 2
│   │   │       └── page.tsx
│   │   ├── api/                      # API routes
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── agents/
│   │   │   ├── products/
│   │   │   ├── prospects/
│   │   │   ├── email-accounts/
│   │   │   ├── emails/
│   │   │   ├── company/
│   │   │   ├── llm/
│   │   │   ├── sequences/
│   │   │   ├── inbox/
│   │   │   ├── scrape/
│   │   │   └── sidekick/              # AI Sidekick
│   │   │       ├── chat/route.ts      # Streaming chat endpoint (SSE)
│   │   │       └── history/route.ts   # Conversation history
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       # Shadcn UI components
│   │   ├── agents/                   # Agent-specific components
│   │   ├── products/                 # Product components
│   │   ├── prospects/                # Prospect components
│   │   ├── inbox/                    # Inbox components
│   │   ├── email-accounts/           # Email account components
│   │   ├── sidekick/                 # AI Sidekick components
│   │   │   ├── sidekick-panel.tsx    # Slide-out chat panel
│   │   │   ├── chat-message.tsx      # Individual message (supports rich content)
│   │   │   ├── chat-input.tsx        # Input with send button
│   │   │   ├── tool-result-card.tsx  # Renders tool call results (tables, cards)
│   │   │   ├── confirmation-dialog.tsx # Confirm destructive actions
│   │   │   └── sidekick-trigger.tsx  # Floating button + keyboard shortcut
│   │   └── shared/                   # Shared/layout components
│   │       ├── sidebar.tsx
│   │       ├── topbar.tsx
│   │       ├── data-table.tsx
│   │       └── stat-card.tsx
│   ├── lib/
│   │   ├── db.ts                     # Prisma client
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── encryption.ts             # AES-256 encrypt/decrypt
│   │   ├── llm.ts                    # LLM client factory
│   │   ├── email/
│   │   │   ├── resend.ts             # Resend provider
│   │   │   ├── gmail.ts              # Gmail SMTP provider
│   │   │   └── sender.ts             # Unified send interface
│   │   ├── scraper/
│   │   │   ├── products.ts           # Website product scraper
│   │   │   └── company.ts            # Company profile scraper
│   │   ├── prospects/
│   │   │   ├── hunter.ts             # Hunter.io integration
│   │   │   ├── apollo.ts             # Apollo free-tier
│   │   │   └── finder.ts             # Unified prospect finder
│   │   ├── sidekick/
│   │   │   ├── tools.ts              # Tool definitions (function schemas)
│   │   │   ├── tool-executor.ts      # Executes tool calls against internal APIs
│   │   │   ├── system-prompt.ts      # Dynamic system prompt builder
│   │   │   └── context.ts            # Gathers current platform state for context
│   │   ├── queue/
│   │   │   ├── connection.ts         # Redis/BullMQ setup
│   │   │   ├── email-queue.ts        # Email sending queue
│   │   │   ├── scrape-queue.ts       # Scraping jobs queue
│   │   │   └── ai-queue.ts           # AI generation queue
│   │   └── utils/
│   │       ├── csv-parser.ts
│   │       ├── rate-limiter.ts
│   │       └── variables.ts          # Template variable replacement
│   ├── hooks/                        # Custom React hooks
│   ├── types/                        # TypeScript type definitions
│   └── workers/                      # Background job processors
│       ├── email-worker.ts           # Process email sending queue
│       ├── sequence-worker.ts        # Manage sequence progression
│       ├── scrape-worker.ts          # Website scraping jobs
│       └── ai-worker.ts             # AI content generation
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── migrations/
├── public/
├── .env.example
├── .env.local
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Database Schema (Prisma)

```prisma
// ==========================================
// AUTH & USER
// ==========================================

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  passwordHash    String?   // null for Google OAuth users
  image           String?
  emailVerified   DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  accounts        Account[]
  sessions        Session[]
  llmConfig       LlmConfig?
  companyProfile  CompanyProfile?
  products        Product[]
  emailAccounts   EmailAccount[]
  agents          Agent[]
  prospects       Prospect[]
  prospectLists   ProspectList[]
  globalSettings  GlobalSettings?
  sidekickConversations SidekickConversation[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ==========================================
// LLM CONFIGURATION
// ==========================================

model LlmConfig {
  id          String   @id @default(cuid())
  userId      String   @unique
  apiBaseUrl  String   // e.g., "https://api.openai.com/v1"
  apiKey      String   // Encrypted (AES-256-GCM)
  modelName   String?  // e.g., "gpt-4o", "llama-3.1-70b"
  isValid     Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ==========================================
// COMPANY PROFILE
// ==========================================

model CompanyProfile {
  id               String   @id @default(cuid())
  userId           String   @unique
  companyName      String
  website          String?
  industry         String?
  description      String?  @db.Text
  valuePropositions String? @db.Text  // JSON array
  toneOfVoice      String?
  targetMarkets    String?  @db.Text  // JSON array
  rawScrapedData   String?  @db.Text  // Original scraped content
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ==========================================
// PRODUCTS
// ==========================================

model Product {
  id              String   @id @default(cuid())
  userId          String
  name            String
  description     String?  @db.Text
  price           String?
  usps            String?  @db.Text     // JSON array of unique selling points
  targetAudience  String?  @db.Text
  category        String?
  tags            String?               // Comma-separated
  sourceUrl       String?               // If fetched from website
  imageUrl        String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  agentProducts AgentProduct[]
}

// ==========================================
// EMAIL ACCOUNTS
// ==========================================

model EmailAccount {
  id              String   @id @default(cuid())
  userId          String
  emailAddress    String
  displayName     String?
  provider        EmailProvider  // RESEND, GMAIL
  
  // Resend-specific
  resendApiKey    String?  // Encrypted
  
  // Gmail-specific
  gmailAppPassword String? // Encrypted
  smtpHost         String? // smtp.gmail.com
  smtpPort         Int?    // 587
  imapHost         String?
  imapPort         Int?
  
  // Limits & settings
  dailyLimit      Int      @default(50)
  sentToday       Int      @default(0)
  lastResetDate   DateTime @default(now())
  
  // Warmup (Phase 2)
  warmupEnabled   Boolean  @default(false)
  warmupDailyMax  Int      @default(10)
  warmupTag       String?  // Random subject tag
  
  // Status
  status          EmailAccountStatus @default(CONNECTED)
  lastError       String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  agentAccounts   AgentEmailAccount[]
  sentEmails      Email[]
}

enum EmailProvider {
  RESEND
  GMAIL
  SMTP  // Future
}

enum EmailAccountStatus {
  CONNECTED
  ERROR
  WARMING_UP
  DISCONNECTED
}

// ==========================================
// PROSPECTS
// ==========================================

model ProspectList {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  source      String?  // "csv_import", "manual", "auto_generated", "hunter", "apollo"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  prospects ProspectListEntry[]
  agents    AgentProspectList[]
}

model Prospect {
  id          String   @id @default(cuid())
  userId      String
  email       String
  firstName   String?
  lastName    String?
  companyName String?
  jobTitle    String?
  linkedinUrl String?
  phone       String?
  website     String?
  industry    String?
  location    String?
  customFields String? @db.Text  // JSON for flexible additional data
  source      String?  // "manual", "csv", "hunter", "apollo", "auto"
  isVerified  Boolean  @default(false)
  isDnc       Boolean  @default(false)  // Do Not Contact
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user              User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  listEntries       ProspectListEntry[]
  sequenceEnrollments SequenceEnrollment[]
  emails            Email[]

  @@unique([userId, email])  // Prevent duplicate prospects per user
}

model ProspectListEntry {
  id           String @id @default(cuid())
  prospectId   String
  prospectListId String

  prospect     Prospect     @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  prospectList ProspectList @relation(fields: [prospectListId], references: [id], onDelete: Cascade)

  @@unique([prospectId, prospectListId])
}

// ==========================================
// AI AGENTS
// ==========================================

model Agent {
  id              String      @id @default(cuid())
  userId          String
  name            String
  description     String?
  productMode     ProductMode // SINGLE, GROUP, ALL
  status          AgentStatus @default(DRAFT)

  // Guidelines & Rules
  guidelines      String?     @db.Text  // AI-generated + user-edited
  systemPrompt    String?     @db.Text  // Compiled system prompt for LLM

  // Sequence Configuration
  sequenceMode    SequenceMode @default(AI_GENERATED)
  staticSequence  String?      @db.Text  // JSON array of static email templates

  // Rate Limiting
  dailyEmailLimit Int         @default(100)
  sentToday       Int         @default(0)
  lastResetDate   DateTime    @default(now())
  
  // Send Timing
  minIntervalMinutes  Int     @default(1)   // Min gap between emails
  maxIntervalMinutes  Int     @default(5)   // Max gap between emails
  randomDelayMax      Int     @default(3)   // Random extra delay (1 to X min)

  // Scheduling
  scheduleTimezone    String  @default("UTC")
  scheduleStartHour   Int     @default(9)
  scheduleEndHour     Int     @default(17)
  scheduleDays        String  @default("1,2,3,4,5")  // 0=Sun, 1=Mon, ..., 6=Sat
  scheduleStartDate   DateTime?
  
  // Metadata
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  products        AgentProduct[]
  emailAccounts   AgentEmailAccount[]
  prospectLists   AgentProspectList[]
  sequences       Sequence[]
  emails          Email[]
}

enum ProductMode {
  SINGLE
  GROUP
  ALL
}

enum AgentStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
}

enum SequenceMode {
  AI_GENERATED
  STATIC
  HYBRID  // AI-generated with user-defined structure
}

model AgentProduct {
  id        String @id @default(cuid())
  agentId   String
  productId String

  agent   Agent   @relation(fields: [agentId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([agentId, productId])
}

model AgentEmailAccount {
  id             String @id @default(cuid())
  agentId        String
  emailAccountId String

  agent        Agent        @relation(fields: [agentId], references: [id], onDelete: Cascade)
  emailAccount EmailAccount @relation(fields: [emailAccountId], references: [id], onDelete: Cascade)

  @@unique([agentId, emailAccountId])
}

model AgentProspectList {
  id             String @id @default(cuid())
  agentId        String
  prospectListId String

  agent        Agent        @relation(fields: [agentId], references: [id], onDelete: Cascade)
  prospectList ProspectList @relation(fields: [prospectListId], references: [id], onDelete: Cascade)

  @@unique([agentId, prospectListId])
}

// ==========================================
// SEQUENCES & EMAILS
// ==========================================

model Sequence {
  id          String   @id @default(cuid())
  agentId     String
  name        String
  steps       String   @db.Text  // JSON array of SequenceStep
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  agent       Agent                @relation(fields: [agentId], references: [id], onDelete: Cascade)
  enrollments SequenceEnrollment[]
}

// Tracks each prospect's progress through a sequence
model SequenceEnrollment {
  id           String             @id @default(cuid())
  sequenceId   String
  prospectId   String
  currentStep  Int                @default(0)
  status       EnrollmentStatus   @default(ACTIVE)
  nextSendAt   DateTime?
  completedAt  DateTime?
  repliedAt    DateTime?          // When prospect first replied
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  sequence  Sequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  prospect  Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)

  @@unique([sequenceId, prospectId])
}

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  REPLIED      // Stopped because prospect replied
  PAUSED
  BOUNCED
  FAILED
}

model Email {
  id              String      @id @default(cuid())
  agentId         String?
  emailAccountId  String
  prospectId      String?
  
  fromEmail       String
  toEmail         String
  subject         String
  body            String      @db.Text
  bodyHtml        String?     @db.Text
  
  direction       EmailDirection  // SENT, RECEIVED
  status          EmailStatus     @default(QUEUED)
  
  // Threading
  messageId       String?     // Email Message-ID header
  inReplyTo       String?     // In-Reply-To header
  threadId        String?     // Thread grouping
  
  // Tracking
  openedAt        DateTime?
  clickedAt       DateTime?
  bouncedAt       DateTime?
  repliedAt       DateTime?
  
  // Sequence context
  sequenceStep    Int?
  
  // Metadata
  sentAt          DateTime?
  receivedAt      DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  agent        Agent?        @relation(fields: [agentId], references: [id], onDelete: SetNull)
  emailAccount EmailAccount  @relation(fields: [emailAccountId], references: [id], onDelete: Cascade)
  prospect     Prospect?     @relation(fields: [prospectId], references: [id], onDelete: SetNull)
}

enum EmailDirection {
  SENT
  RECEIVED
}

enum EmailStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  OPENED
  CLICKED
  REPLIED
  BOUNCED
  FAILED
}

// ==========================================
// GLOBAL SETTINGS
// ==========================================

model GlobalSettings {
  id                String @id @default(cuid())
  userId            String @unique
  dailyEmailLimit   Int    @default(500)  // Global cap across all agents
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ==========================================
// AI SIDEKICK
// ==========================================

model SidekickConversation {
  id        String   @id @default(cuid())
  userId    String
  title     String?  // Auto-generated from first message
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages SidekickMessage[]
}

model SidekickMessage {
  id              String   @id @default(cuid())
  conversationId  String
  role            SidekickRole  // USER, ASSISTANT, TOOL
  content         String   @db.Text
  
  // Tool call tracking
  toolCalls       String?  @db.Text  // JSON array of tool calls made
  toolResults     String?  @db.Text  // JSON array of tool results
  
  // Context at time of message
  pageContext     String?  // Which page/entity the user was viewing
  
  createdAt       DateTime @default(now())

  conversation SidekickConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}

enum SidekickRole {
  USER
  ASSISTANT
  TOOL
}
```

---

## 4. Key API Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth.js handler (Google + Credentials) |

### LLM Config
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/llm/config` | Get current LLM configuration |
| PUT | `/api/llm/config` | Save/update LLM config |
| POST | `/api/llm/test` | Test LLM connection |

### Company Profile
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/company` | Get company profile |
| PUT | `/api/company` | Update company profile |
| POST | `/api/company/generate` | Auto-generate from website URL |

### Products
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create product |
| PUT | `/api/products/[id]` | Update product |
| DELETE | `/api/products/[id]` | Delete product |
| POST | `/api/products/fetch` | Fetch products from website URL |

### Email Accounts
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/email-accounts` | List email accounts |
| POST | `/api/email-accounts` | Add email account |
| PUT | `/api/email-accounts/[id]` | Update account settings |
| DELETE | `/api/email-accounts/[id]` | Remove email account |
| POST | `/api/email-accounts/[id]/test` | Test connection |
| GET | `/api/email-accounts/[id]/emails` | View emails for account |

### Prospects
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/prospects` | List prospects (with filtering) |
| POST | `/api/prospects` | Add prospect |
| POST | `/api/prospects/import` | Import CSV/Excel |
| DELETE | `/api/prospects/[id]` | Delete prospect |
| GET | `/api/prospect-lists` | List prospect lists |
| POST | `/api/prospect-lists` | Create prospect list |
| POST | `/api/prospects/find` | Find prospects using built-in APIs |
| POST | `/api/prospects/generate` | AI-generate prospect profiles |

### Agents
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents/[id]` | Get agent details + metrics |
| PUT | `/api/agents/[id]` | Update agent |
| DELETE | `/api/agents/[id]` | Delete agent |
| POST | `/api/agents/[id]/start` | Start/activate agent |
| POST | `/api/agents/[id]/pause` | Pause agent |
| POST | `/api/agents/[id]/guidelines/generate` | Auto-generate guidelines |
| GET | `/api/agents/[id]/emails` | View emails sent by agent |

### Sequences
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/agents/[id]/sequences` | List sequences for agent |
| POST | `/api/agents/[id]/sequences` | Create sequence |
| POST | `/api/agents/[id]/sequences/generate` | AI-generate sequence for prospects |
| GET | `/api/agents/[id]/sequences/[seqId]/preview` | Preview generated emails |

### Unified Inbox
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/inbox` | Get unified inbox (all accounts) |
| GET | `/api/inbox/[threadId]` | Get email thread |
| POST | `/api/inbox/reply` | Reply to email |
| PUT | `/api/inbox/[emailId]` | Update status (read, starred, etc.) |

### Settings
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/settings` | Get global settings |
| PUT | `/api/settings` | Update global settings |

### AI Sidekick
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/sidekick/chat` | Send message & stream response (SSE) |
| GET | `/api/sidekick/history` | Get conversation history |
| GET | `/api/sidekick/history/[id]` | Get specific conversation |
| DELETE | `/api/sidekick/history/[id]` | Delete conversation |

**Sidekick Tool Definitions (function-calling):**

The Sidekick uses the user's configured LLM with function-calling. Each tool maps to an internal API action:

| Tool Name | Maps To | Description |
|-----------|---------|-------------|
| `create_agent` | `POST /api/agents` | Create a new AI agent with specified config |
| `list_agents` | `GET /api/agents` | Show all agents and their status |
| `start_agent` | `POST /api/agents/[id]/start` | Activate an agent |
| `pause_agent` | `POST /api/agents/[id]/pause` | Pause an agent |
| `create_product` | `POST /api/products` | Add a new product |
| `list_products` | `GET /api/products` | Show all products |
| `fetch_products_from_website` | `POST /api/products/fetch` | Scrape products from a URL |
| `add_email_account` | `POST /api/email-accounts` | Connect an email account |
| `list_email_accounts` | `GET /api/email-accounts` | Show connected accounts |
| `import_prospects` | `POST /api/prospects/import` | Import prospects from CSV |
| `add_prospect` | `POST /api/prospects` | Add a single prospect |
| `find_prospects` | `POST /api/prospects/find` | Find prospects via built-in APIs |
| `generate_prospects` | `POST /api/prospects/generate` | AI-generate prospect profiles |
| `generate_guidelines` | `POST /api/agents/[id]/guidelines/generate` | Auto-generate agent rules |
| `update_company_profile` | `PUT /api/company` | Update company profile |
| `generate_company_profile` | `POST /api/company/generate` | Auto-generate from website |
| `get_agent_metrics` | `GET /api/agents/[id]` | Get agent performance metrics |
| `get_inbox` | `GET /api/inbox` | Get unified inbox summary |
| `reply_to_email` | `POST /api/inbox/reply` | Reply to an email |
| `update_settings` | `PUT /api/settings` | Update global settings |
| `update_llm_config` | `PUT /api/llm/config` | Update LLM configuration |

---

## 5. Background Worker Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Frontend │  │ API Routes│  │ Cron Triggers     │  │
│  └────┬─────┘  └─────┬────┘  └────────┬──────────┘  │
│       │              │               │              │
└───────┼──────────────┼───────────────┼──────────────┘
        │              │               │
        ▼              ▼               ▼
┌─────────────────────────────────────────────────────┐
│                    Redis (BullMQ)                    │
│  ┌──────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ email-queue   │ │ ai-queue   │ │ scrape-queue  │  │
│  └──────┬───────┘ └─────┬──────┘ └──────┬────────┘  │
└─────────┼───────────────┼───────────────┼────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────┐
│              Background Workers                      │
│  ┌──────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ Email Worker  │ │ AI Worker  │ │ Scrape Worker │  │
│  │              │ │            │ │               │  │
│  │ - Send email │ │ - Generate │ │ - Fetch site  │  │
│  │ - Rate limit │ │   sequence │ │ - Parse prods │  │
│  │ - Random gap │ │ - Generate │ │ - Extract co  │  │
│  │ - Track sent │ │   guidelines│ │   profile    │  │
│  │ - Rotate acct│ │ - Classify │ │               │  │
│  │              │ │   replies  │ │               │  │
│  └──────────────┘ └────────────┘ └───────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Sequence Scheduler (runs every minute)        │   │
│  │ - Check active agents within schedule         │   │
│  │ - Find prospects needing next email            │   │
│  │ - Queue emails with proper delays              │   │
│  │ - Check reply status → stop sequences          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Email Sending Flow (Detailed)

```
1. Sequence Scheduler runs (every 60s)
   └─ For each ACTIVE agent:
      └─ Check if within schedule window (day/hour/timezone)
         └─ Check if agent daily limit not reached
            └─ Get eligible enrollments (nextSendAt <= now, status=ACTIVE)
               └─ For each enrollment:
                  ├─ Select email account (round-robin, check daily limit)
                  ├─ Calculate send time = now + random(minInterval, maxInterval) + random(1, randomDelayMax)
                  └─ Push to email-queue with delay

2. Email Worker processes job
   ├─ Re-verify limits not exceeded
   ├─ If AI_GENERATED mode:
   │   └─ Call user's LLM API → generate personalized email
   ├─ If STATIC mode:
   │   └─ Replace variables ({first_name}, {company_name}, etc.)
   ├─ Send via selected provider (Resend API or Gmail SMTP)
   ├─ Record Email in database
   ├─ Update sent counters (account, agent, global)
   └─ Update enrollment (increment step, set nextSendAt for next step)
```

---

## 6. Phase 1 Build Order (Sprint Plan)

### Sprint 1 (Week 1-2): Foundation
1. Initialize Next.js project with TypeScript
2. Set up Tailwind CSS + Shadcn UI
3. Configure Prisma + PostgreSQL schema
4. Implement NextAuth.js (Google OAuth + Email/Password)
5. Build auth pages (login, register)
6. Build dashboard layout (sidebar, topbar, responsive)
7. Set up Redis + BullMQ connection

### Sprint 2 (Week 3-4): Core Configuration
8. LLM configuration page + API routes
9. Encryption utilities for API keys
10. Company profile (auto-generate via scraping + manual)
11. Product management (CRUD + website fetch)
12. Email account management (Resend + Gmail setup)
13. Email account connection testing

### Sprint 3 (Week 5-6): Prospects & Agents
14. Prospect management (CRUD + CSV/Excel import)
15. Prospect list management
16. Built-in prospect finder (Hunter.io, Apollo free tier)
17. AI Agent creation wizard
18. Agent guidelines auto-generation + editor
19. Agent configuration (products, accounts, lists, limits)

### Sprint 4 (Week 7-8): Sequences & Sending
20. Sequence engine (AI-generated + static templates)
21. Email preview system
22. Email sending queue + worker
23. Rate limiting + random delay logic
24. Agent scheduling (hours, days, timezone)
25. Sequence progression + reply detection
26. Auto-stop on reply

### Sprint 5 (Week 9-10): Inbox & Sidekick
27. Email viewer (per account, per agent)
28. Unified inbox (Unibox)
29. Reply prioritization + AI categorization
30. Reply from inbox
31. AI Sidekick — chat panel UI (slide-out drawer, floating trigger, Cmd+K shortcut)
32. AI Sidekick — tool definitions and executor (maps all platform actions)
33. AI Sidekick — streaming chat endpoint (SSE)
34. AI Sidekick — conversation history persistence
35. AI Sidekick — context-awareness (current page/entity)
36. AI Sidekick — confirmation dialogs for destructive actions

### Sprint 6 (Week 11-12): Dashboard & Polish
37. Dashboard home metrics & stats (Visual AreaChart showing Sent vs Replied vs Bounced, plus week-over-week trend calculations)
38. Sidekick — guided onboarding flow for new users
39. Sidekick — rich result rendering (tables, cards, inline metrics)
40. End-to-end testing & bug fixes
41. Security review
42. Deployment setup

---

## 7. Security Considerations

| Area | Implementation |
|------|---------------|
| API Key Storage | AES-256-GCM encryption with per-user IV, master key in env |
| Authentication | NextAuth.js with JWT + Refresh tokens, CSRF protection |
| Email Credentials | Same encryption as API keys, never exposed in API responses |
| Rate Limiting | Per-IP and per-user rate limiting on API routes |
| Input Validation | Zod schemas on all API inputs |
| SQL Injection | Prisma ORM (parameterized queries by default) |
| XSS | React's built-in escaping + CSP headers |
| CORS | Strict origin policy in Next.js middleware |

---

## 8. Deployment Architecture

```
                    ┌─────────────┐
                    │   Vercel     │
                    │  (Frontend   │
                    │  + API Routes)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌───▼────────┐
        │ Supabase  │ │ Upstash  │ │ Railway    │
        │ PostgreSQL│ │ Redis    │ │ Workers    │
        └──────────┘ └──────────┘ └────────────┘
```

---

## 9. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Encryption
ENCRYPTION_MASTER_KEY=...  # 32-byte hex key for AES-256

# Redis
REDIS_URL=redis://...

# Prospect APIs (platform-level, optional)
HUNTER_API_KEY=...
APOLLO_API_KEY=...

# Monitoring
SENTRY_DSN=...
```
