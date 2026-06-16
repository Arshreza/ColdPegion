// Copies prospects into the GlobalLead table so they appear in "Leads Database".
// Uses createMany + skipDuplicates (DB-level dedup via email unique constraint).
// Safe to re-run — will only insert genuinely new records.
//
// Usage:
//   node scripts/sync-prospects-to-global.js                  — syncs ALL users
//   node scripts/sync-prospects-to-global.js --email a@b.com  — syncs one user

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

function industryFromListName(name = "") {
  const n = name.toLowerCase();
  if (n.includes("software") || n.includes("tech") || n.includes("hr") ||
      n.includes("campus") || n.includes("infosys") || n.includes("tcs") ||
      n.includes("oracle") || n.includes("sap") || n.includes("hcl") ||
      n.includes("startup") || n.includes("founder") || n.includes("rajkot") ||
      n.includes("gujarat") || n.includes("it") || n.includes("big tech")) {
    return "Information Technology";
  }
  return "Information Technology"; // sensible default for B2B contacts
}

async function syncUser(userId, email) {
  const prospects = await db.prospect.findMany({
    where: { userId },
    select: {
      email: true, firstName: true, lastName: true,
      companyName: true, jobTitle: true, location: true,
      linkedinUrl: true, phone: true, industry: true,
      seniority: true, department: true,
      listEntries: { select: { prospectList: { select: { name: true } } } },
    },
  });

  if (prospects.length === 0) return { inserted: 0, total: 0 };

  const records = prospects.map((p) => {
    const listName = p.listEntries?.[0]?.prospectList?.name ?? "";
    return {
      email:       p.email       || undefined,
      firstName:   p.firstName   || undefined,
      lastName:    p.lastName    || undefined,
      fullName:    [p.firstName, p.lastName].filter(Boolean).join(" ") || undefined,
      companyName: p.companyName || undefined,
      jobTitle:    p.jobTitle    || undefined,
      location:    p.location    || undefined,
      linkedinUrl: p.linkedinUrl || undefined,
      phone:       p.phone       || undefined,
      industry:    p.industry    || industryFromListName(listName),
      seniority:   p.seniority   || undefined,
      department:  p.department  || undefined,
      source:      "csv_import",
    };
  });

  // Insert in batches of 50 to avoid Neon timeouts
  let inserted = 0;
  for (let i = 0; i < records.length; i += 50) {
    const result = await db.globalLead.createMany({
      data: records.slice(i, i + 50),
      skipDuplicates: true,
    });
    inserted += result.count;
  }
  return { inserted, total: prospects.length };
}

async function main() {
  const emailArg = process.argv.includes("--email")
    ? process.argv[process.argv.indexOf("--email") + 1]
    : null;

  const users = emailArg
    ? await db.user.findMany({ where: { email: emailArg }, select: { id: true, email: true } })
    : await db.user.findMany({ select: { id: true, email: true } });

  if (users.length === 0) {
    console.error("No users found" + (emailArg ? ` for ${emailArg}` : ""));
    return;
  }

  let totalInserted = 0;
  for (const user of users) {
    const { inserted, total } = await syncUser(user.id, user.email);
    console.log(`  ${user.email}: ${total} prospects → +${inserted} new in GlobalLead`);
    totalInserted += inserted;
  }

  // Patch any remaining csv_import records that still have null industry
  const patched = await db.globalLead.updateMany({
    where: { source: "csv_import", industry: null },
    data: { industry: "Information Technology" },
  });

  const newTotal = await db.globalLead.count();
  console.log(`\n✅ Done.`);
  console.log(`   Total new records: ${totalInserted}`);
  console.log(`   Records patched (industry null→IT): ${patched.count}`);
  console.log(`   GlobalLead total: ${newTotal}`);
}

main().catch(console.error).finally(() => db.$disconnect());
