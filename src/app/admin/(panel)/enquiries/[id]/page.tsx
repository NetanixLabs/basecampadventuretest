import { notFound } from "next/navigation";
import { Card, PageHeader, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { EnquiryControls } from "./controls";

export const metadata = { title: "Enquiry" };

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("sales");
  const e = await db.enquiry.findUnique({ where: { id: (await params).id } });
  if (!e) notFound();
  const others = await db.enquiry.count({ where: { email: e.email, NOT: { id: e.id } } });
  const bookings = await db.booking.findMany({ where: { leadEmail: e.email }, select: { id: true, reference: true, tripTitle: true } });
  const data = e.data as Record<string, unknown>;
  const rows: [string, string][] = [
    ["Reference", e.reference], ["Form", e.kind], ["Email", e.email], ["Phone", e.phone ?? "—"], ["Country", e.country ?? "—"], ["Trip", e.trip ?? "—"],
    ...Object.entries(data).filter(([, v]) => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && !v.length)).map(([k, v]) => [k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), Array.isArray(v) ? v.join(", ") : String(v)] as [string, string]),
  ];
  const subject = encodeURIComponent(`Re: your enquiry ${e.reference}${e.trip ? ` · ${e.trip}` : ""}`);
  return (
    <>
      <PageHeader title={e.name} description={`Received ${when(e.createdAt)}`} back={{ href: "/enquiries", label: "Enquiries" }} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] [&>*]:min-w-0">
        <Card title="Message">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
            {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="whitespace-pre-wrap break-words">{v}</dd></div>)}
          </dl>
        </Card>
        <div className="space-y-6">
          <Card title="Reply">
            <div className="flex flex-col gap-2">
              <a href={`mailto:${e.email}?subject=${subject}`} className="rounded-full bg-pine px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-pine-deep">Reply by email</a>
              {e.phone ? <a href={`https://wa.me/${e.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Namaste ${e.name.split(" ")[0]}, this is Base Camp Adventure about your enquiry ${e.reference}.`)}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-4 py-2.5 text-center text-sm font-semibold text-white">Reply on WhatsApp</a> : null}
            </div>
            {others ? <p className="mt-3 text-xs text-muted">{others} other enquir{others === 1 ? "y" : "ies"} from this email.</p> : null}
            {bookings.length ? <p className="mt-1 text-xs text-muted">Booked: {bookings.map((b) => <a key={b.id} href={`/bookings/${b.id}`} className="font-semibold text-pine">{b.reference} </a>)}</p> : null}
          </Card>
          <EnquiryControls id={e.id} status={e.status} notes={e.notes ?? ""} />
        </div>
      </div>
    </>
  );
}
