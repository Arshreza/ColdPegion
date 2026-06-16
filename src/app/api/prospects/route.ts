import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const prospectSchema = z.object({
  email:       z.string().email("Valid email required"),
  firstName:   z.string().optional().or(z.literal("")),
  lastName:    z.string().optional().or(z.literal("")),
  companyName: z.string().optional().or(z.literal("")),
  jobTitle:    z.string().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  industry:    z.string().optional().or(z.literal("")),
  location:    z.string().optional().or(z.literal("")),
  phone:       z.string().optional().or(z.literal("")),
  website:     z.string().optional().or(z.literal("")),
  seniority:   z.string().optional().or(z.literal("")),
  department:  z.string().optional().or(z.literal("")),
  timezone:    z.string().optional().or(z.literal("")),
  listId:      z.string().min(1, "List is required"),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("listId");

  try {
    const query = {
      where: { 
        userId: session.user.id,
        ...(listId && { listEntries: { some: { prospectListId: listId } } })
      },
      orderBy: { createdAt: "desc" as const },
      include: {
        listEntries: {
          include: { prospectList: true }
        }
      }
    };

    const prospects = await db.prospect.findMany(query);
    return NextResponse.json(prospects);
  } catch (error) {
    console.error("Prospects GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = prospectSchema.parse(body);

    // Upsert prospect (incase they exist but we are adding to a new list)
    const prospect = await db.prospect.upsert({
      where: {
        userId_email: {
          userId: session.user.id,
          email: data.email,
        }
      },
      update: {
        firstName:   data.firstName   || undefined,
        lastName:    data.lastName    || undefined,
        companyName: data.companyName || undefined,
        jobTitle:    data.jobTitle    || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        industry:    data.industry    || undefined,
        location:    data.location    || undefined,
        phone:       data.phone       || undefined,
        website:     data.website     || undefined,
        seniority:   data.seniority   || undefined,
        department:  data.department  || undefined,
        timezone:    data.timezone    || undefined,
      },
      create: {
        userId:      session.user.id,
        email:       data.email,
        firstName:   data.firstName   || undefined,
        lastName:    data.lastName    || undefined,
        companyName: data.companyName || undefined,
        jobTitle:    data.jobTitle    || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        industry:    data.industry    || undefined,
        location:    data.location    || undefined,
        phone:       data.phone       || undefined,
        website:     data.website     || undefined,
        seniority:   data.seniority   || undefined,
        department:  data.department  || undefined,
        timezone:    data.timezone    || undefined,
      }
    });

    // Link prospect to list
    await db.prospectListEntry.upsert({
      where: {
        prospectId_prospectListId: {
          prospectId: prospect.id,
          prospectListId: data.listId,
        }
      },
      update: {},
      create: {
        prospectId: prospect.id,
        prospectListId: data.listId,
      }
    });

    return NextResponse.json(prospect, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Prospect POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
