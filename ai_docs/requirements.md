# MailPilot AI — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Date:** 2026-04-18  
> **Status:** Draft  
> **Product Type:** SaaS — AI-Powered Email Marketing Automation Platform  

---

## 1. Executive Summary

MailPilot AI is an AI-powered email marketing automation platform that enables users to create autonomous AI agents for cold email outreach. Each agent can market individual products, product groups, or an entire catalog — generating hyper-personalized cold outreach sequences tailored to each prospect. The platform handles prospect discovery, email infrastructure management, deliverability optimization, and unified inbox management.

A key differentiator is the **AI Sidekick** — a conversational assistant embedded in the platform that lets users perform any action via natural language instead of (or alongside) the traditional UI. Users can say things like *"Create an AI agent for my SaaS product targeting CTOs in fintech"* and the Sidekick will handle the entire workflow.

**Comparable Products:** Instantly.ai, Smartlead, Woodpecker, Lemlist

---

## 2. User Personas

| Persona | Description |
|---------|-------------|
| **Solo Founder** | Runs a small business, has 1-3 products, needs automated outreach with minimal setup |
| **Sales Team Lead** | Manages multiple products/services, needs multiple AI agents, imports leads from various sources |
| **Marketing Agency** | Manages outreach for multiple clients, needs granular control over agents, email accounts, and scheduling |

---

## 3. Core Features & Requirements

### 3.1 Authentication & User Management

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| AUTH-01 | Google OAuth 2.0 sign-up/login | P0 | 1 |
| AUTH-02 | Email + password sign-up/login | P0 | 1 |
| AUTH-03 | Password reset via email | P0 | 1 |
| AUTH-04 | User profile management | P1 | 1 |
| AUTH-05 | Session management with JWT/refresh tokens | P0 | 1 |

---

### 3.2 LLM Configuration

Users bring their own LLM keys. We do NOT host or proxy LLM inference — we call the user's endpoint directly.

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| LLM-01 | Store user-provided API base URL | P0 | 1 |
| LLM-02 | Store user-provided API key (encrypted at rest) | P0 | 1 |
| LLM-03 | Support OpenAI-compatible API format (covers OpenAI, Groq, Together, local Ollama, etc.) | P0 | 1 |
| LLM-04 | Test connection / validate API key on save | P1 | 1 |
| LLM-05 | Allow selecting model name from fetched model list or manual input | P1 | 1 |
| LLM-06 | Fallback to platform default LLM if user key fails (optional, gated by subscription) | P2 | 3 |

---

### 3.3 Email Account Management

Users connect their email accounts which serve as the sending infrastructure.

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| EMAIL-01 | Add email account via Resend API key | P0 | 1 |
| EMAIL-02 | Add email account via Google Gmail (App Password + SMTP) | P0 | 1 |
| EMAIL-03 | Per-account daily sending limit (user-configurable, with platform max cap) | P0 | 1 |
| EMAIL-04 | Per-account warmup settings (enable/disable, daily warmup volume) | P1 | 2 |
| EMAIL-05 | Warmup email subject tag (random default, user-editable per account) | P1 | 2 |
| EMAIL-06 | View sent/received emails per account (mini inbox) | P0 | 1 |
| EMAIL-07 | Email account health status (connected, error, warming up, active) | P1 | 1 |
| EMAIL-08 | Rotate sending across multiple accounts in a campaign | P1 | 1 |
| EMAIL-09 | Support for custom SMTP (future) | P2 | 3 |

---

### 3.4 Company Profile

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| COMP-01 | Auto-generate company profile by scraping user's website | P0 | 1 |
| COMP-02 | Manual company profile creation form | P0 | 1 |
| COMP-03 | Editable fields: company name, industry, description, value propositions, tone of voice, target markets | P0 | 1 |
| COMP-04 | Company profile used as context for all AI agent email generation | P0 | 1 |

---

### 3.5 Product Management

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| PROD-01 | Add products manually (name, description, price, USPs, target audience, category) | P0 | 1 |
| PROD-02 | Fetch products from user's website (provide URL → scrape/select products) | P0 | 1 |
| PROD-03 | Edit / delete products | P0 | 1 |
| PROD-04 | Product grouping / tagging for agent assignment | P1 | 1 |
| PROD-05 | Product images (upload or fetch from website) | P2 | 2 |

