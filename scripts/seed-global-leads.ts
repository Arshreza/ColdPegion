/**
 * One-shot seeding script for global B2B leads.
 * Usage:
 *   npx tsx scripts/seed-global-leads.ts <path-to-file>
 */
import { config } from "dotenv";
import { resolve } from "path";
import * as XLSX from "xlsx";

// Load dotenv environment variables BEFORE importing the DB client
config({ path: resolve(__dirname, "../.env") });

import { db } from "../src/lib/db";

const BATCH_SIZE = 2000;

// Normalize column headers
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Exact mapping required by the user
const EXACT_MAPPINGS: Record<string, string> = {
  firstname: "firstName",
  lastname: "lastName",
  primaryemail: "email",
  title: "jobTitle",
  companyliprofileurl: "linkedinUrl",
  companyname: "companyName",
  companylocation: "location",
  seniority: "seniority",
  department: "department",
  companystaffcount: "headcount",
};

// Synonyms for other columns, prioritized if exact columns are not matched
const OTHER_SYNONYMS: Record<string, string[]> = {
  fullName: ["fullname", "name", "contactname"],
  seniority: ["seniority", "senioritylevel", "level"],
  department: ["department", "function", "departments"],
  companyDomain: ["companydomain", "domain", "website", "companywebsite", "companyurl"],
  industry: ["industry", "companyindustry", "sector"],
  headcount: ["companysize", "headcount", "employees", "employeecount", "numberofemployees", "size"],
  location: ["location", "geography", "region", "area"],
  country: ["country", "countryregion"],
  state: ["state", "province"],
  city: ["city", "town"],
  phone: ["phone", "phonenumber", "mobile", "directphone", "workphone"],
  keywords: ["keywords", "tags", "interests"],
  technologies: ["technologies", "tech", "techstack"],
};

function buildHeaderMap(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((h, idx) => {
    const key = norm(String(h));
    
    // 1. Check exact mapping first
    if (EXACT_MAPPINGS[key]) {
      map[idx] = EXACT_MAPPINGS[key];
      return;
    }
    
    // 2. Check closest matching fields for other columns
    for (const [field, variants] of Object.entries(OTHER_SYNONYMS)) {
      if (variants.includes(key)) {
        map[idx] = field;
        return;
      }
    }
    
    // 3. Fallback: Check if the normalized key directly matches a field name (case-insensitive)
    const validFields = [
      "email", "firstName", "lastName", "fullName", "jobTitle", "seniority", 
      "department", "companyName", "companyDomain", "industry", "headcount", 
      "location", "country", "state", "city", "linkedinUrl", "phone", 
      "keywords", "technologies"
    ];
    const matchingField = validFields.find(f => f.toLowerCase() === key);
    if (matchingField) {
      map[idx] = matchingField;
      return;
    }
  });
  return map;
}

function parseEmployeeCount(headcount?: string): number | undefined {
  if (!headcount) return undefined;
  const m = headcount.replace(/,/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : undefined;
}

function clean(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s.slice(0, 1000) : undefined;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Error: Please provide the path to your CSV or Excel file.");
    console.error("Usage: npx tsx scripts/seed-global-leads.ts <path-to-file>");
    process.exit(1);
  }

  const filePath = resolve(fileArg);
  console.log(`Reading file: ${filePath}...`);

  let rows: Record<string, unknown>[];
  try {
    const wb = XLSX.readFile(filePath, { cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  } catch (e: any) {
    console.error(`Error reading file: ${e.message}`);
    process.exit(1);
  }

  if (!rows.length) {
    console.error("Error: The file is empty.");
    process.exit(1);
  }

  console.log(`Found ${rows.length} rows. Mapping columns...`);
  const headers = Object.keys(rows[0]);
  const idxMap = buildHeaderMap(headers);
  const fieldByHeader: Record<string, string> = {};
  
  headers.forEach((h, idx) => {
    if (idxMap[idx]) {
      fieldByHeader[h] = idxMap[idx];
    }
  });

  console.log("Column Mapping:");
  for (const [header, field] of Object.entries(fieldByHeader)) {
    console.log(`  - "${header}" -> ${field}`);
  }

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let batch: any[] = [];

  const flush = async () => {
    if (!batch.length) return;
    try {
      const res = await db.globalLead.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalInserted += res.count;
      // Duplicates/skipped in DB insertion
      totalSkipped += (batch.length - res.count);
    } catch (e: any) {
      console.error(`Error during batch insertion: ${e.message}`);
      // If the batch fails, treat all rows as skipped/failed
      totalSkipped += batch.length;
    }
    batch = [];
  };

  for (const row of rows) {
    totalProcessed++;
    const lead: Record<string, any> = { source: "manual_seed" };

    for (const [header, field] of Object.entries(fieldByHeader)) {
      lead[field] = clean(row[header]);
    }

    // Auto-generate fullName if missing but first/last names are present
    if (!lead.fullName && (lead.firstName || lead.lastName)) {
      lead.fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
    }

    // Auto-generate employeeCount from headcount if present
    if (lead.headcount) {
      lead.employeeCount = parseEmployeeCount(lead.headcount);
    }

    // Skip rows that have no identifying information at all
    if (!lead.email && !lead.linkedinUrl && !lead.fullName) {
      totalSkipped++;
      continue;
    }

    batch.push(lead);

    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  }

  await flush();

  console.log("\nSeeding Complete:");
  console.log(`  - Total Rows Processed: ${totalProcessed}`);
  console.log(`  - Total Rows Inserted:  ${totalInserted}`);
  console.log(`  - Total Rows Skipped:   ${totalSkipped}`);

  process.exit(0);
}

main().catch((e) => {
  console.error("Unhandled exception:", e);
  process.exit(1);
});
