import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { Denied, assertUser, can } from "@/lib/admin/guards";
import { isGenuine } from "@/lib/server/receipts";
import { receiptFileName, receiptPdf } from "@/lib/server/receipt-pdf";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/** The receipt or bill as a PDF, for the admin. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await assertUser();
    if (!can(user, "receipts") && !can(user, "sales")) throw new Denied("No access.");
    const r = await db.receipt.findUnique({ where: { id: (await params).id } });
    if (!r) return new NextResponse("Not found", { status: 404 });
    const pdf = await receiptPdf(r, `${site.url}/verify/${r.code}/`, isGenuine(r));
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${receiptFileName(r)}"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    return new NextResponse(e instanceof Denied ? "Forbidden" : "Not found", { status: e instanceof Denied ? 403 : 404 });
  }
}
