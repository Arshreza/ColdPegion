/**
 * Bulk lead importer for the shared Global Lead Database.
 *
 * Reads every .csv / .xlsx / .xls file in a directory (default ./lead-data),
 * auto-maps common LinkedIn Sales Navigator / Apollo export columns, and bulk-
 * inserts them into the GlobalLead table. De-duplicates on linkedinUrl.
 *
 * Usage:
 *   npx tsx scripts/import-leads.ts ./path/to/folder
 *   npx tsx scripts/import-leads.ts ./lead-data --source sales_navigator
 *
 * Tip: drop your exported Google Drive spreadsheets into ./lead-data and run.
 * Large files are processed one at a time; rows are written in batches.
 */
import { config } from "dotenv";
import { resolve, join, extname } from "path";
import { readdirSync, statSync } from "fs";
import * as XLSX from "xlsx";

config({ path: resolve(__dirname, "../.env") });

import { db } from "../src/lib/db";

const BATCH = 2000;

// Normalize a header to a comparable key.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Map of GlobalLead field -> list of accepted header variants (normalized).
const FIELD_SYNONYMS: Record<string, string[]> = {
  email: ["email", "emailaddress", "workemail", "businessemail", "primaryemail"],
  firstName: ["firstname", "fname", "givenname"],
  lastName: ["lastname", "lname", "surname", "familyname"],
  fullName: ["fullname", "name", "contactname"],
  jobTitle: ["title", "jobtitle", "position", "role", "currenttitle"],
  seniority: ["seniority", "senioritylevel", "level"],
  department: ["department", "function", "departments"],
  companyName: ["company", "companyname", "organization", "account", "accountname", "employer"],
  companyDomain: ["companydomain", "domain", "website", "companywebsite", "companyurl"],
  industry: ["industry", "companyindustry", "sector"],
  headcount: ["companysize", "headcount", "employees", "employeecount", "numberofemployees", "size"],
  location: ["location", "geography", "region", "area"],
  country: ["country", "countryregion"],
  state: ["state", "province"],
  city: ["city", "town"],
  linkedinUrl: ["linkedinurl", "linkedin", "profileurl", "linkedinprofile", "personlinkedinurl", "salesnavurl", "salesnavigatorurl"],
  phone: ["phone", "phonenumber", "mobile", "directphone", "workphone"],
  keywords: ["keywords", "tags", "interests"],
  technologies: ["technologies", "tech", "techstack"],
};

function buildHeaderMap(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((h, idx) => {
    const key = norm(String(h));
    for (const [field, variants] of Object.entries(FIELD_SYNONYMS)) {
      if (variants.includes(key)) {
        map[idx] = field;
        break;
      }
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

async function importFile(filePath: string, source: string): Promise<{ read: number; inserted: number }> {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (!rows.length) return { read: 0, inserted: 0 };

  const headers = Object.keys(rows[0]);
  const idxMap = buildHeaderMap(headers);
  const fieldByHeader: Record<string, string> = {};
  headers.forEach((h, idx) => {
    if (idxMap[idx]) fieldByHeader[h] = idxMap[idx];
  });

  let inserted = 0;
  let batch: any[] = [];

  const flush = async () => {
    if (!batch.length) return;
    const res = await db.globalLead.createMany({ data: batch, skipDuplicates: true });
    inserted += res.count;
    batch = [];
  };

  for (const row of rows) {
    const lead: Record<string, any> = { source };
    for (const [header, field] of Object.entries(fieldByHeader)) {
      lead[field] = clean(row[header]);
    }
    if (!lead.fullName && (lead.firstName || lead.lastName)) {
      lead.fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
    }
    lead.employeeCount = parseEmployeeCount(lead.headcount);
    // Skip rows with no usable identity at all.
    if (!lead.email && !lead.linkedinUrl && !lead.fullName) continue;
    batch.push(lead);
    if (batch.length >= BATCH) await flush();
  }
  await flush();

  return { read: rows.length, inserted };
}

async function main() {
  const args = process.argv.slice(2);
  const dir = resolve(args.find((a) => !a.startsWith("--")) || "./lead-data");
  const sourceFlagIdx = args.indexOf("--source");
  const source = sourceFlagIdx >= 0 ? args[sourceFlagIdx + 1] : "sales_navigator";

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    console.error(`Directory not found: ${dir}\nCreate it and drop your .csv/.xlsx exports inside, then re-run.`);
    process.exit(1);
  }

  const files = entries
    .filter((f) => [".csv", ".xlsx", ".xls"].includes(extname(f).toLowerCase()))
    .map((f) => join(dir, f))
    .filter((f) => statSync(f).isFile());

  if (!files.length) {
    console.error(`No .csv/.xlsx/.xls files in ${dir}`);
    process.exit(1);
  }

  console.log(`Importing ${files.length} file(s) from ${dir} (source="${source}")...`);
  let totalRead = 0;
  let totalInserted = 0;
  for (const file of files) {
    process.stdout.write(`  ${file} ... `);
    try {
      const { read, inserted } = await importFile(file, source);
      totalRead += read;
      totalInserted += inserted;
      console.log(`${read} rows read, ${inserted} new leads`);
    } catch (e) {
      console.log(`FAILED: ${(e as Error).message}`);
    }
  }
  console.log(`\nDone. ${totalRead} rows read, ${totalInserted} leads inserted (duplicates skipped).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
