import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/admin/db";
import { decrypt, encrypt, hashToken, randomToken } from "@/lib/admin/crypto";
import { env } from "@/lib/admin/env";
import { features } from "@/lib/admin/features";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { getTrip } from "@/lib/content";
import { clientIpFrom } from "@/lib/ip";

/**
 * The traveller portal (my.basecampadventure.com).
 *
 * An account exists only for a booking with money received through WeTravel
 * (deposit or full), and only when the office creates it (or switches on
 * automatic invites). The traveller chooses their own password from a
 * one-time link; only its Argon2id hash is stored. Sessions are random
 * tokens stored as SHA-256. Details and documents are AES-256-GCM encrypted.
 * Everything is removed a set number of days after the trip.
 */
export const PORTAL_COOKIE = process.env.NODE_ENV === "production" ? "__Host-bca_portal" : "bca_portal";
const SESSION_DAYS = 7;
const IDLE_HOURS = 12;
export const PAID_STATUSES = ["deposit_paid", "paid", "confirmed"] as const;

const portalUrl = (p: string) => `${env().PORTAL_URL.replace(/\/$/, "")}${p}`;
const dayMs = 86_400_000;

export function tripEnd(b: { startDate: Date; tripSlug: string }) {
  const days = getTrip(b.tripSlug)?.days ?? 1;
  return new Date(b.startDate.getTime() + Math.max(1, days) * dayMs);
}

export function eligible(b: { status: string; paid: unknown }) {
  return (PAID_STATUSES as readonly string[]).includes(b.status) && Number(b.paid) > 0;
}

/** Create (or reuse) the traveller account for a booking and email a one-time link. */
export async function inviteForBooking(bookingId: string): Promise<{ ok: boolean; message: string }> {
  const f = (await features()).portal;
  if (!f.enabled) return { ok: false, message: "Traveller accounts are switched off in Settings → Features." };
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b) return { ok: false, message: "Booking not found." };
  if (!eligible(b)) return { ok: false, message: "An account can only be created after a deposit or full payment has been received." };
  const expiresAt = new Date(tripEnd(b).getTime() + f.expiryDays * dayMs);
  const email = b.leadEmail.toLowerCase();
  const existing = await db.traveller.findUnique({ where: { email } });
  const t = existing
    ? await db.traveller.update({ where: { id: existing.id }, data: { status: existing.passwordHash ? "active" : "invited", expiresAt: existing.expiresAt > expiresAt ? existing.expiresAt : expiresAt, name: b.leadName } })
    : await db.traveller.create({ data: { email, name: b.leadName, expiresAt } });
  await db.booking.update({ where: { id: b.id }, data: { travellerId: t.id } });
  const token = randomToken();
  await db.travellerToken.updateMany({ where: { travellerId: t.id, usedAt: null }, data: { usedAt: new Date() } });
  await db.travellerToken.create({ data: { travellerId: t.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + f.inviteHours * 3600_000) } });
  const r = await sendTemplate(
    "portal-invite",
    email,
    { name: b.leadName.split(" ")[0], trip: b.tripTitle, date: b.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), hours: f.inviteHours },
    { buttonHref: portalUrl(`/set-password/?t=${token}`), replyTo: await officeEmail() },
  );
  return r.ok ? { ok: true, message: `Invitation sent to ${email}.` } : { ok: false, message: `Account ready, but the email failed: ${r.error}` };
}

/** Called when a payment arrives: invites only if the office switched automatic invites on. */
export async function autoInvite(bookingId: string) {
  const f = (await features()).portal;
  if (!f.enabled || !f.autoInvite) return;
  const b = await db.booking.findUnique({ where: { id: bookingId }, select: { travellerId: true, status: true, paid: true } });
  if (!b || b.travellerId || !eligible(b)) return;
  await inviteForBooking(bookingId);
}

/** Checks a one-time link without using it. */
export async function checkToken(token: string) {
  if (!token || token.length > 100) return null;
  const row = await db.travellerToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { traveller: true } });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.traveller.status === "disabled" || row.traveller.expiresAt < new Date()) return null;
  return row;
}

export async function createPortalSession(travellerId: string) {
  const token = randomToken();
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * dayMs);
  await db.travellerSession.create({ data: { travellerId, tokenHash: hashToken(token), expiresAt, ipAddress: clientIpFrom(h), userAgent: h.get("user-agent")?.slice(0, 300) ?? null } });
  await db.traveller.update({ where: { id: travellerId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(PORTAL_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: expiresAt });
}

export const getTraveller = cache(async () => {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  const s = await db.travellerSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { traveller: true } });
  const now = Date.now();
  if (!s || s.revokedAt || s.expiresAt.getTime() <= now || now - s.lastSeenAt.getTime() > IDLE_HOURS * 3600_000 || s.traveller.status !== "active" || s.traveller.expiresAt.getTime() <= now) {
    if (s && !s.revokedAt) await db.travellerSession.update({ where: { id: s.id }, data: { revokedAt: new Date() } }).catch(() => undefined);
    return null;
  }
  if (now - s.lastSeenAt.getTime() > 60_000) await db.travellerSession.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
  return { ...s.traveller, sessionId: s.id };
});

