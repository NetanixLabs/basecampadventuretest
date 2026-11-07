"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { cleanDetails, deleteFile, inviteForBooking, purgeTraveller, writeDetails } from "@/lib/server/portal";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { env } from "@/lib/admin/env";

type R = { ok: boolean; message: string };
const fail = (e: unknown): R => ({ ok: false, message: e instanceof Denied ? e.message : "Something went wrong. Please try again." });
const done = (id: string, message: string): R => {
  revalidatePath(`/admin/bookings/${id}`);
  return { ok: true, message };
};

/** Creates the traveller's account (paid bookings only) and emails the one-time link. */
export async function inviteTraveller(bookingId: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const r = await inviteForBooking(bookingId);
    if (r.ok) await audit(user.id, "portal.invite", "booking", bookingId);
    revalidatePath(`/admin/bookings/${bookingId}`);
    return r;
  } catch (e) {
    return fail(e);
  }
}

export async function setTravellerAccess(bookingId: string, action: "disable" | "enable" | "extend" | "close"): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const b = await db.booking.findUnique({ where: { id: bookingId }, include: { traveller: true } });
    const t = b?.traveller;
    if (!b || !t) return { ok: false, message: "No account for this booking." };
    if (action === "disable") {
      await db.traveller.update({ where: { id: t.id }, data: { status: "disabled" } });
      await db.travellerSession.updateMany({ where: { travellerId: t.id, revokedAt: null }, data: { revokedAt: new Date() } });
    } else if (action === "enable") {
      await db.traveller.update({ where: { id: t.id }, data: { status: t.passwordHash ? "active" : "invited" } });
    } else if (action === "extend") {
      await db.traveller.update({ where: { id: t.id }, data: { expiresAt: new Date(Math.max(t.expiresAt.getTime(), Date.now()) + 30 * 86_400_000) } });
    } else {
      await purgeTraveller(t.id);
    }
    await audit(user.id, `portal.${action}`, "booking", bookingId, t.email);
    return done(bookingId, { disable: "Account switched off.", enable: "Account switched on.", extend: "Account extended by 30 days.", close: "Account closed and the traveller's documents and details deleted." }[action]);
  } catch (e) {
    return fail(e);
  }
}

export async function saveDetailsByOffice(bookingId: string, values: Record<string, string>): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    await db.booking.update({ where: { id: bookingId }, data: { detailsEnc: writeDetails(cleanDetails(values)) } });
    await audit(user.id, "booking.details", "booking", bookingId);
    return done(bookingId, "Traveller details saved.");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBookingFile(bookingId: string, fileId: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const f = await db.travellerFile.findFirst({ where: { id: fileId, bookingId } });
    if (!f) return { ok: false, message: "File not found." };
    await deleteFile(f.id);
    await audit(user.id, "booking.file.delete", "booking", bookingId, f.name);
    return done(bookingId, "File deleted.");
  } catch (e) {
    return fail(e);
  }
}

/** The office answers a traveller; it appears on their trip page and they get an email. */

/** The office ticks a checklist item as received (by email or WhatsApp), or unticks it. */
export async function toggleDocDone(bookingId: string, key: string, on: boolean): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const { DOC_KEYS } = await import("@/lib/server/checklist");
    if (!DOC_KEYS.includes(key as (typeof DOC_KEYS)[number])) return { ok: false, message: "Unknown item." };
    const b = await db.booking.findUnique({ where: { id: bookingId }, select: { docsDone: true } });
    if (!b) return { ok: false, message: "Not found." };
    const docsDone = on ? [...new Set([...b.docsDone, key])] : b.docsDone.filter((k) => k !== key);
    await db.booking.update({ where: { id: bookingId }, data: { docsDone } });
    await audit(user.id, on ? "booking.doc-received" : "booking.doc-unticked", "booking", bookingId, key);
    return done(bookingId, on ? "Marked as received." : "Unticked.");
  } catch (e) {
    return fail(e);
  }
}

export async function officeAddMember(bookingId: string, input: { name: string; email: string }): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const { addGroupMember } = await import("@/lib/server/group");
    const r = await addGroupMember(bookingId, input, `${user.name} (office)`);
    if (r.ok) await audit(user.id, "portal.group-add", "booking", bookingId, input.email);
    revalidatePath(`/admin/bookings/${bookingId}`);
    return r;
  } catch (e) {
    return fail(e);
  }
}

export async function officeRemoveMember(bookingId: string, travellerId: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const { removeGroupMember } = await import("@/lib/server/group");
    await removeGroupMember(bookingId, travellerId);
    await audit(user.id, "portal.group-remove", "booking", bookingId, travellerId);
    return done(bookingId, "Removed from the trip page.");
  } catch (e) {
    return fail(e);
  }
}

/** The language receipts are printed in for this booking. */
export async function setBookingLang(bookingId: string, lang: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    if (!["en", "de", "fr", "es"].includes(lang)) return { ok: false, message: "Unknown language." };
    await db.booking.update({ where: { id: bookingId }, data: { lang } });
    await audit(user.id, "booking.lang", "booking", bookingId, lang);
    return done(bookingId, "Saved. New receipts use this language.");
  } catch (e) {
    return fail(e);
  }
}
