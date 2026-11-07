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
import { checkToken, cleanDetails, createPortalSession, endPortalSession, getTraveller, isLead, ownBooking, writeDetails } from "@/lib/server/portal";

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
  const detailsEnc = writeDetails(cleanDetails(values));
  if (isLead(t.id, b)) await db.booking.update({ where: { id: b.id }, data: { detailsEnc } });
  else await db.bookingAccess.update({ where: { bookingId_travellerId: { bookingId: b.id, travellerId: t.id } }, data: { detailsEnc } });
  return { ok: true, message: "Saved. Thank you!" };
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

// ---- Packing checklist, group, notifications ----

export async function savePacking(bookingId: string, packed: string[], extra: { name: string; packed: boolean }[]): Promise<{ ok: boolean }> {
  const t = await getTraveller();
  if (!t) return { ok: false };
  const b = await ownBooking(t.id, bookingId);
  if (!b) return { ok: false };
  const r = await limit(`portal:packing:${t.id}`, { limit: 300, windowMs: 3600_000, blockMs: 600_000 });
  if (!r.ok) return { ok: false };
  const { cleanExtra, packingItems } = await import("@/lib/server/checklist");
  const names = new Set(packingItems(b.tripSlug).map((i) => i.name));
  const clean = [...new Set((Array.isArray(packed) ? packed : []).map(String).filter((n) => names.has(n)))];
  const data = { packed: clean, extra: cleanExtra(extra) };
  await db.packingList.upsert({ where: { bookingId_travellerId: { bookingId: b.id, travellerId: t.id } }, create: { bookingId: b.id, travellerId: t.id, ...data }, update: data });
  return { ok: true };
}

export async function inviteToGroup(bookingId: string, input: { name: string; email: string }): Promise<{ ok: boolean; message: string }> {
  const t = await getTraveller();
  if (!t) return { ok: false, message: "Please sign in again." };
  const b = await ownBooking(t.id, bookingId);
  if (!b || !isLead(t.id, b)) return { ok: false, message: "Only the lead traveller can add people." };
  const r = await limit(`portal:group:${t.id}`, { limit: 15, windowMs: 3600_000, blockMs: 3600_000 });
  if (!r.ok) return { ok: false, message: "Too many invitations. Try again later." };
  const { addGroupMember } = await import("@/lib/server/group");
  return addGroupMember(b.id, { name: String(input.name ?? ""), email: String(input.email ?? "") }, t.name);
}

export async function removeFromGroup(bookingId: string, travellerId: string): Promise<{ ok: boolean; message: string }> {
  const t = await getTraveller();
  if (!t) return { ok: false, message: "Please sign in again." };
  const b = await ownBooking(t.id, bookingId);
  if (!b || !isLead(t.id, b)) return { ok: false, message: "Only the lead traveller can remove people." };
  const { removeGroupMember } = await import("@/lib/server/group");
  await removeGroupMember(b.id, String(travellerId));
  return { ok: true, message: "Removed." };
}

export async function readNotices(): Promise<void> {
  const t = await getTraveller();
  if (!t) return;
  await db.notification.updateMany({ where: { travellerId: t.id, readAt: null }, data: { readAt: new Date() } });
}

export async function savePush(sub: { endpoint: string; keys?: { p256dh?: string; auth?: string } } | null, remove = false): Promise<{ ok: boolean; message: string }> {
  const t = await getTraveller();
  if (!t) return { ok: false, message: "Please sign in again." };
  if (!(await features()).push.enabled) return { ok: false, message: "Notifications are switched off." };
  const endpoint = String(sub?.endpoint ?? "");
  const { validEndpoint } = await import("@/lib/server/push");
  if (remove) {
    await db.pushSubscription.deleteMany({ where: { travellerId: t.id, endpoint } });
    return { ok: true, message: "Notifications are off on this device." };
  }
  const p256dh = String(sub?.keys?.p256dh ?? "");
  const auth = String(sub?.keys?.auth ?? "");
  if (!validEndpoint(endpoint) || !/^[A-Za-z0-9_-]{40,200}$/.test(p256dh) || !/^[A-Za-z0-9_-]{10,60}$/.test(auth)) return { ok: false, message: "This browser can't receive notifications." };
  if ((await db.pushSubscription.count({ where: { travellerId: t.id } })) >= 10) await db.pushSubscription.deleteMany({ where: { travellerId: t.id, createdAt: { lt: new Date(Date.now() - 60_000) } } });
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await db.pushSubscription.upsert({ where: { endpoint }, create: { travellerId: t.id, endpoint, p256dh, auth, userAgent: ua }, update: { travellerId: t.id, p256dh, auth, userAgent: ua } });
  return { ok: true, message: "Notifications are on. We'll let you know when there's news." };
}
