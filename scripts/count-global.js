require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const db = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

async function main() {
  const total = await db.globalLead.count();
  const withEmail = await db.globalLead.count({ where: { email: { not: null } } });
  const byIndustry = await db.globalLead.groupBy({ by: ["industry"], _count: true, orderBy: { _count: { industry: "desc" } }, take: 8 });
  console.log("GlobalLead total:", total);
  console.log("With email:", withEmail);
  console.log("Top industries:", JSON.stringify(byIndustry.map(r => ({ industry: r.industry, count: r._count })), null, 2));
}
main().catch(console.error).finally(() => db.$disconnect());