---

### 3.6 AI Agent Guidelines & Rules

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| RULE-01 | Auto-generate agent guidelines/rules based on company profile + products | P0 | 1 |
| RULE-02 | User can fully edit auto-generated guidelines | P0 | 1 |
| RULE-03 | Guidelines include: tone, prohibited topics, CTA style, follow-up behavior, industry-specific rules | P0 | 1 |
| RULE-04 | Per-agent guidelines (each agent can have different rules) | P0 | 1 |
| RULE-05 | Template library of common guidelines | P2 | 2 |

---

### 3.7 Prospect Management

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| PROS-01 | Auto-generate prospect profiles per product (AI suggests ideal customer profiles) | P0 | 1 |
| PROS-02 | Manual prospect entry (name, email, company, title, etc.) | P0 | 1 |
| PROS-03 | Upload prospects via CSV/Excel | P0 | 1 |
| PROS-04 | Column mapping for CSV import | P0 | 1 |
| PROS-05 | Prospect deduplication | P1 | 1 |
| PROS-06 | Prospect tagging & filtering | P1 | 1 |
| PROS-07 | Built-in prospect finder using free/freemium APIs | P1 | 1 |
| PROS-08 | Integration scope for Instantly, Apollo.io, LinkedIn Business API (future) | P2 | 3 |
| PROS-09 | Import prospect lists from Instantly / Apollo (future) | P2 | 3 |
| PROS-10 | Do-Not-Contact (DNC) list management | P1 | 2 |

**Prospect Data Sources (Phase 1 — Built-in):**
- Hunter.io API (email finding + verification)
- Apollo.io free-tier API (people search)
- Prospeo API (verified emails)
- Google search scraping (company discovery)
- Website scraping (contact pages, about pages)

**Prospect Data Sources (Phase 3 — Integrations):**
- Instantly.ai lead lists
- Apollo.io full integration
- LinkedIn Business API / Sales Navigator
- People Data Labs API

---

### 3.8 AI Agent Creation & Configuration

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| AGENT-01 | Create AI agent with name and description | P0 | 1 |
| AGENT-02 | Assign products: single product, user-defined group, or all products | P0 | 1 |
| AGENT-03 | Assign email accounts to agent | P0 | 1 |
| AGENT-04 | Assign prospect lists to agent | P0 | 1 |
| AGENT-05 | Configure agent guidelines/rules | P0 | 1 |
| AGENT-06 | Multiple agents per user (no limit in MVP, subscription-gated later) | P0 | 1 |
| AGENT-07 | Agent status: draft, active, paused, completed | P0 | 1 |
| AGENT-08 | Agent dashboard with key metrics (sent, opened, replied, bounced) | P0 | 1 |
| AGENT-09 | Clone/duplicate agent | P2 | 2 |
| AGENT-10 | Agent activity log | P1 | 2 |

---

### 3.9 Email Sequence Engine

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| SEQ-01 | AI-generated personalized cold outreach sequence per prospect | P0 | 1 |
| SEQ-02 | User-defined static sequence with variables ({first_name}, {last_name}, {company_name}, etc.) | P0 | 1 |
| SEQ-03 | Multi-step sequences (initial email + N follow-ups) | P0 | 1 |
| SEQ-04 | Auto-stop sequence on reply detection | P0 | 1 |
| SEQ-05 | Configurable delays between sequence steps (e.g., wait 2 days before follow-up) | P0 | 1 |
| SEQ-06 | Spintax support for email variation | P1 | 2 |
| SEQ-07 | A/B testing of subject lines and email bodies | P2 | 2 |
| SEQ-08 | Preview generated emails before sending | P0 | 1 |

---

### 3.10 Email Sending & Rate Limiting

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| RATE-01 | Global daily email limit per dashboard/workspace | P0 | 1 |
| RATE-02 | Per-agent daily email limit | P0 | 1 |
| RATE-03 | Per-email-account daily limit | P0 | 1 |
| RATE-04 | Platform-enforced maximum caps (safety rails) | P0 | 1 |
| RATE-05 | Configurable send interval: range slider (e.g., every 1-5 minutes) | P0 | 1 |
| RATE-06 | Random delay between emails: 1 to X minutes (user input, max 10 min) | P0 | 1 |
| RATE-07 | Emails sent at randomized gaps within the configured range | P0 | 1 |
| RATE-08 | Queue-based sending via background workers (never send in request cycle) | P0 | 1 |

