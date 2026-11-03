"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { clashes, depKey, notifyAssignment, parseKey } from "@/lib/server/departures";
import { getTrip } from "@/lib/content";

type R = { ok: boolean; message: string; clash?: string };
const ROLES = ["guide", "leader", "porter", "driver", "cook", "other"] as const;

async function departureFor(key: string) {
  const k = parseKey(key);
  if (!k) throw new Error("bad key");
  return db.departure.upsert({ where: { tripSlug_startDate: { tripSlug: k.slug, startDate: k.date } }, create: { tripSlug: k.slug, startDate: k.date }, update: {} });
}

export async function assignStaff(key: string, guideId: string, role: string, force = false): Promise<R> {
  try {
    const { user } = await assertUser("operations");
    if (!ROLES.includes(role as (typeof ROLES)[number])) return { ok: false, message: "Choose a role." };
    const g = await db.guide.findUnique({ where: { id: guideId } });
    if (!g) return { ok: false, message: "Choose someone from the team." };
    const d = await departureFor(key);
    const busy = await clashes(guideId, d.tripSlug, d.startDate, d.id);
    if (busy.length && !force) return { ok: false, clash: `${g.name} is already on ${busy.map((b) => `${b.tripSlug.replace(/-/g, " ")} from ${b.startDate.toISOString().slice(0, 10)}`).join(", ")}.`, message: "Double booking" };
    await db.departureStaff.upsert({ where: { departureId_guideId: { departureId: d.id, guideId } }, create: { departureId: d.id, guideId, role: role as (typeof ROLES)[number] }, update: { role: role as (typeof ROLES)[number] } });
    await audit(user.id, "departure.assign", "departure", d.id, `${g.name} as ${role}`);
    const told = await notifyAssignment(d.id, guideId).catch(() => "failed" as const);
    revalidatePath(`/admin/departures/${key}`);
    const note = told === "sent" ? ` ${g.name} has been emailed the departure list.` : told === "no-email" ? ` Add ${g.name}'s email in Guides & porters to send them the departure list.` : told === "failed" ? " The email to them could not be sent." : "";
    return { ok: true, message: `${g.name} assigned.${note}` };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't assign." };
  }
}

export async function removeStaff(key: string, guideId: string): Promise<R> {
  try {
    const { user } = await assertUser("operations");
    const d = await departureFor(key);
    await db.departureStaff.deleteMany({ where: { departureId: d.id, guideId } });
    await audit(user.id, "departure.unassign", "departure", d.id, guideId);
    revalidatePath(`/admin/departures/${key}`);
    return { ok: true, message: "Removed." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't remove." };
  }
}

export async function saveDepartureNotes(key: string, notes: string): Promise<R> {
  try {
    const { user } = await assertUser("operations");
    const d = await departureFor(key);
    await db.departure.update({ where: { id: d.id }, data: { notes: notes.slice(0, 5000) || null } });
    await audit(user.id, "departure.notes", "departure", d.id);
    return { ok: true, message: "Saved." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}

export async function saveDepartureSettings(key: string, v: { published: boolean; seats: number | null; guaranteed: boolean; pickupTime: string; pickupPlace: string }): Promise<R> {
  try {
    const { user } = await assertUser("operations");
    const d = await departureFor(key);
    const seats = v.seats == null || Number.isNaN(Number(v.seats)) || Number(v.seats) <= 0 ? null : Math.min(500, Math.round(Number(v.seats)));
    await db.departure.update({ where: { id: d.id }, data: { published: Boolean(v.published), seats, guaranteed: Boolean(v.guaranteed), pickupTime: String(v.pickupTime ?? "").trim().slice(0, 40) || null, pickupPlace: String(v.pickupPlace ?? "").trim().slice(0, 160) || null } });
    await audit(user.id, "departure.settings", "departure", d.id);
    revalidatePath("/departures");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}

/** Puts a new fixed departure on the website (trip + start date). */
export async function addFixedDeparture(v: { trip: string; date: string; seats: number | null; guaranteed: boolean }): Promise<R & { key?: string }> {
  try {
    const { user } = await assertUser("operations");
    const trip = getTrip(String(v.trip));
    if (!trip) return { ok: false, message: "Choose a trip." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v.date))) return { ok: false, message: "Choose a start date." };
    const date = new Date(`${v.date}T00:00:00Z`);
    if (date.getTime() < Date.now()) return { ok: false, message: "The date is in the past." };
    const seats = v.seats == null || Number(v.seats) <= 0 ? null : Math.min(500, Math.round(Number(v.seats)));
    const d = await db.departure.upsert({ where: { tripSlug_startDate: { tripSlug: trip.slug, startDate: date } }, create: { tripSlug: trip.slug, startDate: date, published: true, seats, guaranteed: Boolean(v.guaranteed) }, update: { published: true, seats, guaranteed: Boolean(v.guaranteed) } });
    await audit(user.id, "departure.add", "departure", d.id, `${trip.slug} ${v.date}`);
    revalidatePath("/departures");
    return { ok: true, message: "Added. It now shows on the trip's booking form.", key: depKey(trip.slug, date) };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't add." };
  }
}

/** Sends the assignment email again (for example after the travellers list changed). */
export async function resendAssignment(key: string, guideId: string): Promise<R> {
  try {
    await assertUser("operations");
    const d = await departureFor(key);
    const r = await notifyAssignment(d.id, guideId);
    revalidatePath(`/admin/departures/${key}`);
    return r === "sent" ? { ok: true, message: "Sent." } : { ok: false, message: r === "no-email" ? "No email address for this person." : r === "off" ? "Assignment emails are switched off in Settings, Features." : "Could not send." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Could not send." };
  }
}
