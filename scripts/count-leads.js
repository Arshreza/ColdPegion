require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await db.user.findFirst({ where: { email: "hkjigar3@gmail.com" }, select: { id: true } });
  const total = await db.prospect.count({ where: { userId: user.id } });

  // Count the built-in lead database (source = 'database' or null from the seeded data)
  const lists = await db.prospectList.findMany({
    where: { userId: user.id },
    include: { _count: { select: { prospects: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log("Total prospects in DB:", total);
  console.log("\nAll prospect lists:");
  for (const l of lists) {
    console.log(`  [${l.isOrgShared ? "ORG-SHARED" : "personal  "}] "${l.name}" — ${l._count.prospects} contacts`);
  }
}
main().catch(console.error).finally(() => db.$disconnect());
