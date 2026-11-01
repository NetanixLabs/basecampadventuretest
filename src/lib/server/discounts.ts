import "server-only";
import { db } from "@/lib/admin/db";
import { adminConfigured } from "@/lib/admin/env";

export type AppliedDiscount = { code: string; label: string; kind: "percent" | "fixed"; value: number; amount: number };

const round = (n: number) => Math.round(n * 100) / 100;

/** The saving a code gives on a subtotal. Always worked out on the server. */
export const discountAmount = (kind: string, value: number, subtotal: number) => round(kind === "percent" ? (subtotal * Math.min(100, value)) / 100 : Math.min(value, subtotal));

/**
 * Checks a discount code for a trip and group size. Returns the saving, or a
 * friendly reason it can't be used.
 */
export async function checkDiscount(raw: string, tripSlug: string, pax: number, subtotal: number): Promise<{ ok: true; discount: AppliedDiscount } | { ok: false; error: string }> {
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };
  if (!adminConfigured()) return { ok: false, error: "Discount codes can't be checked right now. Mention it in your notes and we'll apply it." };
  const d = await db.discountCode.findUnique({ where: { code } });
  const now = new Date();
  if (!d || !d.active) return { ok: false, error: "That code isn't valid." };
  if (d.startsAt && d.startsAt > now) return { ok: false, error: "That code isn't active yet." };
  if (d.endsAt && d.endsAt < now) return { ok: false, error: "That code has expired." };
  if (d.maxUses !== null && d.used >= d.maxUses) return { ok: false, error: "That code has been fully used." };
  if (d.trips.length && !d.trips.includes(tripSlug)) return { ok: false, error: "That code isn't valid for this trip." };
  if (pax < d.minPax) return { ok: false, error: `That code needs at least ${d.minPax} travellers.` };
  const value = Number(d.value);
  const kind = d.kind === "fixed" ? "fixed" : "percent";
  return { ok: true, discount: { code: d.code, label: d.label, kind, value, amount: discountAmount(kind, value, subtotal) } };
}
