import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extname } from "path";
import { randomUUID } from "crypto";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { matchesMagicBytes } from "@/lib/security/file-validation";
import { saveUpload } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".xlsx", ".xls", ".csv",
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".ppt", ".pptx", ".doc", ".docx",
]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimitRes = await enforceRateLimit(request, "upload", 10, 60000);
  if (rateLimitRes) return rateLimitRes;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `File type ${ext} is not allowed` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // The extension alone is spoofable — the content must match it too.
  if (!matchesMagicBytes(buffer, ext)) {
    return NextResponse.json(
      { error: `File content does not match its ${ext} extension` },
      { status: 400 }
    );
  }

  const filename = `${randomUUID()}${ext}`;
  const key = `products/${session.user.id}/${filename}`;
  await saveUpload(key, buffer, file.type || undefined);

  return NextResponse.json({
    url: `/uploads/${key}`,
    filename: file.name,
  });
}
