import "server-only";
import { db } from "@/lib/admin/db";
import { hashToken, randomToken } from "@/lib/admin/crypto";
import { env } from "@/lib/admin/env";
import { features } from "@/lib/admin/features";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { eligible, tripEnd } from "@/lib/server/portal";
import { notifyBooking } from "@/lib/server/push";

/**
 * Group bookings: everyone travelling gets their own sign-in to the same
 * trip page (documents, details, packing list, messages, photos). Money
 * (payments and receipts) stays with the lead traveller. At most one account
 * per traveller on the booking (pax − 1 besides the lead).
 */
const dayMs = 86_400_000;

export async function groupOf(bookingId: string) {
  return db.bookingAccess.findMany({ where: { bookingId }, orderBy: { createdAt: "asc" }, include: { traveller: { select: { id: true, name: true, email: true, status: true, lastLoginAt: true } } } });
}

export async function addGroupMember(bookingId: string, input: { name: string; email: string }, invitedBy: string): Promise<{ ok: boolean; message: string }> {
  const f = (await features()).portal;
  if (!f.enabled) return { ok: false, message: "Trip pages are switched off." };
  const name = input.name.replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 120);
  const email = input.email.trim().toLowerCase().slice(0, 200);
  if (name.length < 2) return { ok: false, message: "Please enter their name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, message: "That email address doesn't look right." };
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { access: true, traveller: { select: { email: true } } } });
  if (!b || !eligible(b)) return { ok: false, message: "This booking can't have trip pages yet." };
  if (email === b.leadEmail.toLowerCase() || email === b.traveller?.email) return { ok: false, message: "That is the lead traveller's email." };
  if (b.access.length >= Math.max(0, b.pax - 1)) return { ok: false, message: `All ${b.pax} travellers on this booking already have access.` };

  const expiresAt = new Date(tripEnd(b).getTime() + f.expiryDays * dayMs);
  const existing = await db.traveller.findUnique({ where: { email } });
  if (existing && b.access.some((a) => a.travellerId === existing.id)) return { ok: false, message: `${email} already has access.` };
  const t = existing
    ? await db.traveller.update({ where: { id: existing.id }, data: { status: existing.passwordHash ? "active" : "invited", expiresAt: existing.expiresAt > expiresAt ? existing.expiresAt : expiresAt } })
    : await db.traveller.create({ data: { email, name, expiresAt } });
  await db.bookingAccess.create({ data: { bookingId: b.id, travellerId: t.id, invitedBy: invitedBy.slice(0, 120) } });

  // An existing account just sees the trip next time; a new one chooses a password.
  let button = `${env().PORTAL_URL.replace(/\/$/, "")}/login/`;
  if (!t.passwordHash) {
    const token = randomToken();
    await db.travellerToken.updateMany({ where: { travellerId: t.id, usedAt: null }, data: { usedAt: new Date() } });
    await db.travellerToken.create({ data: { travellerId: t.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + f.inviteHours * 3600_000) } });
    button = `${env().PORTAL_URL.replace(/\/$/, "")}/set-password/?t=${token}`;
  }
  const r = await sendTemplate(
    "portal-group-invite",
    email,
    { name: name.split(" ")[0], lead: b.leadName, trip: b.tripTitle, date: b.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), hours: f.inviteHours },
    { buttonHref: button, replyTo: await officeEmail() },
  );
  await notifyBooking(b.id, { kind: "group", title: "Group", body: `${name} has joined the trip page.` }, b.travellerId ? [b.travellerId] : []);
  return r.ok ? { ok: true, message: `Invitation sent to ${email}.` } : { ok: true, message: `Access added, but the email failed: ${r.error}` };
}

export async function removeGroupMember(bookingId: string, travellerId: string) {
  await db.bookingAccess.deleteMany({ where: { bookingId, travellerId } });
  await db.packingList.deleteMany({ where: { bookingId, travellerId } });
  await db.notification.deleteMany({ where: { bookingId, travellerId } });
  // No other trips: sign them out.
  const other = await db.booking.count({ where: { OR: [{ travellerId }, { access: { some: { travellerId } } }] } });
  if (!other) await db.travellerSession.updateMany({ where: { travellerId, revokedAt: null }, data: { revokedAt: new Date() } });
}
