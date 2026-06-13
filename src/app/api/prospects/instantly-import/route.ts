import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { decrypt } from "@/lib/encryption";
import {
  startInstantlyEnrichment,
  getInstantlyEnrichmentStatus,
  fetchInstantlyLeads,
  isInstantlyConfigured,
} from "@/lib/prospecting/instantly";
import { importFoundProspects } from "@/lib/prospecting/import";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const filtersSchema = z.object({
  jobTitles: z.array(z.string()).default([]),
  seniorities: z.array(z.string()).default([]),
  departments: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  headcount: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

const startSchema = z.object({
  filters: filtersSchema,
  limit: z.number().int().min(1).max(1000),
  listId: z.string().min(1),
});

async function getUserInstantlyKey(userId: string): Promise<string | null> {
  const settings = await db.globalSettings.findUnique({ where: { userId } });
  if (!settings?.instantlyApiKey) return null;
  try {
    return decrypt(settings.instantlyApiKey);
  } catch {
    return null;
  }
}

/**
 * POST /api/prospects/instantly-import — start an Instantly SuperSearch
 * enrichment for the filtered audience. Spends the user's Instantly credits
 * (1 per lead). Returns a resourceId to poll with GET.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(request, "instantly-import", 10, 60_000);
  if (limited) return limited;

  try {
    const { filters, limit, listId } = startSchema.parse(await request.json());

    const list = await db.prospectList.findUnique({ where: { id: listId, userId: session.user.id } });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const apiKey = await getUserInstantlyKey(session.user.id);
    if (!isInstantlyConfigured(apiKey)) {
      return NextResponse.json(
        { error: "Connect your Instantly API key in Settings → Integrations first." },
        { status: 400 }
      );
    }

    const resourceId = await startInstantlyEnrichment(filters, limit, apiKey);
    return NextResponse.json({ resourceId });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Instantly import start error:", error);
    const message = error instanceof Error ? error.message : "Failed to start Instantly import";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * GET /api/prospects/instantly-import?resourceId=…&listId=… — poll the
 * enrichment; once finished, pull the enriched leads (with emails) from the
 * user's Instantly workspace and import them into the target list.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const resourceId = url.searchParams.get("resourceId");
  const listId = url.searchParams.get("listId");
  if (!resourceId || !listId) {
    return NextResponse.json({ error: "resourceId and listId are required" }, { status: 400 });
  }

  try {
    const list = await db.prospectList.findUnique({ where: { id: listId, userId: session.user.id } });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const apiKey = await getUserInstantlyKey(session.user.id);
    if (!isInstantlyConfigured(apiKey)) {
      return NextResponse.json({ error: "Instantly API key is not configured." }, { status: 400 });
    }

    const status = await getInstantlyEnrichmentStatus(resourceId, apiKey);
    if (status.inProgress) return NextResponse.json({ status: "running" });
    if (status.hasNoLeads) return NextResponse.json({ status: "complete", imported: 0 });

    const leads = await fetchInstantlyLeads(resourceId, apiKey);
    const imported = await importFoundProspects(session.user.id, listId, leads, "instantly");
    return NextResponse.json({ status: "complete", imported });
  } catch (error) {
    console.error("Instantly import poll error:", error);
    const message = error instanceof Error ? error.message : "Failed to check Instantly import";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
