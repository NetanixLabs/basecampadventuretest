import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/admin/db";

/** How receipts and bills look and are numbered (Admin → Settings → Receipts). */
export type ReceiptBrand = {
  signatureKey: string | null;
  stampKey: string | null;
  signatory: string;
  signatoryTitle: string;
  vatMode: "none" | "included" | "added";
  vatRate: number;
  receiptPrefix: string;
  billPrefix: string;
  footerNote: string;
  bankDetails: string;
};

export const BRAND_DEFAULTS: ReceiptBrand = {
  signatureKey: null,
  stampKey: null,
  signatory: "",
  signatoryTitle: "Managing Director",
  vatMode: "none",
  vatRate: 13,
  receiptPrefix: "BCA-R",
  billPrefix: "BCA-B",
  footerNote: "Thank you for travelling with Base Camp Adventure. This receipt is generated electronically and can be verified by scanning the QR code.",
  bankDetails: "",
};

export async function getBrand(): Promise<ReceiptBrand> {
  const row = await db.setting.findUnique({ where: { key: "receiptBrand" } });
  return { ...BRAND_DEFAULTS, ...((row?.value as Partial<ReceiptBrand>) ?? {}) };
}

export async function saveBrand(next: ReceiptBrand) {
  const value = next as unknown as Prisma.InputJsonValue;
  await db.setting.upsert({ where: { key: "receiptBrand" }, create: { key: "receiptBrand", value, public: false }, update: { value } });
}
