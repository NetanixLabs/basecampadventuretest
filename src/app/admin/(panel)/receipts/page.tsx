import Link from "next/link";
import { Badge, ButtonLink, Empty, PageHeader, Table, day } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";

export const metadata = { title: "Receipts & bills" };

const fmt = (n: number, c: string) => `${c} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  await requireUser("receipts");
  const { q = "", kind = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const rows = await db.receipt.findMany({
    where: {
      ...(kind === "receipt" || kind === "bill" ? { kind } : {}),
      ...(term ? { OR: [{ number: { contains: term, mode: "insensitive" } }, { customerName: { contains: term, mode: "insensitive" } }, { customerEmail: { contains: term, mode: "insensitive" } }] } : {}),
    },
    orderBy: { issuedAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Receipts & bills" description="Every payment gets a receipt automatically. Create bills and manual receipts here." actions={<ButtonLink href="/receipts/new">New receipt or bill</ButtonLink>} info="Receipts are numbered automatically and signed: the QR code on each PDF opens a page that confirms it is genuine, so a changed or fake receipt is easy to spot. Cancel a receipt instead of deleting it; the number stays in the books. Signature, stamp and VAT are set in Settings → Receipts & signature." />
      <form className="mb-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search number, name or email" className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm" aria-label="Search" />
        <select name="kind" defaultValue={kind} className="rounded-full border border-line bg-card px-3 py-2 text-sm" aria-label="Type"><option value="">All</option><option value="receipt">Receipts</option><option value="bill">Bills</option></select>
        <button className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      {rows.length ? (
        <Table head={["Number", "Customer", "Date", "Amount", "Status"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/receipts/${r.id}`} className="font-mono font-semibold text-pine hover:underline">{r.number}</Link><p className="text-xs text-muted capitalize">{r.kind}</p></td>
              <td><p className="font-semibold">{r.customerName}</p><p className="text-xs text-muted">{r.customerEmail}</p></td>
              <td>{day(r.issuedAt)}</td>
              <td className="font-semibold">{fmt(Number(r.total), r.currency)}</td>
              <td>{r.voidedAt ? <Badge tone="red">Cancelled</Badge> : r.kind === "bill" ? <Badge tone="amber">Bill</Badge> : <Badge tone="green">Paid</Badge>}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty title={term ? "Nothing found" : "No receipts yet"}>Receipts appear here automatically when payments arrive.</Empty>
      )}
    </>
  );
}
