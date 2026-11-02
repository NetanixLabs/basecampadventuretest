import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/admin/db";
import { clientIpFrom } from "@/lib/ip";
import { env } from "@/lib/admin/env";
import { hashToken, randomToken } from "@/lib/admin/crypto";

/**
 * Sessions. The cookie carries a random 256-bit token; the database keeps
 * only its SHA-256, so a stolen backup cannot be replayed as a login.
 * The cookie is host-only (admin.basecampadventure.com), httpOnly, Secure,
 * SameSite=Strict, and the session ends after inactivity.
 */
export const COOKIE = process.env.NODE_ENV === "production" ? "__Host-bca_admin" : "bca_admin";

export type CurrentUser = { id: string; email: string; name: string; role: Role; totpEnabled: boolean; permissions: string[] };
export type Auth = { user: CurrentUser; sessionId: string; mfaDone: boolean };

export const mfaRequired = () => env().REQUIRE_TOTP;

export async function createSession(userId: string) {
  const token = randomToken();
  const h = await headers();
  const expiresAt = new Date(Date.now() + env().SESSION_HOURS * 3600_000);
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: clientIpFrom(h),
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export const getAuth = cache(async (): Promise<Auth | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!s || s.revokedAt) return null;
  const now = Date.now();
  const idle = env().SESSION_IDLE_MINUTES * 60_000;
  if (s.expiresAt.getTime() <= now || now - s.lastSeenAt.getTime() > idle || s.user.status !== "active") {
    await revokeSession(s.id);
    return null;
  }
  if (now - s.lastSeenAt.getTime() > 60_000) await db.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
  return {
    user: { id: s.user.id, email: s.user.email, name: s.user.name, role: s.user.role, totpEnabled: s.user.totpEnabled, permissions: s.user.permissions },
    sessionId: s.id,
    mfaDone: !mfaRequired() || s.mfaVerifiedAt !== null,
  };
});

/**
 * Marks two-step sign-in as done and issues a brand-new session token
 * (OWASP: renew the session on privilege change), so a token seen before
 * the second step can never become a fully signed-in session.
 */
export async function markMfa(sessionId: string) {
  const token = randomToken();
  const s = await db.session.update({ where: { id: sessionId }, data: { mfaVerifiedAt: new Date(), tokenHash: hashToken(token), lastSeenAt: new Date() } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: s.expiresAt,
  });
}

export const revokeSession = (id: string) => db.session.update({ where: { id }, data: { revokedAt: new Date() } }).catch(() => undefined);

export const revokeAll = (userId: string, except?: string) =>
  db.session.updateMany({ where: { userId, revokedAt: null, ...(except ? { NOT: { id: except } } : {}) }, data: { revokedAt: new Date() } });

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.updateMany({ where: { tokenHash: hashToken(token) }, data: { revokedAt: new Date() } });
  jar.delete(COOKIE);
}
