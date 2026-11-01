import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * One Prisma client per process, created on first use so a build never needs
 * a database connection.
 */
const g = globalThis as unknown as { __bcaPrisma?: PrismaClient };

function client(): PrismaClient {
  if (g.__bcaPrisma) return g.__bcaPrisma;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");
  g.__bcaPrisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, max: 10 }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  return g.__bcaPrisma;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const c = client();
    const v = Reflect.get(c, prop, c);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
