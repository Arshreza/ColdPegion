// Import new.csv as org-shared prospect lists (one per group).
// Run: node scripts/import-new-csv.js

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

const GROUP_NAMES = {
  "software-only":    "HR / Campus Recruiters — Software Companies",
  "rajkot-gujarat":   "Rajkot & Gujarat — Local Tech Companies",
  "software-founders":"Gujarat Software Founders",
  "software-companies":"Enterprise Software Companies (SAP, Oracle…)",
  "startup-founders": "India Startup Founders",
  "software-hr":      "Big Tech HR & Campus Emails (TCS, Infosys, HCL…)",
};

async function main() {
  const user = await db.user.findFirst({ where: { email: "hkjigar3@gmail.com" } });
  if (!user) throw new Error("User not found");
  console.log(`✓ User: ${user.id}`);

  const content = fs.readFileSync(path.join(__dirname, "../new.csv"), "utf-8");
  const { data } = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.toLowerCase().trim(),
  });

  // Group rows by the "group" column
  const grouped = {};
  for (const row of data) {
    const g = (row.group || "other").trim();
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(row);
  }

  for (const [groupKey, rows] of Object.entries(grouped)) {
    const listName = GROUP_NAMES[groupKey] || groupKey;

    const list = await db.prospectList.create({
      data: {
        userId: user.id,
        name: listName,
        description: `Org-shared list imported from new.csv (group: ${groupKey})`,
        isOrgShared: true,
      },
    });

    let imported = 0;
    for (const row of rows) {
      const email = (row.email || "").trim().toLowerCase();
      if (!email) continue;

      const prospect = await db.prospect.upsert({
        where: { userId_email: { userId: user.id, email } },
        update: {
          firstName:   row.first_name   || undefined,
          lastName:    row.last_name    || undefined,
          companyName: row.company      || undefined,
          jobTitle:    row.job_title    || undefined,
          linkedinUrl: row.linkedin     || undefined,
          location:    row.location     || undefined,
        },
        create: {
          userId:      user.id,
          email,
          firstName:   row.first_name   || undefined,
          lastName:    row.last_name    || undefined,
          companyName: row.company      || undefined,
          jobTitle:    row.job_title    || undefined,
          linkedinUrl: row.linkedin     || undefined,
          location:    row.location     || undefined,
          bounceStatus: "UNKNOWN",
        },
      });

      await db.prospectListEntry.upsert({
        where: {
          prospectId_prospectListId: {
            prospectId:     prospect.id,
            prospectListId: list.id,
          },
        },
        update:  {},
        create: { prospectId: prospect.id, prospectListId: list.id },
      });

      imported++;
    }

    console.log(`✓ "${listName}" — ${imported} contacts (org-shared)`);
  }

  console.log("\n✅ All groups imported as org-shared lists.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
