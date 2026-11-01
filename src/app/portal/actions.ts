"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/admin/db";
import { hashToken, randomToken } from "@/lib/admin/crypto";
import { env } from "@/lib/admin/env";
import { sendTemplate, officeEmail } from "@/lib/admin/email/send";
import { dummyHash, hashPassword, passwordProblem, verifyPassword } from "@/lib/admin/password";
import { limit, RULES } from "@/lib/admin/rate-limit";
import { features } from "@/lib/admin/features";
import { clientIpFrom } from "@/lib/ip";
import { checkToken, cleanDetails, createPortalSession, endPortalSession, getTraveller, ownBooking, writeDetails } from "@/lib/server/portal";

export type PortalState = { error?: string; ok?: string; email?: string } | null;

const ip = async () => clientIpFrom(await headers());
const wait = (s: number) => `Too many attempts. Try again in ${Math.ceil(s / 60)} minutes.`;

async function portalOn() {
  return (await features()).portal.enabled;
}

export async function portalSignIn(_: PortalState, form: FormData): Promise<PortalState> {
  if (!(await portalOn())) return { error: "Trip pages are not available right now." };
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(form.get("password") ?? "");
  for (const key of [`portal:login:${email}`, `portal:ip:${await ip()}`]) {
    const r = await limit(key, key.includes(":ip:") ? RULES.ip : RULES.login);
    if (!r.ok) return { error: wait(r.retryAfter), email };
  }
  const t = await db.traveller.findUnique({ where: { email } });
  // Same work whether or not the account exists, so the answer time gives nothing away.
  const ok = await verifyPassword(password, t?.passwordHash ?? (await dummyHash()));
  if (!t || !t.passwordHash || !ok || t.status !== "active" || t.expiresAt < new Date()) return { error: "That email and password don't match an active trip page.", email };
  await createPortalSession(t.id);
  redirect("/");
}

export async function portalSetPassword(_: PortalState, form: FormData): Promise<PortalState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const r = await limit(`portal:set:${await ip()}`, { limit: 10, windowMs: 15 * 60_000, blockMs: 30 * 60_000 });
  if (!r.ok) return { error: wait(r.retryAfter) };
  const row = await checkToken(token);
  if (!row) return { error: "This link has expired or was already used. Ask us for a new one, or use 'Forgot password'." };
  const problem = passwordProblem(password, row.traveller.email);
  if (problem) return { error: problem };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The two passwords are not the same." };
  const used = await db.travellerToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!used.count) return { error: "This link was already used." };
  await db.travellerSession.updateMany({ where: { travellerId: row.travellerId, revokedAt: null }, data: { revokedAt: new Date() } });
  await db.traveller.update({ where: { id: row.travellerId }, data: { passwordHash: await hashPassword(password), status: "active" } });
  await createPortalSession(row.travellerId);
  redirect("/");
}

export async function portalForgot(_: PortalState, form: FormData): Promise<PortalState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const done = { ok: "If that email has a trip page, a reset link is on its way. It works for one hour." };
  for (const key of [`portal:reset:${email}`, `portal:ip:${await ip()}`]) {
    const r = await limit(key, key.includes(":ip:") ? RULES.ip : RULES.reset);
    if (!r.ok) return done;
  }
  const t = await db.traveller.findUnique({ where: { email } });
  if (!t || !t.passwordHash || t.status !== "active" || t.expiresAt < new Date() || !(await portalOn())) return done;
  const token = randomToken();
  await db.travellerToken.create({ data: { travellerId: t.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
  await sendTemplate("portal-reset", t.email, { name: t.name.split(" ")[0] }, { buttonHref: `${env().PORTAL_URL.replace(/\/$/, "")}/set-password/?t=${token}`, replyTo: await officeEmail() });
  return done;
}

export async function portalSignOut() {
  await endPortalSession();
  redirect("/login/");
}

export async function saveTravellerDetails(bookingId: string, values: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  const t = await getTraveller();
  if (!t) return { ok: false, message: "Please sign in again." };
  const b = await ownBooking(t.id, bookingId);
  if (!b) return { ok: false, message: "Not found." };
  await db.booking.update({ where: { id: b.id }, data: { detailsEnc: writeDetails(cleanDetails(values)) } });
  return { ok: true, message: "Saved. Thank you!" };
}
