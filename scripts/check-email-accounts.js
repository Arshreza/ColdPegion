const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  const accounts = await prisma.emailAccount.findMany({
    select: {
      id: true,
      emailAddress: true,
      displayName: true,
      provider: true,
      status: true,
      gmailAppPassword: true,
      resendApiKey: true,
    },
  });
  console.log("Email Accounts in DB:");
  accounts.forEach((a) => {
    console.log(
      `  [${a.provider}] ${a.emailAddress} (${a.displayName}) — status: ${a.status}`
    );
    console.log(
      `    gmailAppPassword: ${a.gmailAppPassword ? "SET (" + a.gmailAppPassword.length + " chars)" : "EMPTY"}`
    );
    console.log(
      `    resendApiKey: ${a.resendApiKey ? "SET (" + a.resendApiKey.length + " chars)" : "EMPTY"}`
    );
  });
  if (accounts.length === 0) console.log("  (none)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
