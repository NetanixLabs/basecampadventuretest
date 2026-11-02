"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { importCustomers, writeCustomerDetails } from "@/lib/server/customers";

type R = { ok: boolean; message: string; id?: string };
const fail = (e: unknown): R => ({ ok: false, message: e instanceof Denied ? e.message : "Something went wrong. Please try again." });

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  email: z.email("Check the email address"),
  phone: z.string().trim().max(40).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  notes: z.string().trim().max(5000).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional().default([]),
  details: z.record(z.string(), z.string()).optional().default({}),
});

export async function saveCustomer(id: string | null, input: unknown): Promise<R> {
  try {
    const { user } = await assertUser("customers");
    const p = schema.safeParse(input);
    if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
    const d = p.data;
    const data = { name: d.name, email: d.email.toLowerCase(), phone: d.phone || null, country: d.country || null, notes: d.notes || null, tags: [...new Set(d.tags)], detailsEnc: writeCustomerDetails(d.details) };
    const clash = await db.customer.findUnique({ where: { email: data.email } });
    if (clash && clash.id !== id) return { ok: false, message: "Another customer already has this email." };
    const c = id ? await db.customer.update({ where: { id }, data }) : await db.customer.create({ data: { ...data, source: "office" } });
    await audit(user.id, id ? "customer.update" : "customer.create", "customer", c.id, c.email);
    revalidatePath("/admin/customers");
    return { ok: true, message: "Saved.", id: c.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCustomer(id: string): Promise<R> {
  try {
    const { user } = await assertUser("customers");
    const c = await db.customer.delete({ where: { id } });
    await audit(user.id, "customer.delete", "customer", id, c.email);
    return { ok: true, message: "Customer record deleted. Bookings and receipts are kept for the accounts." };
  } catch (e) {
    return fail(e);
  }
}

export async function importCustomersAction(): Promise<R> {
  try {
    const { user } = await assertUser("customers");
    const n = await importCustomers();
    await audit(user.id, "customer.import", "customer", null, String(n));
    revalidatePath("/admin/customers");
    return { ok: true, message: `Done: ${n} bookings and enquiries matched to customers.` };
  } catch (e) {
    return fail(e);
  }
}
