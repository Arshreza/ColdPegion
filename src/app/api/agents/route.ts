import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const agentSchema = z
  .object({
    name: z.string().min(1, "Agent name is required"),
    description: z.string().optional(),
    productMode: z.enum(["SINGLE", "GROUP", "ALL"]),
    productIds: z.array(z.string()).optional(),
    sequenceMode: z.enum(["AI_GENERATED", "STATIC", "HYBRID", "EXTERNAL"]),
    guidelines: z.string().optional().or(z.literal("")),
    // Accept a single id (legacy) or arrays (multi-list / load-balanced mailboxes).
    targetListId: z.string().optional(),
    targetListIds: z.array(z.string()).optional(),
    senderAccountId: z.string().optional(),
    senderAccountIds: z.array(z.string()).optional(),
    includeUnsubscribe: z.boolean().optional(),
  })
  .transform((d) => ({
    ...d,
    listIds: d.targetListIds?.length ? d.targetListIds : d.targetListId ? [d.targetListId] : [],
    accountIds: d.senderAccountIds?.length ? d.senderAccountIds : d.senderAccountId ? [d.senderAccountId] : [],
  }))
  .refine((d) => d.listIds.length > 0, { message: "At least one target prospect list is required" })
  .refine((d) => d.accountIds.length > 0, { message: "At least one sender email account is required" });

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agents = await db.agent.findMany({
      where: { userId: session.user.id },
      include: {
        products: { include: { product: true } },
        prospectLists: { include: { prospectList: true } },
        emailAccounts: { include: { emailAccount: true } },
        _count: { select: { emails: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Agents GET error:", error);
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
    const data = agentSchema.parse(body);

    const agent = await db.agent.create({
      data: {
        userId: session.user.id,
        name: data.name,
        description: data.description,
        productMode: data.productMode,
        sequenceMode: data.sequenceMode,
        guidelines: data.guidelines,
        includeUnsubscribe: data.includeUnsubscribe ?? true,
        status: "DRAFT",
        
        // Relationship connections using Prisma standard creation pattern
        products: data.productIds ? {
          create: data.productIds.map(id => ({ productId: id }))
        } : undefined,

        prospectLists: {
          create: data.listIds.map((id) => ({ prospectListId: id }))
        },

        emailAccounts: {
          create: data.accountIds.map((id) => ({ emailAccountId: id }))
        }
      }
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Agent POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
