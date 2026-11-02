"use server";

import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { Denied, assertUser } from "@/lib/admin/guards";
import { getBrand, saveBrand } from "@/lib/server/receipt-brand";

const schema = z.object({
  signatory: z.string().trim().max(80),
  signatoryTitle: z.string().trim().max(80),
  vatMode: z.enum(["none", "included", "added"]),
  vatRate: z.coerce.number().min(0).max(30),
  receiptPrefix: z.string().trim().regex(/^[A-Z0-9-]{1,12}$/, "Prefixes use capital letters, numbers and hyphens (max 12)."),
  billPrefix: z.string().trim().regex(/^[A-Z0-9-]{1,12}$/, "Prefixes use capital letters, numbers and hyphens (max 12)."),
  footerNote: z.string().trim().max(400),
  bankDetails: z.string().trim().max(600),
});

export async function saveReceiptSettings(input: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("settings");
    const p = schema.safeParse(input);
    if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
    const brand = await getBrand();
    await saveBrand({ ...brand, ...p.data });
    await audit(user.id, "settings.receipts", "settings", null);
    return { ok: true, message: "Saved. New receipts and bills use these settings." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}
