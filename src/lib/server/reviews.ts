import "server-only";
import { db } from "@/lib/admin/db";
import { hashToken } from "@/lib/admin/crypto";

/** The booking a review link belongs to, if the link is still valid (one review per booking). */
export async function bookingForReview(token: string) {
  if (!token || token.length > 100) return null;
  const b = await db.booking.findUnique({ where: { reviewTokenHash: hashToken(token) } });
  if (!b || !b.reviewRequestedAt || b.reviewRequestedAt.getTime() < Date.now() - 180 * 86_400_000) return null;
  return b;
}
