// Prisma 7 config — URLs live here, NOT in schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // For local dev: DATABASE_URL is the prisma+postgres:// proxy URL
    // which already handles shadow DB internally.
    // For production: swap to DATABASE_URL_UNPOOLED (direct postgres URL).
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
