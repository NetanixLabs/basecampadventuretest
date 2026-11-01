"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { decrypt, encrypt, hashToken } from "@/lib/admin/crypto";
import { issueResetLink } from "@/lib/admin/reset";
import { db } from "@/lib/admin/db";
import { sendTemplate } from "@/lib/admin/email/send";
import { dummyHash, hashPassword, passwordProblem, verifyPassword } from "@/lib/admin/password";
import { clearLimit, clientIp, limit, RULES, waitText } from "@/lib/admin/rate-limit";
import { createSession, endSession, getAuth, markMfa, mfaRequired, revokeAll, revokeSession } from "@/lib/admin/session";
import { checkCode, checkUserCode, enableTotp, newEnrollment, useBackupCode } from "@/lib/admin/totp";

export type FormState = { error?: string; ok?: string } | null;

const SETUP_COOKIE = "bca_totp_setup";

/* ------------------------------------------------------------------ sign in */

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const ip = await clientIp();
  for (const key of [`login:ip:${ip}`, `login:email:${email}`]) {
    const r = await limit(key, key.includes(":ip:") ? RULES.ip : RULES.login);
    if (!r.ok) return { error: `Too many attempts. Try again in ${waitText(r.retryAfter)}, or reset your password.` };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Same work whether or not the account exists, so timing reveals nothing.
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await dummyHash()), false);
  if (!user || !valid || user.status !== "active") {
    await audit(user?.id ?? null, "login.failed", "user", user?.id, email);
    return { error: "That email and password don't match." };
  }

  await clearLimit(`login:email:${email}`);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "login.password", "user", user.id);

  if (!mfaRequired()) redirect("/");
  redirect(user.totpEnabled ? "/login/verify" : "/login/setup-2fa");
}

/* ------------------------------------------------------------ 2FA challenge */

export async function verifyTwoFactor(_prev: FormState, form: FormData): Promise<FormState> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const code = String(form.get("code") ?? "").trim();
  if (!code) return { error: "Enter the 6-digit code from your authenticator app." };

  const r = await limit(`totp:${auth.user.id}`, RULES.totp);
  if (!r.ok) {
    await revokeSession(auth.sessionId);
    await audit(auth.user.id, "login.2fa.locked", "user", auth.user.id);
    return { error: `Too many wrong codes. Sign in again in ${waitText(r.retryAfter)}.` };
  }

  const digits = code.replace(/\s/g, "");
  const ok = /^\d{6}$/.test(digits) ? await checkUserCode(auth.user.id, digits) : await useBackupCode(auth.user.id, code);
  if (!ok) {
    await audit(auth.user.id, "login.2fa.failed", "user", auth.user.id);
    return { error: "That code didn't work. Codes change every 30 seconds; try the newest one." };
  }
  await clearLimit(`totp:${auth.user.id}`);
  await markMfa(auth.sessionId);
  await audit(auth.user.id, /^\d{6}$/.test(digits) ? "login.2fa" : "login.backup-code", "user", auth.user.id);
  redirect("/");
}

/* ---------------------------------------------------------------- 2FA setup */

/**
 * Starts (or resumes) setup. The new secret is kept encrypted in a
 * short-lived cookie until the person proves their phone has it.
 * Called from the setup screen, because cookies can only be set in an action.
 */
export async function beginTotpSetup(): Promise<{ qr: string; secret: string } | { error: string }> {
  const auth = await getAuth();
  if (!auth) return { error: "Please sign in again." };
  const jar = await cookies();
  const existing = jar.get(SETUP_COOKIE)?.value;
  let secret: string | null = null;
  if (existing) {
    try {
      const parsed = JSON.parse(decrypt(existing)) as { secret: string; uid: string };
      if (parsed.uid === auth.user.id) secret = parsed.secret;
    } catch {
      /* start again */
    }
  }
  const enrollment = secret ? { secret, qr: await qrFor(auth.user.email, secret) } : await newEnrollment(auth.user.email);
  jar.set(SETUP_COOKIE, encrypt(JSON.stringify({ secret: enrollment.secret, uid: auth.user.id })), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60,
  });
  return enrollment;
}

async function qrFor(email: string, secret: string) {
  const { generateURI } = await import("otplib");
  const QR = (await import("qrcode")).default;
  return QR.toDataURL(generateURI({ issuer: "Base Camp Adventure", label: email, secret }), { width: 220, margin: 1 });
}

export async function confirmTotpSetup(_prev: (FormState & { codes?: string[] }) | null, form: FormData): Promise<(FormState & { codes?: string[] }) | null> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const raw = (await cookies()).get(SETUP_COOKIE)?.value;
  if (!raw) return { error: "This setup expired. Reload the page to get a new QR code." };
  let secret: string;
  try {
    const parsed = JSON.parse(decrypt(raw)) as { secret: string; uid: string };
    if (parsed.uid !== auth.user.id) throw new Error("wrong user");
    secret = parsed.secret;
  } catch {
    return { error: "This setup expired. Reload the page to get a new QR code." };
  }
  const r = await limit(`totp:${auth.user.id}`, RULES.totp);
  if (!r.ok) return { error: `Too many wrong codes. Try again in ${waitText(r.retryAfter)}.` };
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!checkCode(code, secret)) return { error: "That code didn't match. Check your phone's time is set automatically, and try the newest code." };

  const codes = await enableTotp(auth.user.id, secret);
  await markMfa(auth.sessionId);
  await revokeAll(auth.user.id, auth.sessionId);
  (await cookies()).delete(SETUP_COOKIE);
  await clearLimit(`totp:${auth.user.id}`);
  await audit(auth.user.id, "2fa.enabled", "user", auth.user.id);
  return { ok: "Two-step sign-in is on.", codes };
}

/* --------------------------------------------------------- forgot / reset */

export async function requestReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const done = { ok: "If that email belongs to an admin account, a reset link is on its way. It works for 30 minutes." };
  if (!z.email().safeParse(email).success) return { error: "Enter the email address you sign in with." };
  const ip = await clientIp();
  const a = await limit(`reset:email:${email}`, RULES.reset);
  const b = await limit(`reset:ip:${ip}`, RULES.ip);
  if (!a.ok || !b.ok) return done;
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "active") {
    const link = await issueResetLink(user.id);
    await sendTemplate("password-reset", user.email, { name: user.name }, { buttonHref: link });
    await audit(user.id, "password.reset-requested", "user", user.id);
  }
  return done;
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password !== confirm) return { error: "The two passwords don't match." };

  const row = token.length > 20 ? await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } }) : null;
  if (!row || row.consumedAt || row.expiresAt <= new Date() || row.user.status !== "active") {
    return { error: "This link has expired or was already used. Ask for a new one." };
  }
  const problem = passwordProblem(password, row.user.email);
  if (problem) return { error: problem };

  const burned = await db.passwordResetToken.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (burned.count !== 1) return { error: "This link has expired or was already used. Ask for a new one." };

  await db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } });
  await revokeAll(row.userId);
  await audit(row.userId, "password.reset", "user", row.userId);
  const stamp = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" });
  void sendTemplate("password-changed", row.user.email, { name: row.user.name, when: stamp }).catch(() => undefined);
  redirect("/login?reset=1");
}

export async function signOut() {
  const auth = await getAuth();
  if (auth) await audit(auth.user.id, "logout", "user", auth.user.id);
  await endSession();
  redirect("/login");
}
