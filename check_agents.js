const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.agent.findMany({
    include: {
      emailAccounts: true,
      prospectLists: true,
    }
  });
  console.log(JSON.stringify(agents, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
