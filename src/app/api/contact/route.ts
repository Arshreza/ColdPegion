import { NextResponse } from "next/server";
import { z } from "zod";
import { sendSalesInquiryEmail, sendSalesInquiryAutoReply } from "@/lib/email/transactional";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  message: z.string().min(10).max(2000),
});

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "contact", 5, 60 * 60_000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { name, email, company, message } = schema.parse(body);

    await Promise.all([
      sendSalesInquiryEmail({ name, email, company, message }),
      sendSalesInquiryAutoReply({ name, email }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