export async function endPortalSession() {
  const jar = await cookies();
  const token = jar.get(PORTAL_COOKIE)?.value;
  if (token) await db.travellerSession.updateMany({ where: { tokenHash: hashToken(token) }, data: { revokedAt: new Date() } });
  jar.delete(PORTAL_COOKIE);
}

/**
 * A booking the signed-in traveller may open: their own (lead traveller), or
 * one they were added to as part of the group. Every portal read goes through this.
 */
export async function ownBooking(travellerId: string, bookingId: string) {
  const b = await db.booking.findFirst({ where: { id: bookingId, OR: [{ travellerId }, { access: { some: { travellerId } } }] } });
  return b && eligible(b) ? b : null;
}

/** Every trip the traveller can open, as lead or group member. */
export const visibleBookings = (travellerId: string) => ({ OR: [{ travellerId }, { access: { some: { travellerId } } }] });

/** The lead traveller sees payments and receipts and can invite the group. */
export const isLead = (travellerId: string, b: { travellerId: string | null }) => b.travellerId === travellerId;

/** This traveller's own details: the booking's for the lead, their own for a group member. */
export async function detailsFor(travellerId: string, b: { id: string; travellerId: string | null; detailsEnc: string | null }) {
  if (isLead(travellerId, b)) return readDetails(b.detailsEnc);
  const a = await db.bookingAccess.findUnique({ where: { bookingId_travellerId: { bookingId: b.id, travellerId } }, select: { detailsEnc: true } });
  return readDetails(a?.detailsEnc ?? null);
}

// ---- Traveller details (passport, flights, emergency contact) ----

export type TravellerDetails = {
  passportName?: string; passportNumber?: string; nationality?: string; passportExpiry?: string; dateOfBirth?: string;
  arrivalFlight?: string; arrivalTime?: string; departureFlight?: string; departureTime?: string; hotel?: string;
  insuranceCompany?: string; insurancePolicy?: string; insurancePhone?: string;
  emergencyName?: string; emergencyPhone?: string; emergencyRelation?: string;
  diet?: string; medical?: string; notes?: string;
};
export const DETAIL_FIELDS: { key: keyof TravellerDetails; label: string; group: string; type?: string }[] = [
  { key: "passportName", label: "Full name as in passport", group: "Passport" },
  { key: "passportNumber", label: "Passport number", group: "Passport" },
  { key: "nationality", label: "Nationality", group: "Passport" },
  { key: "dateOfBirth", label: "Date of birth", group: "Passport", type: "date" },
  { key: "passportExpiry", label: "Passport valid until", group: "Passport", type: "date" },
  { key: "arrivalFlight", label: "Arrival flight", group: "Flights" },
  { key: "arrivalTime", label: "Arrival date and time", group: "Flights", type: "datetime-local" },
  { key: "departureFlight", label: "Departure flight", group: "Flights" },
  { key: "departureTime", label: "Departure date and time", group: "Flights", type: "datetime-local" },
  { key: "hotel", label: "Hotel in Kathmandu (if booked yourself)", group: "Flights" },
  { key: "insuranceCompany", label: "Insurance company", group: "Insurance" },
  { key: "insurancePolicy", label: "Policy number", group: "Insurance" },
  { key: "insurancePhone", label: "Emergency phone of the insurer", group: "Insurance" },
  { key: "emergencyName", label: "Emergency contact name", group: "Emergency contact" },
  { key: "emergencyRelation", label: "Relationship", group: "Emergency contact" },
  { key: "emergencyPhone", label: "Emergency contact phone", group: "Emergency contact" },
  { key: "diet", label: "Food needs or allergies", group: "Health" },
  { key: "medical", label: "Medical conditions we should know about", group: "Health" },
  { key: "notes", label: "Anything else", group: "Health" },
];

export function readDetails(enc: string | null): TravellerDetails {
  if (!enc) return {};
  try {
    return JSON.parse(decrypt(enc)) as TravellerDetails;
  } catch {
    return {};
  }
}

export function cleanDetails(input: Record<string, unknown>): TravellerDetails {
  const out: TravellerDetails = {};
  for (const f of DETAIL_FIELDS) {
    const v = String(input[f.key] ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, f.key === "medical" || f.key === "notes" ? 1000 : 200);
    if (v) out[f.key] = v;
  }
  return out;
}

