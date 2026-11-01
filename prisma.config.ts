import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 keeps the connection URL here. A placeholder keeps
 * `prisma generate` working on machines without a database (CI, builds).
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx --conditions=react-server scripts/admin/seed.ts",
  },
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://DATABASE_URL-is-not-set" },
});
