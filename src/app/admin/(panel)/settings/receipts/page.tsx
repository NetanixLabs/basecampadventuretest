import { PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/admin/guards";
import { getBrand } from "@/lib/server/receipt-brand";
import { ReceiptSettingsForm } from "./form";

export const metadata = { title: "Receipts & bills" };

export default async function ReceiptSettingsPage() {
  await requireUser("settings");
  const b = await getBrand();
  return (
    <>
      <PageHeader title="Receipts & bills" description="Signature, stamp, VAT and numbering." back={{ href: "/settings", label: "Settings" }} info="The company name, VAT/PAN, licence and membership numbers come from Settings → Company. The signature and stamp are stored encrypted and only ever placed inside receipt PDFs; they are never published on the website." />
      <ReceiptSettingsForm initial={{ signatory: b.signatory, signatoryTitle: b.signatoryTitle, vatMode: b.vatMode, vatRate: b.vatRate, receiptPrefix: b.receiptPrefix, billPrefix: b.billPrefix, footerNote: b.footerNote, bankDetails: b.bankDetails }} has={{ signature: Boolean(b.signatureKey), stamp: Boolean(b.stampKey) }} />
    </>
  );
}
