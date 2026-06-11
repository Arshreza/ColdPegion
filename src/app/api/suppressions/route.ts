import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Papa from "papaparse";
import { z } from "zod";
import { addSuppressions, MAX_SUPPRESSIONS_PER_UPLOAD } from "@/lib/suppression";

const PAGE_SIZE = 50;

/** GET /api/suppressions?search=&page= — list suppression entries (paginated). */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);

  const where = {
    userId: session.user.id,
    ...(search ? { value: { contains: search } } : {}),
  };
  const [total, entries] = await Promise.all([
    db.suppressionEntry.count({ where }),
    db.suppressionEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, value: true, reason: true, createdAt: true },
    }),
  ]);
  return NextResponse.json({ entries, total, page, pageSize: PAGE_SIZE });
}

/**
 * POST /api/suppressions — add entries.
 * - multipart/form-data with a "file" (.csv/.txt): emails/domains are extracted
 *   from an email/domain-named column when present, otherwise from every cell.
 * - application/json: { values: string[] }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let rawValues: string[] = [];
    let reason = "manual";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
      }
      rawValues = extractValuesFromFile(await file.text(), file.name || "");
      reason = "upload";
    } else {
      const { values } = z
        .object({ values: z.array(z.string()).min(1).max(MAX_SUPPRESSIONS_PER_UPLOAD) })
        .parse(await request.json());
      rawValues = values;
    }

    if (rawValues.length === 0) {
      return NextResponse.json({ error: "No emails or domains found in the file" }, { status: 400 });
    }
    if (rawValues.length > MAX_SUPPRESSIONS_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Too many entries — max ${MAX_SUPPRESSIONS_PER_UPLOAD} per upload` },
        { status: 400 }
      );
    }

    const result = await addSuppressions(session.user.id, rawValues, reason);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    console.error("Suppression upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/suppressions?id=... — remove one entry. */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const row = await db.suppressionEntry.findFirst({ where: { id, userId: session.user.id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.suppressionEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

/**
 * Pull candidate emails/domains out of an uploaded file. For CSVs with a
 * header row we prefer columns named like email/domain; otherwise we take
 * every cell/line and let normalization drop the junk.
 */
function extractValuesFromFile(content: string, filename: string): string[] {
  if (filename.toLowerCase().endsWith(".csv") || content.includes(",")) {
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.toLowerCase().trim(),
    });
    const headers = parsed.meta.fields || [];
    const targetCols = headers.filter((h) => h.includes("email") || h.includes("domain"));
    if (targetCols.length > 0) {
      const out: string[] = [];
      for (const row of parsed.data) {
        for (const col of targetCols) if (row[col]) out.push(row[col]);
      }
      return out;
    }
    // No recognizable header — re-parse without one and flatten all cells.
    const flat = Papa.parse<string[]>(content, { skipEmptyLines: true });
    return (flat.data || []).flat().filter(Boolean);
  }
  return content.split(/[\r\n;,]+/).filter(Boolean);
}
