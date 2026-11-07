import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, day, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { creditedCents, isGenuine, verifyUrl, type ReceiptItem } from "@/lib/server/receipts";
import { KIND_NAME } from "@/lib/receipt-i18n";
import { ReceiptActions } from "./actions-ui";

export const metadata = { title: "Receipt" };
const fmt = (n: number, c: string) => `${c} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("receipts");
  const r = await db.receipt.findUnique({ where: { id: (await params).id }, include: { booking: { select: { id: true, reference: true } } } });
  if (!r) notFound();
  const genuine = isGenuine(r);
  const items = r.items as ReceiptItem[];
  const [credits, original] = await Promise.all([
    db.receipt.findMany({ where: { creditForId: r.id }, orderBy: { issuedAt: "asc" }, select: { id: true, number: true, total: true, voidedAt: true, issuedAt: true } }),
    r.creditForId ? db.receipt.findUnique({ where: { id: r.creditForId }, select: { id: true, number: true } }) : null,
  ]);
  const refundable = r.kind === "receipt" && !r.voidedAt ? (Math.round(Number(r.total) * 100) - (await creditedCents(r.id))) / 100 : 0;
  return (
    <>
      <PageHeader title={`${KIND_NAME[r.kind]} ${r.number}`} description={`Issued ${when(r.issuedAt)} by ${r.issuedByName ?? "the system"}`} back={{ href: "/receipts", label: "Receipts & bills" }} actions={r.voidedAt ? <Badge tone="red">Cancelled</Badge> : genuine ? <Badge tone="green">Signed</Badge> : <Badge tone="red">Signature mismatch</Badge>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        <Card title="Details">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
            <dt className="text-muted">{r.kind === "bill" ? "Billed to" : r.kind === "credit" ? "Refunded to" : "Received from"}</dt><dd>{r.customerName}{r.customerEmail ? ` · ${r.customerEmail}` : ""}</dd>
            {r.booking ? <><dt className="text-muted">Booking</dt><dd><Link href={`/bookings/${r.booking.id}`} className="font-semibold text-pine">{r.booking.reference}</Link></dd></> : null}
            {r.paidVia ? <><dt className="text-muted">Paid by</dt><dd>{r.paidVia}{r.paidAt ? ` on ${day(r.paidAt)}` : ""}</dd></> : null}
            {original ? <><dt className="text-muted">Refund of</dt><dd><Link href={`/receipts/${original.id}`} className="font-mono font-semibold text-pine">{original.number}</Link></dd></> : null}
            <dt className="text-muted">Language</dt><dd>{{ en: "English", de: "Deutsch", fr: "Français", es: "Español" }[r.lang] ?? r.lang}</dd>
            {credits.length ? <><dt className="text-muted">Refunds</dt><dd className="space-y-0.5">{credits.map((c) => <Link key={c.id} href={`/receipts/${c.id}`} className={`block font-mono text-pine ${c.voidedAt ? "line-through opacity-60" : ""}`}>{c.number} · {fmt(Number(c.total), r.currency)}</Link>)}</dd></> : null}
            <dt className="text-muted">Verification</dt><dd><a href={verifyUrl(r)} target="_blank" rel="noopener noreferrer" className="font-mono text-pine">Code {r.code} ↗</a></dd>
            {r.voidReason ? <><dt className="text-muted">Cancelled because</dt><dd>{r.voidReason}</dd></> : null}
          </dl>
          <table className="mt-5 w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Amount</th></tr></thead>
            <tbody>{items.map((i, k) => <tr key={k} className="border-b border-line/60"><td className="py-2">{i.description}</td><td className="py-2 text-right">{i.qty}</td><td className="py-2 text-right">{fmt(i.qty * i.unitPrice, r.currency)}</td></tr>)}</tbody>
          </table>
          <p className="mt-3 text-right text-sm">{r.vatMode !== "none" ? <>VAT {Number(r.vatRate)}%: {fmt(Number(r.vat), r.currency)} · </> : null}<strong className="text-base">Total {fmt(Number(r.total), r.currency)}</strong></p>
          {r.notes ? <p className="mt-3 text-sm text-muted">{r.notes}</p> : null}
        </Card>
        <ReceiptActions id={r.id} hasEmail={Boolean(r.customerEmail)} voided={Boolean(r.voidedAt)} refundable={refundable} currency={r.currency} linked={Boolean(r.bookingId)} paidVia={r.paidVia ?? ""} kindName={KIND_NAME[r.kind]} />
      </div>
    </>
  );
}
