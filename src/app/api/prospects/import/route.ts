import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { verifyEmail } from "@/lib/verification/email-verifier";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const listId = formData.get("listId") as string;
    const verifyEmails = formData.get("verifyEmails") === "true";
    const mappingsJson = formData.get("mappings") as string;

    if (!file || !listId) {
      return NextResponse.json({ error: "File and Target List are required" }, { status: 400 });
    }

    const userMappings = mappingsJson ? JSON.parse(mappingsJson) : null;
    const mappings: Record<string, string> = {};
    if (userMappings) {
      for (const [key, val] of Object.entries(userMappings)) {
        if (typeof val === "string") {
          mappings[key] = val.toLowerCase().trim();
        }
      }
    }

    // Ensure the list belongs to the user.
    const list = await db.prospectList.findUnique({ where: { id: listId, userId: session.user.id } });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    // Parse CSV or Excel (.xlsx/.xls) into lower-cased header rows.
    const name = (file.name || "").toLowerCase();
    let rows: Record<string, string>[] = [];
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      rows = raw.map((r) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) out[k.toLowerCase().trim()] = String(v ?? "");
        return out;
      });
    } else {
      const fileContent = await file.text();
      const parsedData = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim(),
      });
      rows = parsedData.data as Record<string, string>[];
    }

    // Fetch ZeroBounce API key if verification requested
    let zeroBounceApiKey: string | null = null;
    if (verifyEmails) {
      const settings = await db.globalSettings.findUnique({ where: { userId: session.user.id } });
      zeroBounceApiKey = settings?.zeroBounceApiKey ? decrypt(settings.zeroBounceApiKey) : null;
    }

    let importedCount = 0;
    let skippedCount = 0;
    const skippedEmails: string[] = [];
    
    for (const row of rows) {
      const emailKey = mappings.email || "email";
      const email = (row[emailKey] || row.email || row["email address"] || row.e_mail || "").trim().toLowerCase();
      if (!email) continue;

      // Run verification if requested
      let bounceStatus: "VALID" | "INVALID" | "CATCH_ALL" | "DISPOSABLE" | "SPAMTRAP" | "UNKNOWN" = "UNKNOWN";
      let verificationScore: number | null = null;

      if (verifyEmails) {
        try {
          const result = await verifyEmail(email, zeroBounceApiKey);
          bounceStatus = result.status;
          verificationScore = result.score;

          // Skip emails that are definitively invalid or spam traps
          if (bounceStatus === "INVALID" || bounceStatus === "SPAMTRAP") {
            skippedCount++;
            skippedEmails.push(email);
            continue;
          }
        } catch (verifyErr) {
          console.warn(`Verification failed for ${email}, importing anyway`);
          bounceStatus = "UNKNOWN";
        }
      }

      const prospect = await db.prospect.upsert({
        where: {
          userId_email: {
            userId: session.user.id,
            email: email,
          }
        },
        update: {
          // Update verification status if we ran verification
          ...(verifyEmails && {
            bounceStatus,
            verificationScore,
            verifiedAt: new Date(),
            isVerified: verifyEmails,
          }),
          firstName:   row[mappings.firstName   || "first name"]   || row.firstname   || undefined,
          lastName:    row[mappings.lastName    || "last name"]    || row.lastname    || undefined,
          companyName: row[mappings.companyName || "company"]      || row["company name"] || undefined,
          jobTitle:    row[mappings.jobTitle    || "title"]        || row["job title"] || row["jobtitle"] || undefined,
          linkedinUrl: row[mappings.linkedinUrl || "linkedin"]     || row["linkedin url"] || row["linkedin_url"] || undefined,
          location:    row[mappings.location    || "location"]     || row.city        || undefined,
          timezone:    row[mappings.timezone    || "timezone"]     || row["time zone"] || undefined,
          industry:    row[mappings.industry    || "industry"]     || row.sector      || row["company industry"] || undefined,
          seniority:   row[mappings.seniority   || "seniority"]   || row["seniority level"] || undefined,
          department:  row[mappings.department  || "department"]   || row.dept        || undefined,
          phone:       row[mappings.phone       || "phone"]        || row["phone number"] || row.mobile || undefined,
          website:     row[mappings.website     || "website"]      || row["company website"] || row.url || undefined,
        },
        create: {
          userId: session.user.id,
          email: email,
          firstName:   row[mappings.firstName   || "first name"]   || row.firstname   || undefined,
          lastName:    row[mappings.lastName    || "last name"]    || row.lastname    || undefined,
          companyName: row[mappings.companyName || "company"]      || row["company name"] || undefined,
          jobTitle:    row[mappings.jobTitle    || "title"]        || row["job title"] || row["jobtitle"] || undefined,
          linkedinUrl: row[mappings.linkedinUrl || "linkedin"]     || row["linkedin url"] || row["linkedin_url"] || undefined,
          location:    row[mappings.location    || "location"]     || row.city        || undefined,
          timezone:    row[mappings.timezone    || "timezone"]     || row["time zone"] || undefined,
          industry:    row[mappings.industry    || "industry"]     || row.sector      || row["company industry"] || undefined,
          seniority:   row[mappings.seniority   || "seniority"]   || row["seniority level"] || undefined,
          department:  row[mappings.department  || "department"]   || row.dept        || undefined,
          phone:       row[mappings.phone       || "phone"]        || row["phone number"] || row.mobile || undefined,
          website:     row[mappings.website     || "website"]      || row["company website"] || row.url || undefined,
          bounceStatus,
          verificationScore,
          verifiedAt: verifyEmails ? new Date() : undefined,
          isVerified: verifyEmails,
        }
      });

      await db.prospectListEntry.upsert({
        where: {
          prospectId_prospectListId: {
            prospectId: prospect.id,
            prospectListId: listId,
          }
        },
        update: {},
        create: {
          prospectId: prospect.id,
          prospectListId: listId,
        }
      });

      importedCount++;
    }

    return NextResponse.json({ 
      message: "Import complete", 
      imported: importedCount,
      skipped: skippedCount,
      skippedEmails: skippedCount > 0 ? skippedEmails.slice(0, 10) : [], // Return first 10 skipped
    }, { status: 200 });

  } catch (error) {
    console.error("CSV Import error:", error);
    return NextResponse.json({ error: "Failed to process CSV file" }, { status: 500 });
  }
}
