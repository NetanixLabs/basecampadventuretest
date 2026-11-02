"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";

type R = { ok: boolean; message: string };
const schema = z.object({
  name: z.string().trim().min(2, "Enter the contact name").max(100),
  company: z.string().trim().max(120).optional().default(""),
  email: z.union([z.email("Check the email"), z.literal("")]).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, "Codes use 3–20 letters, numbers or hyphens."),
  commissionPct: z.coerce.number().min(0).max(50),
  notes: z.string().trim().max(2000).optional().default(""),
  active: z.boolean().default(true),
});

export async function saveAgent(id: string | null, input: unknown): Promise<R> {
  try {
    const { user } = await assertUser("operations");
    const p = schema.safeParse(input);
    if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
    const d = p.data;
    const clash = await db.agent.findUnique({ where: { code: d.code } });
    if (clash && clash.id !== id) return { ok: false, message: "Another agent already uses this code." };
    const data = { ...d, company: d.company || null, email: d.email || null, phone: d.phone || null, country: d.country || null, notes: d.notes || null };
    const a = id ? await db.agent.update({ where: { id }, data }) : await db.agent.create({ data });
    await audit(user.id, id ? "agent.update" : "agent.create", "agent", a.id, a.code);
    revalidatePath("/admin/agents");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}

/** Link a booking to an agent (or remove the link). */
export async function setBookingAgent(bookingId: string, agentId: string | null): Promise<R> {
  try {
    const { user } = await assertUser("operations");
    if (agentId && !(await db.agent.findUnique({ where: { id: agentId } }))) return { ok: false, message: "Agent not found." };
    await db.booking.update({ where: { id: bookingId }, data: { agentId } });
    await audit(user.id, "booking.agent", "booking", bookingId, agentId ?? "none");
    return { ok: true, message: agentId ? "Agent linked." : "Agent removed." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}
