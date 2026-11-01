import "server-only";
import { db } from "@/lib/admin/db";
import { env } from "@/lib/admin/env";
import { hashToken, randomToken } from "@/lib/admin/crypto";
import { clientIp } from "@/lib/admin/rate-limit";

/**
 * A single-use "choose a password" link. Only the token's hash is stored, and
 * asking again burns any earlier link. 30 minutes for a reset, 3 days for an
 * invitation. (Deliberately not in a "use server" file: it must never be
 * callable from a browser.)
 */
export async function issueResetLink(userId: string, ttlMs = 30 * 60_000) {
  await db.passwordResetToken.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
  const token = randomToken();
  await db.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs), requestedIp: await clientIp() } });
  return `${env().ADMIN_URL.replace(/\/$/, "")}/reset?token=${token}`;
}
