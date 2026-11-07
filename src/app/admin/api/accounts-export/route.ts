import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { xlsx, type Cell } from "@/lib/server/xlsx";

export const dynamic = "force-dynamic";

/** Kathmandu is UTC+5:45: a month runs from the 1st 00:00 there. */
const KTM = (5 * 60 + 45) * 60_000;
const ktmDay = (d: Date) => new Date(d.getTime() + KTM);

/**
 * The monthly file for the accountant: every receipt, credit note and bill
 * of the month with VAT, every payment received or refunded, and a summary
 * per currency. One Excel file, one sheet each.
 */
export async function GET(req: Request) {
  try {
    const { user } = await assertUser("receipts");
    const month = new URL(req.url).searchParams.get("month") ?? "";
    if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: "Choose a month." }, { status: 400 });
    const [y, m] = month.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1) - KTM);
    const to = new Date(Date.UTC(y, m, 1) - KTM);
    const [docs, payments] = await Promise.all([
      db.receipt.findMany({ where: { issuedAt: { gte: from, lt: to } }, orderBy: { number: "asc" }, include: { booking: { select: { reference: true } } } }),
      db.payment.findMany({ where: { createdAt: { gte: from, lt: to }, status: { in: ["succeeded", "refunded"] } }, orderBy: { createdAt: "asc" }, include: { booking: { select: { reference: true, leadName: true, tripTitle: true } } } }),
    ]);
    const originals = new Map((await db.receipt.findMany({ where: { id: { in: docs.map((d) => d.creditForId).filter(Boolean) as string[] } }, select: { id: true, number: true } })).map((r) => [r.id, r.number]));
    const money = (n: unknown) => ({ v: Number(n), money: true as const });
    const desc = (items: unknown) => (Array.isArray(items) ? items.map((i: { description?: string }) => i.description).filter(Boolean).join("; ") : "");
    const status = (d: (typeof docs)[number]) => (d.voidedAt ? `Cancelled: ${d.voidReason ?? ""}` : "Valid");

    const receipts = docs.filter((d) => d.kind === "receipt");
    const credits = docs.filter((d) => d.kind === "credit");
    const bills = docs.filter((d) => d.kind === "bill");

    // Summary per currency (cancelled documents left out of the totals).
    const currencies = [...new Set(docs.map((d) => d.currency))].sort();
    const sum = (list: typeof docs, cur: string, k: "subtotal" | "vat" | "total") => list.filter((d) => d.currency === cur && !d.voidedAt).reduce((s, d) => s + Math.round(Number(d[k]) * 100), 0) / 100;
    const summary: Cell[][] = [];
    for (const cur of currencies) {
      summary.push([{ v: cur, bold: true }]);
      summary.push(["Receipts (money received)", receipts.filter((d) => d.currency === cur && !d.voidedAt).length, money(sum(receipts, cur, "subtotal")), money(sum(receipts, cur, "vat")), money(sum(receipts, cur, "total"))]);
      summary.push(["Credit notes (refunds)", credits.filter((d) => d.currency === cur && !d.voidedAt).length, money(-sum(credits, cur, "subtotal")), money(-sum(credits, cur, "vat")), money(-sum(credits, cur, "total"))]);
      summary.push([{ v: "Net for the month", bold: true }, null, money(sum(receipts, cur, "subtotal") - sum(credits, cur, "subtotal")), money(sum(receipts, cur, "vat") - sum(credits, cur, "vat")), money(sum(receipts, cur, "total") - sum(credits, cur, "total"))]);
      summary.push(["Bills issued (not money received)", bills.filter((d) => d.currency === cur && !d.voidedAt).length, null, null, money(sum(bills, cur, "total"))]);
      summary.push([]);
    }
    summary.push(["Cancelled documents", docs.filter((d) => d.voidedAt).length]);
    summary.push([]);
    summary.push([`Month: ${month} (Kathmandu time). Made ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by ${user.name}.`]);
    if (!docs.length) summary.unshift(["No receipts, bills or credit notes this month."]);

    const file = xlsx([
      { name: "Summary", columns: [{ title: "", width: 36 }, { title: "Count", width: 9 }, { title: "Net", width: 14 }, { title: "VAT", width: 12 }, { title: "Total", width: 14 }], rows: summary },
      {
        name: "Receipts",
        columns: [{ title: "Number", width: 18 }, { title: "Date", width: 13 }, { title: "Customer", width: 24 }, { title: "Email", width: 26 }, { title: "Booking", width: 16 }, { title: "Description", width: 50 }, { title: "Paid via", width: 22 }, { title: "Currency", width: 9 }, { title: "Net", width: 12 }, { title: "VAT %", width: 7 }, { title: "VAT", width: 11 }, { title: "Total", width: 12 }, { title: "Status", width: 22 }],
        rows: receipts.map((d) => [d.number, ktmDay(d.issuedAt), d.customerName, d.customerEmail, d.booking?.reference, desc(d.items), d.paidVia, d.currency, money(d.subtotal), Number(d.vatRate), money(d.vat), money(d.total), status(d)]),
      },
      {
        name: "Credit notes",
        columns: [{ title: "Number", width: 18 }, { title: "Date", width: 13 }, { title: "Refund of receipt", width: 18 }, { title: "Customer", width: 24 }, { title: "Reason", width: 40 }, { title: "Refunded via", width: 22 }, { title: "Currency", width: 9 }, { title: "Net", width: 12 }, { title: "VAT", width: 11 }, { title: "Total", width: 12 }, { title: "Status", width: 22 }],
        rows: credits.map((d) => [d.number, ktmDay(d.issuedAt), d.creditForId ? originals.get(d.creditForId) : "", d.customerName, d.notes ?? desc(d.items).replace(/^[^:]*: /, ""), d.paidVia, d.currency, money(-Number(d.subtotal)), money(-Number(d.vat)), money(-Number(d.total)), status(d)]),
      },
      {
        name: "Bills",
        columns: [{ title: "Number", width: 18 }, { title: "Date", width: 13 }, { title: "Customer", width: 24 }, { title: "Booking", width: 16 }, { title: "Description", width: 50 }, { title: "Currency", width: 9 }, { title: "Total", width: 12 }, { title: "Status", width: 22 }],
        rows: bills.map((d) => [d.number, ktmDay(d.issuedAt), d.customerName, d.booking?.reference, desc(d.items), d.currency, money(d.total), status(d)]),
      },
      {
        name: "Payments",
        columns: [{ title: "Date", width: 13 }, { title: "Booking", width: 16 }, { title: "Traveller", width: 24 }, { title: "Trip", width: 36 }, { title: "Through", width: 16 }, { title: "Currency", width: 9 }, { title: "Amount", width: 12 }, { title: "Status", width: 12 }, { title: "Transaction", width: 30 }],
        rows: payments.map((p) => [ktmDay(p.createdAt), p.booking?.reference, p.booking?.leadName, p.booking?.tripTitle, p.provider === "hbl" ? "Himalayan Bank" : p.provider === "manual" ? "Office" : p.provider === "refund" ? "Refund" : "WeTravel", p.currency, money(p.amount), p.status, p.providerId.replace(/^(hbl|refund):/, "")]),
      },
    ]);
    await audit(user.id, "receipts.export", "receipt", null, month);
    return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Base-Camp-Adventure-accounts-${month}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof Denied) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
