import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Verify the Svix signature that Resend attaches to every webhook.
    // Without this, any caller could spoof events (fake opens, bounces, etc.).
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // In production, refuse to process unsigned webhooks — they're spoofable.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 503 }
        );
      }
      // In development, log a warning but allow processing for convenience.
      console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET is not set — skipping signature verification (dev only)");
    }
    if (webhookSecret) {
      const svixId = request.headers.get("svix-id");
      const svixTimestamp = request.headers.get("svix-timestamp");
      const svixSignature = request.headers.get("svix-signature");
      if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
      }
      try {
        const wh = new Webhook(webhookSecret);
        wh.verify(rawBody, { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature });
      } catch {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    
    // Resend webhook format usually wraps the event in 'type' and 'data'
    const eventType = payload?.type;
    const emailId = payload?.data?.email_id; // This corresponds to our 'messageId'

    if (!eventType || !emailId) {
      return NextResponse.json({ error: "Missing event type or email_id" }, { status: 400 });
    }

    // Find the email in our database using the messageId returned from Resend
    const emailRecord = await db.email.findFirst({
      where: { messageId: emailId },
    });

    if (!emailRecord) {
      // If we don't have this email, we can't update it. Return 200 to acknowledge receipt.
      return NextResponse.json({ message: "Email not found, ignored." }, { status: 200 });
    }

    const now = new Date();
    let updateData: any = {};

    // Map Resend events to our EmailStatus enum and timestamp fields
    switch (eventType) {
      case "email.delivered":
        updateData.status = "DELIVERED";
        // Only set receivedAt if not already set (just in case)
        if (!emailRecord.receivedAt) {
          updateData.receivedAt = now;
        }
        break;

      case "email.bounced":
      case "email.complained": // Hard spam complaint is effectively a bounce for us
        updateData.status = "BOUNCED";
        updateData.bouncedAt = now;
        break;

      case "email.opened":
        // Only update status to OPENED if it hasn't advanced to CLICKED, REPLIED, or BOUNCED
        if (["SENT", "DELIVERED", "QUEUED"].includes(emailRecord.status)) {
          updateData.status = "OPENED";
        }
        if (!emailRecord.openedAt) {
          updateData.openedAt = now;
        }
        break;

      case "email.clicked":
        // Only update status to CLICKED if it hasn't advanced to REPLIED or BOUNCED
        if (["SENT", "DELIVERED", "OPENED", "QUEUED"].includes(emailRecord.status)) {
          updateData.status = "CLICKED";
        }
        if (!emailRecord.clickedAt) {
          updateData.clickedAt = now;
        }
        break;

      default:
        // Ignore other events
        return NextResponse.json({ message: `Event ${eventType} ignored.` }, { status: 200 });
    }

    if (Object.keys(updateData).length > 0) {
      await db.email.update({
        where: { id: emailRecord.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    // Return 200 even on some internal errors to prevent Resend from retrying continuously 
    // unless it's a critical failure we want retries for.
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
