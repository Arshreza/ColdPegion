/**
 * Apollo.io people-search integration.
 *
 * Activates only when APOLLO_API_KEY is set. Without it the Find Leads tool
 * falls back to searching the user's own prospect database. This keeps the
 * platform fully functional out of the box while leaving a real, documented
 * path to live lead sourcing.
 *
 * Docs: https://docs.apollo.io/reference/people-search
 */

export interface ApolloSearchFilters {
  jobTitles?: string[];
  seniorities?: string[];
  departments?: string[];
  industries?: string[];
  locations?: string[];
  headcount?: string[];
  keywords?: string[];
  technologies?: string[];
}

export interface FoundPerson {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
}

export function isApolloConfigured(): boolean {
  return Boolean(process.env.APOLLO_API_KEY);
}

// Apollo seniority tokens differ from our display labels.
const SENIORITY_MAP: Record<string, string> = {
  "C-Level": "c_suite",
  VP: "vp",
  Director: "director",
  Manager: "manager",
  Senior: "senior",
  Entry: "entry",
  Owner: "owner",
  Partner: "partner",
  Founder: "founder",
};

function mapHeadcount(buckets: string[]): string[] {
  // Apollo accepts ranges like "1,10" / "11,50".
  return buckets
    .map((b) => b.replace("+", ",100000").replace("-", ","))
    .filter(Boolean);
}

export async function searchApolloPeople(filters: ApolloSearchFilters, page = 1): Promise<FoundPerson[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return [];

  const payload: Record<string, unknown> = {
    page,
    per_page: 25,
    person_titles: filters.jobTitles?.length ? filters.jobTitles : undefined,
    person_seniorities: filters.seniorities?.length
      ? filters.seniorities.map((s) => SENIORITY_MAP[s] || s.toLowerCase())
      : undefined,
    person_department_or_subdepartments: filters.departments?.length ? filters.departments : undefined,
    organization_industry_tag_ids: undefined, // industries need tag IDs; pass as keywords instead
    person_locations: filters.locations?.length ? filters.locations : undefined,
    organization_num_employees_ranges: filters.headcount?.length ? mapHeadcount(filters.headcount) : undefined,
    q_keywords: [...(filters.keywords || []), ...(filters.industries || []), ...(filters.technologies || [])]
      .join(" ")
      .trim() || undefined,
  };

  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Apollo search failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const people = (data.people || data.contacts || []) as any[];
  return people.map((p) => ({
    email: p.email || p.personal_emails?.[0] || "",
    firstName: p.first_name,
    lastName: p.last_name,
    companyName: p.organization?.name || p.account?.name,
    jobTitle: p.title,
    industry: p.organization?.industry,
    location: [p.city, p.state, p.country].filter(Boolean).join(", "),
    linkedinUrl: p.linkedin_url,
  }));
}