**Default Limits:**
- Per email account: 50 emails/day (user can lower, platform max: 200)
- Per agent: 100 emails/day (user can adjust)
- Per dashboard: 500 emails/day (user can adjust)

---

### 3.11 Agent Scheduling

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| SCHED-01 | Set active hours for agent (e.g., 9 AM - 5 PM) | P0 | 1 |
| SCHED-02 | Set active days (e.g., Mon-Fri only) | P0 | 1 |
| SCHED-03 | Timezone selection | P0 | 1 |
| SCHED-04 | "Send in prospect's timezone" option | P2 | 2 |
| SCHED-05 | Immediate start or scheduled start date | P1 | 1 |

---

### 3.12 Email Warmup (Phase 2)

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| WARM-01 | Add mailboxes to warmup pool | P1 | 2 |
| WARM-02 | Configurable warmup volume (ramp-up schedule) | P1 | 2 |
| WARM-03 | Random subject tag for warmup emails (user-editable) | P1 | 2 |
| WARM-04 | Warmup status dashboard per mailbox | P1 | 2 |
| WARM-05 | Auto-reply and engagement simulation in warmup network | P1 | 2 |

---

### 3.13 Unified Inbox (Unibox)

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| UNI-01 | Aggregated inbox across all connected email accounts | P0 | 1 |
| UNI-02 | Highlight/prioritize replies from prospects/customers | P0 | 1 |
| UNI-03 | AI-powered reply categorization (Interested, Not Interested, OOO, Objection, etc.) | P1 | 1 |
| UNI-04 | Reply directly from unified inbox | P0 | 1 |
| UNI-05 | Filter by email account, agent, status | P0 | 1 |
| UNI-06 | Mark as read/unread, star, archive | P1 | 1 |
| UNI-07 | Link replies back to specific agent/sequence/prospect | P0 | 1 |

---

### 3.14 Email Viewer

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| VIEW-01 | View all emails sent/received per email account | P0 | 1 |
| VIEW-02 | View emails sent by a specific AI agent | P0 | 1 |
| VIEW-03 | Thread view (full conversation per prospect) | P1 | 1 |
| VIEW-04 | Search emails by keyword, prospect, date | P1 | 1 |

---

### 3.15 Subscription & Billing (Phase 3)

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| SUB-01 | Free tier with limited agents, prospects, and emails/day | P1 | 3 |
| SUB-02 | Pro tier with higher limits | P1 | 3 |
| SUB-03 | Enterprise tier with unlimited everything | P2 | 3 |
| SUB-04 | Stripe integration for payment processing | P1 | 3 |
| SUB-05 | Usage tracking and limit enforcement | P1 | 3 |

---

### 3.16 AI Sidekick (Conversational Assistant)

A persistent, in-platform AI chatbot that acts as an alternative (and complement) to the traditional UI. The Sidekick can execute **any** platform action via natural language — creating agents, adding products, importing prospects, checking metrics, replying to emails, adjusting settings, and more. It uses function-calling / tool-use to map user intents to platform API actions.