export const writeDetails = (d: TravellerDetails) => (Object.keys(d).length ? encrypt(JSON.stringify(d)) : null);

// ---- Documents, stored encrypted outside the website folder ----

export const FILE_KINDS = { passport: "Passport", insurance: "Insurance", flight: "Flight ticket", photo: "Passport photo", voucher: "Voucher", invoice: "Invoice", permit: "Permit", itinerary: "Itinerary", other: "Other" } as const;
export const TRAVELLER_KINDS = ["passport", "insurance", "flight", "photo", "other"] as const;
export const MAX_FILE = 10 * 1024 * 1024;

const privateDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.PRIVATE_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".storage", "private"));
const privateFile = (k: string) => path.join(/*turbopackIgnore: true*/ privateDir(), k);

/** Detects the real type from the first bytes (never trusts the file name). */
export function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.subarray(4, 12).toString("latin1").match(/^ftyp(heic|heix|mif1|msf1)/)) return { mime: "image/heic", ext: "heic" };
  return null;
}

function key() {
  return Buffer.from(env().ENCRYPTION_KEY, "base64");
}

/** Encrypts any bytes into the private folder and returns their random key. */
export async function writePrivate(buf: Buffer): Promise<string> {
  const storageKey = randomBytes(24).toString("hex");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  await mkdir(path.join(/*turbopackIgnore: true*/ privateDir()), { recursive: true, mode: 0o700 });
  await writeFile(privateFile(storageKey), Buffer.concat([iv, c.getAuthTag(), enc]), { mode: 0o600 });
  return storageKey;
}

export async function removePrivate(storageKey: string) {
  if (/^[0-9a-f]{48}$/.test(storageKey)) await rm(privateFile(storageKey), { force: true });
}

export async function storeFile(bookingId: string, kind: string, name: string, buf: Buffer, uploadedBy: string) {
  const type = sniff(buf);
  if (!type) throw new Error("Only PDF, JPG, PNG, WEBP or HEIC files.");
  if (buf.length > MAX_FILE) throw new Error("Files can be up to 10 MB.");
  const storageKey = await writePrivate(buf);
  const safeName = (name.replace(/[^\w .()-]/g, "_").replace(/\.[^.]*$/, "").slice(0, 80) || FILE_KINDS[kind as keyof typeof FILE_KINDS] || "document") + `.${type.ext}`;
  return db.travellerFile.create({ data: { bookingId, kind: kind in FILE_KINDS ? kind : "other", name: safeName, mime: type.mime, bytes: buf.length, storageKey, uploadedBy } });
}

export async function readFileData(storageKey: string): Promise<Buffer> {
  if (!/^[0-9a-f]{48}$/.test(storageKey)) throw new Error("bad key");
  const raw = await readFile(privateFile(storageKey));
  const d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]);
}

export async function deleteFile(id: string) {
  const f = await db.travellerFile.delete({ where: { id } });
  await removePrivate(f.storageKey);
}

/** Removes everything personal for one traveller: files, details, sessions. */
export async function purgeTraveller(travellerId: string) {
  const bookings = await db.booking.findMany({ where: { travellerId }, select: { id: true } });
  const files = await db.travellerFile.findMany({ where: { bookingId: { in: bookings.map((b) => b.id) } }, select: { id: true } });
  for (const f of files) await deleteFile(f.id).catch(() => undefined);
  // Messages and their encrypted attachments go too.
  const ids = bookings.map((b) => b.id);
  const att = await db.portalMessage.findMany({ where: { bookingId: { in: ids }, fileKey: { not: null } }, select: { fileKey: true } });
  for (const a of att) if (a.fileKey) await removePrivate(a.fileKey).catch(() => undefined);
  await db.portalMessage.deleteMany({ where: { bookingId: { in: ids } } });
  await db.booking.updateMany({ where: { travellerId }, data: { detailsEnc: null } });
  await db.bookingAccess.updateMany({ where: { OR: [{ travellerId }, { bookingId: { in: ids } }] }, data: { detailsEnc: null } });
  await db.packingList.deleteMany({ where: { travellerId } });
  await db.pushSubscription.deleteMany({ where: { travellerId } });
  await db.notification.deleteMany({ where: { travellerId } });
  await db.travellerSession.updateMany({ where: { travellerId, revokedAt: null }, data: { revokedAt: new Date() } });
  await db.travellerToken.deleteMany({ where: { travellerId } });
  await db.traveller.update({ where: { id: travellerId }, data: { status: "expired", passwordHash: null } });
}
