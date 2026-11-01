import Link from "next/link";
import { Badge, Empty, PageHeader, Table, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import type { EnquiryStatus, Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Enquiries" };
const STATUSES: EnquiryStatus[] = ["new", "replied", "quoted", "won", "lost", "spam"];
const toneFor = (s: string) => (s === "new" ? "amber" : s === "won" ? "green" : s === "lost" || s === "spam" ? "gray" : "blue") as "amber" | "green" | "gray" | "blue";

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireUser("sales");
  const { status = "", q = "" } = await searchParams;
  const where: Prisma.EnquiryWhereInput = {
    ...(STATUSES.includes(status as EnquiryStatus) ? { status: status as EnquiryStatus } : { status: { not: "spam" } }),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { reference: { contains: q.toUpperCase() } }, { trip: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const rows = await db.enquiry.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Enquiries" description="Every message from the contact, tailor-made and trip request forms." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="min-w-56 flex-1">{status ? <input type="hidden" name="status" value={status} /> : null}<input name="q" defaultValue={q} placeholder="Search name, email, trip or reference…" className="w-full rounded-full border border-line bg-card px-4 py-2 text-sm focus:border-pine focus:outline-none" /></form>
        <nav className="flex flex-wrap gap-1 text-sm">
          {["", ...STATUSES].map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={`rounded-full px-3 py-1.5 font-medium capitalize ${status === s ? "bg-pine text-white" : "text-ink-soft hover:bg-pine/8"}`}>{s || "All"}</Link>)}
        </nav>
      </div>
      {rows.length ? (
        <Table head={["From", "About", "Received", "Status"]}>
          {rows.map((e) => (
            <tr key={e.id}>
              <td><Link href={`/enquiries/${e.id}`} className="font-semibold hover:text-pine">{e.name}</Link><p className="text-xs text-muted">{e.email}{e.country ? ` · ${e.country}` : ""}</p></td>
              <td className="max-w-xs"><p className="truncate">{e.trip || (e.kind === "custom-trip" ? "Tailor-made trip" : "General enquiry")}</p><p className="font-mono text-xs text-muted">{e.reference}</p></td>
              <td className="whitespace-nowrap text-ink-soft">{when(e.createdAt)}</td>
              <td><Badge tone={toneFor(e.status)}>{e.status}</Badge></td>
            </tr>
          ))}
        </Table>
      ) : <Empty title="No enquiries here.">Messages from the website's forms appear here, and the office is emailed for each one.</Empty>}
    </>
  );
}