**Example User Commands:**
- *"Create an AI agent named 'Fintech Outreach' for my SaaS product, target CTOs at fintech companies"*
- *"Import this CSV of leads and add them to my Enterprise prospect list"*
- *"Show me how many emails Agent X sent today"*
- *"Pause all agents"*
- *"Add a new Gmail account with this app password"*
- *"Generate prospect profiles for my new product"*
- *"Reply to the email from John at Acme Corp saying we'd love to schedule a call"*
- *"Change the sending limit for Agent Y to 50 per day"*
- *"Show me all replies from today, prioritized by interest"*

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| SIDE-01 | Persistent chat panel accessible from any page (slide-out drawer or floating widget) | P0 | 1 |
| SIDE-02 | Natural language understanding for all platform actions | P0 | 1 |
| SIDE-03 | Function-calling / tool-use architecture — Sidekick maps intents to internal API calls | P0 | 1 |
| SIDE-04 | Multi-step workflows: Sidekick can chain actions (e.g., create product → generate prospects → create agent → start agent) | P0 | 1 |
| SIDE-05 | Confirmation prompts before destructive actions (delete, start agent, send emails) | P0 | 1 |
| SIDE-06 | Context-aware: Sidekick knows which page/agent/product the user is currently viewing | P1 | 1 |
| SIDE-07 | Conversation history persisted per user | P1 | 1 |
| SIDE-08 | Display results inline (tables, cards, metrics) not just plain text | P1 | 1 |
| SIDE-09 | Streaming responses for real-time feedback | P1 | 1 |
| SIDE-10 | Guided onboarding: Sidekick walks new users through initial setup (company profile → products → email accounts → first agent) | P1 | 1 |
| SIDE-11 | Error handling with human-readable suggestions when actions fail | P0 | 1 |
| SIDE-12 | Keyboard shortcut to toggle Sidekick (e.g., Cmd/Ctrl + K) | P1 | 1 |
| SIDE-13 | Suggest next actions based on platform state (e.g., "You have products but no agents — want me to create one?") | P2 | 2 |
| SIDE-14 | Voice input support (future) | P2 | 3 |

**Architecture:**
- Uses the user's own LLM (configured in LLM settings) with function-calling/tool-use
- Tools map 1:1 to platform API endpoints (createAgent, addProduct, importProspects, etc.)
- Sidekick system prompt includes platform state context (user's products, agents, accounts)
- Conversation stored in database for history and context continuity
- Streaming via Server-Sent Events (SSE) for real-time chat experience

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Security** | All API keys encrypted at rest (AES-256). HTTPS everywhere. RBAC for multi-user. |
| **Performance** | Email queue processing < 100ms per job. Dashboard loads < 2s. |
| **Scalability** | Support 10K+ prospects per agent, 50+ agents per user, 100+ email accounts. |
| **Reliability** | 99.9% uptime for sending engine. Retry logic for failed sends. Dead letter queue. |
| **Compliance** | CAN-SPAM compliant (unsubscribe link in every email). GDPR-aware (data deletion). |
| **Observability** | Structured logging. Email status tracking. Error alerting. |

---

## 5. Release Phases

### Phase 1 — MVP (Target: 10-12 weeks)
- Authentication (Google + Email/Password)
- LLM configuration (BYOK)
- Email account management (Resend + Gmail)
- Company profile (auto-generate + manual)
- Product management (manual + website scrape)
- AI agent creation with guidelines
- Prospect management (manual + CSV import + basic auto-generation)
- AI-generated email sequences
- Email sending with rate limiting & scheduling
- Basic unified inbox
- Email viewer
- **AI Sidekick** (conversational assistant with full platform control)

### Phase 2 — Enhancement (Target: 4-6 weeks after Phase 1)
- Email warmup system
- Spintax & A/B testing
- Advanced prospect management (DNC lists, enrichment)
- Agent cloning & activity logs
- Advanced scheduling (prospect timezone)
- Improved analytics dashboard

### Phase 3 — Scale & Monetize (Target: 4-6 weeks after Phase 2)
- Subscription & billing (Stripe)
- Instantly / Apollo.io / LinkedIn integrations
- Custom SMTP support
- Platform-provided LLM fallback
- Team/workspace features
- API access for power users

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| Avg. email deliverability rate | > 95% |
| Avg. email open rate | > 40% |
| Avg. reply rate | > 5% |
| User activation (creates first agent within 24hrs) | > 60% |
| Agent creation to first email sent | < 15 minutes |
| Sidekick usage rate (% of users using Sidekick for actions) | > 40% |
| Sidekick task completion rate | > 85% |

---

## 7. Open Questions

1. **Product Name:** "MailPilot AI" is a working name — finalize branding?
2. **Multi-tenant / Team features:** Should Phase 1 support team workspaces or single-user only?
3. **Email tracking:** Do we implement open/click tracking via tracking pixels in Phase 1?
4. **Prospect finder budget:** Which free-tier prospect APIs should we prioritize first?
5. **Self-hosted vs Cloud:** Deploy as cloud SaaS, self-hosted, or both?
