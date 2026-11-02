import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { getBrand } from "@/lib/server/receipt-brand";
import { ReceiptForm } from "./form";

export const metadata = { title: "New receipt or bill" };

export default async function NewReceipt({ searchParams }: { searchParams: Promise<{ booking?: string; customer?: string; kind?: string }> }) {
  await requireUser("receipts");
  const { booking, customer, kind } = await searchParams;
  const b = booking ? await db.booking.findUnique({ where: { id: booking } }) : null;
  const c = !b && customer ? await db.customer.findUnique({ where: { id: customer } }) : null;
  const brand = await getBrand();
  const date = b ? b.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
  return (
    <>
      <PageHeader title="New receipt or bill" back={{ href: "/receipts", label: "Receipts & bills" }} info="A receipt confirms money you received (cash, bank transfer, card at the office). A bill asks for payment. Both are numbered, signed and checkable by QR code." />
      <ReceiptForm
        vat={{ mode: brand.vatMode, rate: brand.vatRate }}
        initial={{
          kind: kind === "bill" ? "bill" : "receipt",
          bookingId: b?.id ?? null,
          customerName: b?.leadName ?? c?.name ?? "",
          customerEmail: b?.leadEmail ?? c?.email ?? "",
          customerAddress: "",
          currency: "USD",
          paidVia: "Bank transfer",
          paidAt: new Date().toISOString().slice(0, 10),
          notes: b ? `Booking ${b.reference}` : "",
          items: b ? [{ description: `${b.tripTitle}, starting ${date}, ${b.pax} ${b.pax === 1 ? "traveller" : "travellers"}`, qty: 1, unitPrice: Math.max(0, Number(b.total) - Number(b.paid)) }] : [{ description: "", qty: 1, unitPrice: 0 }],
        }}
      />
    </>
  );
}
