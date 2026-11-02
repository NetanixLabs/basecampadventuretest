"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";

type R = { ok: boolean; message: string };
const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100),
  role: z.enum(["guide", "leader", "porter", "driver", "cook", "other"]),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.union([z.email("Check the email"), z.literal("")]).optional().default(""),
  languages: z.string().trim().max(200).optional().default(""),
  licenceNo: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  active: z.boolean().default(true),
});

export async function saveGuide(id: string | null, input: unknown): Promise<R> {
  try {
    const { user } = await assertUser("operations");
    const p = schema.safeParse(input);
    if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
    const d = p.data;
    const data = { name: d.name, role: d.role, phone: d.phone || null, email: d.email || null, languages: d.languages.split(",").map((l) => l.trim()).filter(Boolean).slice(0, 12), licenceNo: d.licenceNo || null, notes: d.notes || null, active: d.active };
    const g = id ? await db.guide.update({ where: { id }, data }) : await db.guide.create({ data });
    await audit(user.id, id ? "guide.update" : "guide.create", "guide", g.id, g.name);
    revalidatePath("/admin/team-field");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}

export async function deleteGuide(id: string): Promise<R> {
  try {
    const { user } = await assertUser("operations");
    const g = await db.guide.delete({ where: { id } });
    await audit(user.id, "guide.delete", "guide", id, g.name);
    revalidatePath("/admin/team-field");
    return { ok: true, message: "Removed." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't remove." };
  }
}
