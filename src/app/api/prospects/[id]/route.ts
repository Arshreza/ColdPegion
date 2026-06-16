import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  isDnc:       z.boolean().optional(),
  firstName:   z.string().optional(),
  lastName:    z.string().optional(),
  companyName: z.string().optional(),
  jobTitle:    z.string().optional(),
  industry:    z.string().optional(),
  location:    z.string().optional(),
  phone:       z.string().optional(),
  website:     z.string().optional(),
  seniority:   z.string().optional(),
  department:  z.string().optional(),
  timezone:    z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
});

/** PATCH /api/prospects/[id] — update a prospect. Syncs changed fields back to GlobalLead. */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.prospect.findUnique({ where: { id: params.id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

  try {
    const data = patchSchema.parse(await request.json());
    const updated = await db.prospect.update({ where: { id: params.id }, data });

    // Write-through: keep GlobalLead in sync if this prospect has an email there
    if (updated.email) {
      const globalFields: Record<string, unknown> = {};
      if (data.jobTitle    !== undefined) globalFields.jobTitle    = data.jobTitle;
      if (data.industry    !== undefined) globalFields.industry    = data.industry;
      if (data.location    !== undefined) globalFields.location    = data.location;
      if (data.companyName !== undefined) globalFields.companyName = data.companyName;
      if (data.seniority   !== undefined) globalFields.seniority   = data.seniority;
      if (data.department  !== undefined) globalFields.department  = data.department;
      if (data.firstName   !== undefined) globalFields.firstName   = data.firstName;
      if (data.lastName    !== undefined) globalFields.lastName    = data.lastName;
      if (Object.keys(globalFields).length > 0) {
        await db.globalLead.updateMany({ where: { email: updated.email }, data: globalFields });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/prospects/[id] — remove a prospect entirely. */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await db.prospect.findUnique({ where: { id: params.id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  await db.prospect.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
