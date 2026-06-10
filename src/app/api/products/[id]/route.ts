import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { validateProductFiles } from "@/lib/security/file-validation";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  usps: z.string().optional(),
  targetAudience: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
  productFiles: z.string().optional(),
  icpMode: z.enum(["PROMPT", "FILTER"]).optional(),
  icpPrompt: z.string().optional(),
  icpFilters: z.string().optional(),
});

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const existing = await db.product.findUnique({ where: { id: params.id, userId: session.user.id } });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const data = updateSchema.parse(await request.json());

    if (data.productFiles && !validateProductFiles(data.productFiles, session.user.id)) {
      return NextResponse.json({ error: "Invalid product files configuration" }, { status: 400 });
    }

    const product = await db.product.update({ where: { id: params.id }, data });
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const existing = await db.product.findUnique({ where: { id: params.id, userId: session.user.id } });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await db.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
