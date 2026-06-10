# MailPilot AI — MCP-First Architecture Plan

**Goal:** make the entire platform operable through **MCP (Model Context Protocol)**
so a user can drive everything — mine leads (via their other Claude connectors),
import them, configure products/agents, write per-lead email sequences, and launch
campaigns — **from their own Claude**, using **their Claude subscription** instead
of our LLM budget or their API key. "MCP-first": every action is an MCP tool, and
all LLM-heavy generation can be delegated to the client's Claude (zero platform
token spend).

---

## 1. The core idea (token saving)

Today the platform calls an LLM (the user's configured API key) to write emails and
sequences. MCP-first flips this:

```
User's Claude (their subscription)
  ├─ uses OTHER connectors (Apollo MCP, web search, LinkedIn, …) to MINE leads
  ├─ calls MailPilot MCP: import_leads(list, leads[])
  ├─ WRITES the sequence / per-lead emails itself (no platform LLM)
  ├─ calls MailPilot MCP: set_agent_sequence(...) / prepare_emails(...)
  └─ calls MailPilot MCP: launch_agent(...)
MailPilot worker
  └─ SENDS the pre-written emails verbatim — no LLM call at send time
```

Result: lead mining + copywriting happen on the user's Claude plan; our worker only
sends. No platform API tokens, no user API key required.

---

## 2. Transport & hosting

- **Remote MCP server over Streamable HTTP**, hosted in this Next.js app at
  `POST/GET /api/mcp`. Users add it as a connector in Claude (Desktop config or
  claude.ai custom connector).
- Use **`mcp-handler`** (Vercel adapter for `@modelcontextprotocol/sdk`) to bridge
  the MCP server to a Next.js App Router route (handles Streamable HTTP + SSE +
  sessions). Stateless per-request server build keyed to the authenticated user.
- zod note: project is on zod v4; register tool inputs as **JSON Schema** via zod
  v4 `z.toJSONSchema()` to avoid SDK/zod-v3 coupling.

## 3. Authentication

- **Phase A — Personal Access Tokens (ship first).** User generates a token in
  **Settings → API & MCP**. Client sends `Authorization: Bearer mp_live_…`. We store
  only a SHA‑256 hash + a short prefix; show the secret once; revocable; `lastUsedAt`
  tracked. `verifyToken` resolves `{ userId, organizationId, role, scopes }`.
- **Phase B — OAuth 2.1** (MCP Authorization spec: metadata, dynamic client
  registration, authorize, token, PKCE) so claude.ai "Add custom connector" works
  without pasting a token. Reuse NextAuth session for the consent screen.

## 4. Tools (reuse the Sidekick registry)

`src/lib/sidekick/tools.ts` already exposes ~28 user-scoped tools (`buildSidekickTools(ctx)`)
built with AI-SDK `tool()` + zod. We **reuse the same registry** for MCP:
- Extract each tool's `name`, `description`, `inputSchema` (→ JSON Schema), `execute`.
- Register every tool on the MCP server; at call time read the authed user from
  `extra.authInfo`, rebuild the ctx, and run that tool's `execute`.
- One registry powers both the in-app Sidekick **and** MCP. No duplication.

New MCP-specific tools (token-saving):
- `import_leads(listName, leads[])` — bulk import mined leads (create list if absent).
- `set_agent_sequence(agentIdOrName, steps[])` — set static multi-step templates
  (subject/body with `{{firstName}}` vars), no platform LLM.
- `prepare_emails(agentIdOrName, items[{ prospectEmail, step, subject, body }])` —
  store **per-lead precomputed emails**; the worker sends them verbatim.
- `get_icp(productName)` / `list_unassigned_prospects(...)` — context helpers so
  Claude can mine/target precisely.

## 5. Token-saving send path

- New model **`PreparedEmail`** `(agentId, prospectId, step, subject, body, status)`
  unique on `(agentId, prospectId, step)`.
- New agent mode `sequenceMode = EXTERNAL` (a.k.a. "Bring-your-own-Claude"): the
  worker, for each prospect/step, **uses the PreparedEmail if present**; otherwise
  falls back to STATIC template; only uses the platform LLM if explicitly AI mode.
- Make the platform LLM **optional everywhere** (already mostly true) so an org can
  run entirely on MCP-supplied content with no `LlmConfig`.

## 6. Resources & prompts (later)

- **Resources:** read-only data as MCP resources — `mailpilot://stats/deliverability`,
  `mailpilot://prospects/{listId}`, `mailpilot://agents` — so Claude reads context
  cheaply.
- **Prompts:** guided workflows, e.g. `mine_and_launch` ("find N leads matching this
  ICP, import to a list, draft a 3-step sequence, launch").

## 7. Security

- Token hashing (SHA‑256), one-time reveal, revoke, `lastUsedAt`, optional scopes
  (`read` / `write` / `admin`). Destructive/admin tools require the right scope/role.
- Rate-limit the `/api/mcp` endpoint (reuse `enforceRateLimit`).
- Audit log of MCP tool calls (`McpAuditLog`: userId, tool, ts, ok).
- Treat all MCP inputs as untrusted (zod-validated already); never echo secrets.

---

## 8. Delivery phases

**Phase 0 — Foundation (first PR)**
1. `ApiToken` model + `lib/mcp/tokens.ts` (generate/hash/verify, updates `lastUsedAt`).
2. Token management API (`/api/tokens` CRUD) + **Settings → API & MCP** UI (reveal once, revoke).
3. Shared tool registry adapter (reuse `buildSidekickTools`).
4. `/api/mcp` route via `mcp-handler`, PAT-authenticated, exposing all reused tools.
5. **Connect page** (`/dashboard/mcp`) with copy-paste connector config + token.

**Phase 1 — Token-saving generation ✅ DONE**
6. ✅ `PreparedEmail` model (unique on agent+prospect+step) + bulk MCP tools:
   `import_leads` (≤500/call), `set_agent_sequence`, `prepare_emails` (≤500/call,
   one unique email per lead). All available over MCP and in the in-app Sidekick.
7. ✅ Worker resolves a `PreparedEmail` FIRST and sends it verbatim with **no LLM
   call**; `EXTERNAL` agent mode (only sends what was prepared); marks prepared
   rows SENT. Platform LLM already optional for STATIC/EXTERNAL.

**At-scale flow (zero platform tokens):**
`import_leads` (paginate) → `prepare_emails` (paginate, one email per lead) →
`launch_agent`. The worker sends Claude-written copy at the agent's pace/limits.

**Phase 2 — OAuth connector ✅ DONE.** OAuth 2.1 + PKCE + Dynamic Client
Registration so claude.ai adds the connector one-click (no pasted token). Routes:
`/api/oauth/register|authorize|token`, discovery at
`/.well-known/oauth-authorization-server` + `/.well-known/oauth-protected-resource`
(via rewrites). The MCP 401 returns `WWW-Authenticate` with `resource_metadata`
so clients auto-discover the flow. `/api/mcp` accepts PATs **and** OAuth access
tokens. Models: `OAuthClient`, `OAuthAuthCode`, `OAuthToken`.
> Note: verified the discovery chain locally; the full authorize→token round-trip
> should be confirmed against claude.ai's connector UI.

**Phase 3 — Resources & prompts ✅ DONE.** Read-only resources
(`mailpilot://overview|deliverability|agents|lists`) and guided prompts
(`mine_and_launch`, `draft_followups`) in `lib/mcp/extras.ts`.

---

## 9. Dependencies
`mcp-handler`, `@modelcontextprotocol/sdk` (already have `zod`). MCP endpoint is
additive; nothing existing changes behavior until a user connects.
