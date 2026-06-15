// Copies all user prospects into the GlobalLead table so they appear in the
// "Leads Database" tab with the correct count.
// Run: node scripts/sync-prospects-to-global.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const db = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

async function main() {
  const user = await db.user.findFirst({ where: { email: "hkjigar3@gmail.com" }, select: { id: true } });

  const prospects = await db.prospect.findMany({
    where: { userId: user.id },
    select: {
      email: true, firstName: true, lastName: true,
      companyName: true, jobTitle: true, location: true,
      linkedinUrl: true, phone: true, industry: true,
    },
  });

  console.log(`Syncing ${prospects.length} prospects → GlobalLead…`);

  // Bulk-fetch existing emails + linkedin URLs in one query each to avoid N+1
  const existingEmails = new Set(
    (await db.globalLead.findMany({ where: { email: { not: null } }, select: { email: true } }))
      .map((r) => r.email)
  );
  const existingLinkedins = new Set(
    (await db.globalLead.findMany({ where: { linkedinUrl: { not: null } }, select: { linkedinUrl: true } }))
      .map((r) => r.linkedinUrl)
  );

  const toInsert = prospects.filter((p) => {
    if (p.email && existingEmails.has(p.email)) return false;
    if (p.linkedinUrl && existingLinkedins.has(p.linkedinUrl)) return false;
    return true;
  });

  console.log(`New records to insert: ${toInsert.length}  Already exist: ${prospects.length - toInsert.length}`);

  if (toInsert.length > 0) {
    await db.globalLead.createMany({
      data: toInsert.map((p) => ({
        email:       p.email       || undefined,
        firstName:   p.firstName   || undefined,
        lastName:    p.lastName    || undefined,
        fullName:    [p.firstName, p.lastName].filter(Boolean).join(" ") || undefined,
        companyName: p.companyName || undefined,
        jobTitle:    p.jobTitle    || undefined,
        location:    p.location    || undefined,
        linkedinUrl: p.linkedinUrl || undefined,
        phone:       p.phone       || undefined,
        industry:    p.industry    || undefined,
        source:      "csv_import",
      })),
      skipDuplicates: true,
    });
  }

  const newTotal = await db.globalLead.count();
  console.log(`✅ Done. GlobalLead total is now: ${newTotal}`);
}

main().catch(console.error).finally(() => db.$disconnect());
