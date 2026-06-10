import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { searchApolloPeople, isApolloConfigured } from "@/lib/prospecting/apollo";
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

const bodySchema = z.object({
  filters: filtersSchema,
  source: z.enum(["database", "apollo", "global"]).optional(),
});

/**
 * POST /api/prospects/find — Instantly-style "Super Search".
 *
 * Two data sources:
 *  - "database" (always available): filters the user's existing prospects.
 *  - "apollo" (when APOLLO_API_KEY is set): live people search via Apollo.io.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(request, "find", 30, 60_000);
  if (limited) return limited;

  try {
    const { filters, source } = bodySchema.parse(await request.json());
    const useApollo = source === "apollo" && isApolloConfigured();

    if (useApollo) {
      const results = await searchApolloPeople(filters);
      return NextResponse.json({ source: "apollo", apolloConfigured: true, results });
    }

    // Shared Global Lead Database (e.g. imported Sales Navigator data).
    if (source === "global") {
      const ands: any[] = [{ email: { not: null } }];
      const titleNeedles = [...filters.jobTitles, ...filters.seniorities, ...filters.departments];
      if (titleNeedles.length) {
        ands.push({
          OR: [
            ...titleNeedles.map((t) => ({ jobTitle: { contains: t, mode: "insensitive" } })),
            ...filters.seniorities.map((t) => ({ seniority: { contains: t, mode: "insensitive" } })),
            ...filters.departments.map((t) => ({ department: { contains: t, mode: "insensitive" } })),
          ],
        });
      }
      if (filters.industries.length) {
        ands.push({ OR: filters.industries.map((i) => ({ industry: { contains: i, mode: "insensitive" } })) });
      }
      if (filters.locations.length) {
        ands.push({
          OR: filters.locations.flatMap((l) => [
            { location: { contains: l, mode: "insensitive" } },
            { country: { contains: l, mode: "insensitive" } },
            { city: { contains: l, mode: "insensitive" } },
          ]),
        });
      }
      if (filters.headcount.length) ands.push({ headcount: { in: filters.headcount } });
      const kw = [...filters.keywords, ...filters.technologies];
      if (kw.length) {
        ands.push({
          OR: kw.flatMap((k) => [
            { companyName: { contains: k, mode: "insensitive" } },
            { keywords: { contains: k, mode: "insensitive" } },
            { technologies: { contains: k, mode: "insensitive" } },
          ]),
        });
      }

      const leads = await db.globalLead.findMany({
        where: { AND: ands },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          fullName: true,
          companyName: true,
          jobTitle: true,
          industry: true,
          location: true,
          linkedinUrl: true,
        },
        take: 200,
      });

      const total = await db.globalLead.count();
      const results = leads.map((l) => ({
        email: l.email!,
        firstName: l.firstName || l.fullName?.split(" ")[0],
        lastName: l.lastName,
        companyName: l.companyName,
        jobTitle: l.jobTitle,
        industry: l.industry,
        location: l.location,
        linkedinUrl: l.linkedinUrl || undefined,
      }));
      return NextResponse.json({ source: "global", databaseSize: total, results });
    }

    // Database search — case-insensitive OR matching across the filter dimensions.
    const ors: any[] = [];
    const titleNeedles = [...filters.jobTitles, ...filters.seniorities, ...filters.departments];
    for (const t of titleNeedles) ors.push({ jobTitle: { contains: t, mode: "insensitive" } });
    for (const i of filters.industries) ors.push({ industry: { contains: i, mode: "insensitive" } });
    for (const l of filters.locations) ors.push({ location: { contains: l, mode: "insensitive" } });
    for (const k of [...filters.keywords, ...filters.technologies]) {
      ors.push({ companyName: { contains: k, mode: "insensitive" } });
      ors.push({ customFields: { contains: k, mode: "insensitive" } });
    }

    const results = await db.prospect.findMany({
      where: {
        userId: session.user.id,
        ...(ors.length ? { OR: ors } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        jobTitle: true,
        industry: true,
        location: true,
        linkedinUrl: true,
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      source: "database",
      apolloConfigured: isApolloConfigured(),
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Find error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const importSchema = z.object({
  listId: z.string().min(1),
  prospects: z
    .array(
      z.object({
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyName: z.string().optional(),
        jobTitle: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
        linkedinUrl: z.string().optional(),
      })
    )
    .min(1),
});

/** PUT /api/prospects/find — import selected search results into a list. */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { listId, prospects } = importSchema.parse(await request.json());
    const list = await db.prospectList.findUnique({ where: { id: listId, userId: session.user.id } });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    let imported = 0;
    for (const p of prospects) {
      const prospect = await db.prospect.upsert({
        where: { userId_email: { userId: session.user.id, email: p.email } },
        update: {
          firstName: p.firstName || undefined,
          lastName: p.lastName || undefined,
          companyName: p.companyName || undefined,
          jobTitle: p.jobTitle || undefined,
          industry: p.industry || undefined,
          location: p.location || undefined,
          linkedinUrl: p.linkedinUrl || undefined,
        },
        create: {
          userId: session.user.id,
          email: p.email,
          firstName: p.firstName,
          lastName: p.lastName,
          companyName: p.companyName,
          jobTitle: p.jobTitle,
          industry: p.industry,
          location: p.location,
          linkedinUrl: p.linkedinUrl,
          source: "finder",
        },
      });
      await db.prospectListEntry.upsert({
        where: { prospectId_prospectListId: { prospectId: prospect.id, prospectListId: listId } },
        update: {},
        create: { prospectId: prospect.id, prospectListId: listId },
      });
      imported++;
    }

    return NextResponse.json({ imported });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Find import error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
