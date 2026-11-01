import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/admin/db";
import { clientIpFrom } from "@/lib/ip";

/**
 * Database-backed rate limits: they survive restarts, and going over the
 * limit locks the key out for a while instead of just resetting the window.
 */
export type Rule = { limit: number; windowMs: number; blockMs: number };

const MIN = 60_000;
export const RULES = {
  login: { limit: 5, windowMs: 15 * MIN, blockMs: 30 * MIN },
  totp: { limit: 5, windowMs: 15 * MIN, blockMs: 60 * MIN },
  reset: { limit: 3, windowMs: 60 * MIN, blockMs: 60 * MIN },
  ip: { limit: 60, windowMs: 15 * MIN, blockMs: 15 * MIN },
  form: { limit: 6, windowMs: 10 * MIN, blockMs: 20 * MIN },
} satisfies Record<string, Rule>;

export async function limit(key: string, rule: Rule): Promise<{ ok: boolean; retryAfter: number }> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / rule.windowMs) * rule.windowMs);
  const blocked = await db.rateLimit.findFirst({ where: { key, blockedUntil: { gt: now } }, select: { blockedUntil: true } });
  if (blocked?.blockedUntil) return { ok: false, retryAfter: Math.ceil((blocked.blockedUntil.getTime() - now.getTime()) / 1000) };
  const row = await db.rateLimit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  if (row.count > rule.limit) {
    await db.rateLimit.update({ where: { id: row.id }, data: { blockedUntil: new Date(now.getTime() + rule.blockMs) } });
    return { ok: false, retryAfter: Math.ceil(rule.blockMs / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export const clearLimit = (key: string) => db.rateLimit.deleteMany({ where: { key } });

export async function clientIp() {
  return clientIpFrom(await headers());
}

export const waitText = (s: number) => (s >= 90 ? `${Math.ceil(s / 60)} minutes` : `${s} seconds`);
