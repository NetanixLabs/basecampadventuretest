import "server-only";
import { db } from "@/lib/admin/db";
import { decrypt, encrypt } from "@/lib/admin/crypto";

/**
 * Customers: everyone who booked or wrote to us, one record per email.
 * Filled automatically from bookings and enquiries; the office adds notes,
 * tags and private details (stored encrypted).
 */
export async function upsertCustomer(c: { email: string; name: string; phone?: string | null; country?: string | null; source?: string }) {
  const email = c.email.trim().toLowerCase();
  if (!email.includes("@")) return null;
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing) {
    return db.customer.update({
      where: { id: existing.id },
      data: { phone: existing.phone || c.phone || null, country: existing.country || c.country || null, name: existing.name || c.name },
    });
  }
  return db.customer.create({ data: { email, name: c.name.trim().slice(0, 120) || email, phone: c.phone || null, country: c.country || null, source: c.source ?? null } });
}

export type CustomerDetails = { address?: string; dateOfBirth?: string; nationality?: string; passportNumber?: string; passportExpiry?: string; diet?: string; medical?: string; emergencyContact?: string };
export const CUSTOMER_FIELDS: { key: keyof CustomerDetails; label: string; type?: string }[] = [
  { key: "address", label: "Home address" },
  { key: "nationality", label: "Nationality" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "passportNumber", label: "Passport number" },
  { key: "passportExpiry", label: "Passport valid until", type: "date" },
  { key: "emergencyContact", label: "Emergency contact" },
  { key: "diet", label: "Food needs or allergies" },
  { key: "medical", label: "Medical notes" },
];

export function readCustomerDetails(enc: string | null): CustomerDetails {
  if (!enc) return {};
  try {
    return JSON.parse(decrypt(enc)) as CustomerDetails;
  } catch {
    return {};
  }
}

export function writeCustomerDetails(input: Record<string, unknown>): string | null {
  const out: CustomerDetails = {};
  for (const f of CUSTOMER_FIELDS) {
    const v = String(input[f.key] ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 300);
    if (v) out[f.key] = v;
  }
  return Object.keys(out).length ? encrypt(JSON.stringify(out)) : null;
}

/** One-off: create customers from every existing booking and enquiry. */
export async function importCustomers() {
  let n = 0;
  const bookings = await db.booking.findMany({ select: { leadEmail: true, leadName: true, leadPhone: true, leadCountry: true }, orderBy: { createdAt: "asc" } });
  for (const b of bookings) if (await upsertCustomer({ email: b.leadEmail, name: b.leadName, phone: b.leadPhone, country: b.leadCountry, source: "booking" })) n++;
  const enquiries = await db.enquiry.findMany({ select: { email: true, name: true, phone: true, country: true }, orderBy: { createdAt: "asc" } });
  for (const e of enquiries) if (await upsertCustomer({ email: e.email, name: e.name, phone: e.phone, country: e.country, source: "enquiry" })) n++;
  return n;
}
