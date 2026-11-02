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

export async function sendPortalMessage(bookingId: string, body: string): Promise<{ ok: boolean; message: string }> {
  const t = await getTraveller();
  if (!t) return { ok: false, message: "Please sign in again." };
  const b = await ownBooking(t.id, bookingId);
  if (!b) return { ok: false, message: "Not found." };
  const text = body.replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, 2000);
  if (text.length < 2) return { ok: false, message: "Write a message first." };
  const r = await limit(`portal:msg:${t.id}`, { limit: 20, windowMs: 3600_000, blockMs: 3600_000 });
  if (!r.ok) return { ok: false, message: "That's a lot of messages; please wait a little or WhatsApp us." };
  await db.portalMessage.create({ data: { bookingId: b.id, fromOffice: false, authorName: t.name, body: text } });
  const admin = `${env().ADMIN_URL.replace(/\/$/, "")}/bookings/${b.id}`;
  await sendTemplate("portal-message-office", await officeEmail(), { name: t.name, reference: b.reference, trip: b.tripTitle }, { buttonHref: admin, details: [["Message", text.slice(0, 600)]], replyTo: t.email }).catch(() => undefined);
  return { ok: true, message: "Sent. We usually reply within a few hours." };
}

export async function writePortalReview(bookingId: string, input: { rating: number; title: string; body: string; consent: boolean; country: string }): Promise<{ ok: boolean; message: string }> {
  const t = await getTraveller();
  if (!t) return { ok: false, message: "Please sign in again." };
  const b = await ownBooking(t.id, bookingId);
  if (!b) return { ok: false, message: "Not found." };
  if (!(await features()).reviews.enabled) return { ok: false, message: "Reviews are not open right now." };
  const rating = Math.round(Number(input.rating));
  const body = String(input.body ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 4000);
  if (rating < 1 || rating > 5) return { ok: false, message: "Choose 1 to 5 stars." };
  if (body.length < 20) return { ok: false, message: "Please write a little more (at least 20 characters)." };
  if (!input.consent) return { ok: false, message: "Please tick the box so we may show your review." };
  if (await db.tripReview.findFirst({ where: { bookingId: b.id } })) return { ok: false, message: "You've already reviewed this trip. Thank you!" };
  await db.tripReview.create({ data: { bookingId: b.id, tripSlug: b.tripSlug, name: t.name.split(" ")[0], country: String(input.country ?? "").trim().slice(0, 60) || b.leadCountry, rating, title: String(input.title ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 120) || null, body, consent: true } });
  await db.booking.update({ where: { id: b.id }, data: { reviewTokenHash: null } });
  return { ok: true, message: "Dhanyabad! Your review is with our team and will appear on the trip page once approved." };
}
