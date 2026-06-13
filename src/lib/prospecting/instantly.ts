import type { FoundPerson } from "./apollo";

/**
 * Instantly.ai SuperSearch integration, driven by the user's own Instantly
 * API key (Dashboard → Settings → Integrations), with an optional
 * INSTANTLY_API_KEY env fallback.
 *
 * Instantly's lead database works in two phases:
 *  - Preview (free): returns matching people WITHOUT email addresses.
 *  - Enrich (1 Instantly credit per lead): asynchronously resolves verified
 *    emails into an Instantly lead list, which we then pull and import.
 *
 * Endpoints (api.instantly.ai/api/v2, Bearer auth):
 *  - POST /supersearch-enrichment/preview-leads-from-supersearch
 *  - POST /supersearch-enrichment/enrich-leads-from-supersearch
 *  - GET  /supersearch-enrichment/{resourceId}   (status poll)
 *  - POST /lead-lists                            (create target list)
 *  - POST /leads/list                            (page through list leads)
 */

const BASE_URL = "https://api.instantly.ai/api/v2";

export interface InstantlyFilters {
  jobTitles?: string[];
  seniorities?: string[];
  departments?: string[];
  industries?: string[];
  locations?: string[];
  headcount?: string[];
  keywords?: string[];
  technologies?: string[];
}

export function isInstantlyConfigured(userApiKey?: string | null): boolean {
  return Boolean(userApiKey || process.env.INSTANTLY_API_KEY);
}

function resolveKey(userApiKey?: string | null): string | null {
  return userApiKey || process.env.INSTANTLY_API_KEY || null;
}

// Our headcount buckets → Instantly's employeeCount buckets (approximate —
// the two products slice company size differently).
const HEADCOUNT_MAP: Record<string, string[]> = {
  "1-10": ["0 - 25"],
  "11-50": ["25 - 100"],
  "51-200": ["100 - 250"],
  "201-500": ["250 - 1000"],
  "501-1000": ["250 - 1000"],
  "1001-5000": ["1K - 10K"],
  "5001-10000": ["1K - 10K"],
  "10000+": ["10K - 50K", "50K - 100K", "> 100K"],
};

function buildSearchFilters(filters: InstantlyFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // Seniorities ("VP", "Director", …) work as title terms in Instantly.
  const titles = [...(filters.jobTitles || []), ...(filters.seniorities || [])];
  if (titles.length) out.title = { include: titles };

  if (filters.industries?.length) out.industry = { include: filters.industries };

  // Legacy array-of-strings location format (free-text friendly).
  if (filters.locations?.length) out.locations = filters.locations;

  if (filters.headcount?.length) {
    const buckets = new Set<string>();
    for (const h of filters.headcount) for (const b of HEADCOUNT_MAP[h] || []) buckets.add(b);
    if (buckets.size) out.employeeCount = [...buckets];
  }

  const keywords = [
    ...(filters.keywords || []),
    ...(filters.technologies || []),
    ...(filters.departments || []),
  ]
    .join(" ")
    .trim();
  if (keywords) out.keyword_filter = { include: keywords };

  return out;
}

async function instantlyRequest<T>(
  apiKey: string,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Instantly API ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Free preview of matching people. No emails at this stage — Instantly only
 * reveals verified emails through (paid) enrichment.
 */
export async function previewInstantlyLeads(
  filters: InstantlyFilters,
  userApiKey?: string | null
): Promise<{ count: number; results: FoundPerson[] }> {
  const apiKey = resolveKey(userApiKey);
  if (!apiKey) return { count: 0, results: [] };

  const data = await instantlyRequest<{
    count?: number;
    leads?: Array<{
      firstName?: string;
      lastName?: string;
      fullName?: string;
      jobTitle?: string;
      location?: string;
      linkedIn?: string;
      companyName?: string;
    }>;
  }>(apiKey, "POST", "/supersearch-enrichment/preview-leads-from-supersearch", {
    search_filters: buildSearchFilters(filters),
  });

  const results: FoundPerson[] = (data.leads || []).map((l) => ({
    email: "", // revealed only by enrichment
    firstName: l.firstName || l.fullName?.split(" ")[0],
    lastName: l.lastName || l.fullName?.split(" ").slice(1).join(" ") || undefined,
    companyName: l.companyName,
    jobTitle: l.jobTitle,
    location: l.location,
    linkedinUrl: l.linkedIn,
  }));
  return { count: data.count ?? results.length, results };
}

/**
 * Kick off email enrichment for the filtered audience. Creates a dedicated
 * lead list in the user's Instantly workspace and enriches into it — this
 * spends the user's Instantly credits (1 per lead). Returns the list id,
 * which doubles as the enrichment resource id for status polling.
 */
export async function startInstantlyEnrichment(
  filters: InstantlyFilters,
  limit: number,
  userApiKey?: string | null
): Promise<string> {
  const apiKey = resolveKey(userApiKey);
  if (!apiKey) throw new Error("Instantly API key is not configured.");

  const list = await instantlyRequest<{ id?: string }>(apiKey, "POST", "/lead-lists", {
    name: `ColdPegion import ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
  });
  if (!list.id) throw new Error("Instantly did not return a lead list id.");

  await instantlyRequest(apiKey, "POST", "/supersearch-enrichment/enrich-leads-from-supersearch", {
    search_filters: buildSearchFilters(filters),
    limit,
    resource_id: list.id,
    work_email_enrichment: true,
    skip_rows_without_email: true,
    search_name: "ColdPegion Super Search",
  });

  return list.id;
}

export async function getInstantlyEnrichmentStatus(
  resourceId: string,
  userApiKey?: string | null
): Promise<{ inProgress: boolean; hasNoLeads: boolean }> {
  const apiKey = resolveKey(userApiKey);
  if (!apiKey) throw new Error("Instantly API key is not configured.");

  const data = await instantlyRequest<{ in_progress?: boolean; has_no_leads?: boolean }>(
    apiKey,
    "GET",
    `/supersearch-enrichment/${resourceId}`
  );
  return { inProgress: Boolean(data.in_progress), hasNoLeads: Boolean(data.has_no_leads) };
}

/** Page through an Instantly lead list and return everyone with an email. */
export async function fetchInstantlyLeads(
  listId: string,
  userApiKey?: string | null,
  cap = 1000
): Promise<FoundPerson[]> {
  const apiKey = resolveKey(userApiKey);
  if (!apiKey) throw new Error("Instantly API key is not configured.");

  const out: FoundPerson[] = [];
  let startingAfter: string | undefined;

  while (out.length < cap) {
    const data = await instantlyRequest<{
      items?: Array<{
        id?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        company_name?: string;
        website?: string;
        custom_variables?: Record<string, string>;
      }>;
      next_starting_after?: string;
    }>(apiKey, "POST", "/leads/list", {
      list: listId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    const items = data.items || [];
    for (const l of items) {
      if (!l.email) continue;
      out.push({
        email: l.email,
        firstName: l.first_name,
        lastName: l.last_name,
        companyName: l.company_name,
        jobTitle: l.custom_variables?.title || l.custom_variables?.jobTitle,
        location: l.custom_variables?.location,
      });
    }

    if (!data.next_starting_after || items.length < 100) break;
    startingAfter = data.next_starting_after;
  }

  return out.slice(0, cap);
}
