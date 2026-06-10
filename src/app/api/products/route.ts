import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { validateProductFiles } from "@/lib/security/file-validation";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
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

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await db.product.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
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
    const data = productSchema.parse(body);

    if (data.productFiles && !validateProductFiles(data.productFiles, session.user.id)) {
      return NextResponse.json({ error: "Invalid product files configuration" }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        userId: session.user.id,
        ...data,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
