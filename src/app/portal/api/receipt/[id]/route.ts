import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { getTraveller } from "@/lib/server/portal";
import { pdfFor } from "@/lib/server/receipts";
import { receiptFileName } from "@/lib/server/receipt-pdf";

export const dynamic = "force-dynamic";

/** A traveller downloads a receipt or bill for one of their own bookings. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTraveller();
  if (!t) return new NextResponse("Not found", { status: 404 });
  const r = await db.receipt.findUnique({ where: { id: (await params).id }, include: { booking: { select: { travellerId: true } } } });
  if (!r || r.booking?.travellerId !== t.id || r.voidedAt) return new NextResponse("Not found", { status: 404 });
  const pdf = await pdfFor(r);
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${receiptFileName(r)}"`, "Cache-Control": "private, no-store" } });
}
