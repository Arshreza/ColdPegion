// One-time script: parse all export-*.csv files and insert into the production DB.
// Run: node scripts/import-csv-leads.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const ROOT = path.join(__dirname, "..");
const CSV_FILES = fs
  .readdirSync(ROOT)
  .filter((f) => f.startsWith("export-") && f.endsWith(".csv"));

async function main() {
  // Find the owner account
  const user = await db.user.findFirst({ where: { email: "hkjigar3@gmail.com" } });
  if (!user) throw new Error("User hkjigar3@gmail.com not found in DB");
  console.log(`✓ Found user: ${user.id}`);

  // Create one prospect list that holds all imported contacts
  const list = await db.prospectList.create({
    data: { name: "Software Roles — CSV Import June 2026", userId: user.id },
  });
  console.log(`✓ Created prospect list: "${list.name}" (${list.id})\n`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const file of CSV_FILES) {
    const filePath = path.join(ROOT, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { data } = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.toLowerCase().trim(),
    });

    let fileImported = 0;
    let fileSkipped = 0;

    for (const row of data) {
      const email = (row.email || "").trim().toLowerCase();
      if (!email) { fileSkipped++; continue; }

      // Skip only definitively invalid/spam emails
      const status = (row["verification status"] || "").toLowerCase();
      if (status === "invalid" || status === "spamtrap" || status === "disposable") {
        fileSkipped++;
        continue;
      }

      const firstName = row["first name"] || undefined;
      const lastName  = row["last name"]  || undefined;
      const company   = row["company"]    || undefined;
      const jobTitle  = row["job title"]  || undefined;
      const linkedin  = row["linkedin"]   || undefined;
      const phone     = row["phone number"] || undefined;

      const bounceStatus =
        status === "valid"      ? "VALID"     :
        status === "accept_all" ? "CATCH_ALL"  :
        status === "catch-all"  ? "CATCH_ALL"  : "UNKNOWN";

      try {
        const prospect = await db.prospect.upsert({
          where: { userId_email: { userId: user.id, email } },
          update:  { firstName, lastName, companyName: company, jobTitle, linkedinUrl: linkedin, phone, bounceStatus },
          create: {
            userId: user.id,
            email,
            firstName,
            lastName,
            companyName: company,
            jobTitle,
            linkedinUrl: linkedin,
            phone,
            bounceStatus,
            isVerified: status === "valid",
            verifiedAt: new Date(),
            verificationScore: row.score ? parseFloat(row.score) : null,
          },
        });

        await db.prospectListEntry.upsert({
          where: { prospectId_prospectListId: { prospectId: prospect.id, prospectListId: list.id } },
          update:  {},
          create: { prospectId: prospect.id, prospectListId: list.id },
        });

        fileImported++;
        totalImported++;
      } catch (err) {
        console.error(`  ✗ Failed ${email}: ${err.message}`);
        fileSkipped++;
        totalSkipped++;
      }
    }

    console.log(`${file}: ${fileImported} imported, ${fileSkipped} skipped`);
  }

  console.log(`\n✅ Done — ${totalImported} leads imported, ${totalSkipped} skipped`);
  console.log(`   Prospect list ID: ${list.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
