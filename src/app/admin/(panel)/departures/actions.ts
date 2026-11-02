"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { clashes, parseKey } from "@/lib/server/departures";

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
    revalidatePath(`/admin/departures/${key}`);
    return { ok: true, message: `${g.name} assigned.` };
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
