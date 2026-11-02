import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, day, money, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { can, requireUser } from "@/lib/admin/guards";
import { AgentSelect } from "./agent-select";
import { BookingMessages } from "./messages";
import { site } from "@/lib/site";
import { BookingControls } from "./controls";
import { PortalCard } from "./portal-card";
import { MissingReceipts } from "./missing-receipts";
import Link from "next/link";
import { features } from "@/lib/admin/features";
import { DETAIL_FIELDS, FILE_KINDS, eligible, readDetails } from "@/lib/server/portal";

export const metadata = { title: "Booking" };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser("sales");
  const b = await db.booking.findUnique({ where: { id: (await params).id }, include: { payments: { orderBy: { createdAt: "desc" } }, traveller: true, files: { orderBy: { createdAt: "desc" } }, receipts: { orderBy: { issuedAt: "desc" } }, messages: { orderBy: { createdAt: "asc" } } } });
  if (!b) notFound();
  const events = await db.$queryRaw<{ id: string; type: string; payload: unknown; error: string | null; createdAt: Date }[]>`
    SELECT id, type, payload, error, "createdAt" FROM "WebhookEvent"
    WHERE payload::text LIKE ${"%" + b.reference + "%"} OR payload::text LIKE ${"%" + (b.wetravelId ?? b.reference) + "%"}
    ORDER BY "createdAt" DESC LIMIT 10`.catch(() => []);
  const balance = Math.max(0, Number(b.total) - Number(b.paid));
  const f = await features();
  const agents = can(user, "operations") ? await db.agent.findMany({ where: { OR: [{ active: true }, { id: b.agentId ?? "" }] }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true, code: true } }) : null;
  const rows: [string, React.ReactNode][] = [
    ["Reference", <span key="r" className="font-mono">{b.reference}</span>],
    ["Trip", <a key="t" className="font-semibold text-pine" href={`${site.url}/trip/${b.tripSlug}/`} target="_blank" rel="noopener noreferrer">{b.tripTitle} ↗</a>],
    ["Starts", day(b.startDate)],
    ["Travellers", `${b.pax} × ${money(Number(b.each))}`],
    ["Subtotal", money(Number(b.subtotal))],
    ...(Number(b.discount) ? ([["Discount", `${b.discountCode}: −${money(Number(b.discount))}`]] as [string, string][]) : []),
    ["Trip total", <strong key="tt">{money(Number(b.total))}</strong>],
    ["Payment plan", b.plan === "deposit" ? `20% deposit (${money(Number(b.due))}) now` : b.plan === "full" ? "Full payment" : b.plan],
    ["Paid so far", money(Number(b.paid))],
    ["Balance", <strong key="bal" className={balance ? "text-amber-700" : "text-emerald-700"}>{money(balance)}</strong>],
  ];
  return (
    <>
      <PageHeader title={`${b.leadName} · ${b.tripTitle}`} description={`Booked ${when(b.createdAt)}`} back={{ href: "/bookings", label: "Bookings" }} actions={<Badge tone={b.status === "paid" || b.status === "confirmed" ? "green" : "amber"}>{b.status.replace("_", " ")}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card title="Booking">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}</dl>
          </Card>
          <Card title="Lead traveller">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
              <dt className="text-muted">Name</dt><dd>{b.leadName}</dd>
              <dt className="text-muted">Email</dt><dd><a className="text-pine" href={`mailto:${b.leadEmail}?subject=${encodeURIComponent(`Your booking ${b.reference}`)}`}>{b.leadEmail}</a></dd>
              <dt className="text-muted">Phone</dt><dd><a className="text-pine" href={`https://wa.me/${b.leadPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">{b.leadPhone}</a> (WhatsApp)</dd>
              <dt className="text-muted">Nationality</dt><dd>{b.leadCountry}</dd>
              {b.notes ? <><dt className="text-muted">Their notes</dt><dd className="whitespace-pre-wrap">{b.notes}</dd></> : null}
            </dl>
          </Card>
          <Card title="Payments" info="Payments from WeTravel appear here automatically. Payments you record by hand are marked as such.">
            {b.payments.length ? (
              <ul className="divide-y divide-line text-sm">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span><strong>{money(Number(p.amount))}</strong> · {p.provider === "manual" ? `recorded by hand${(p.raw as { note?: string })?.note ? `: ${(p.raw as { note?: string }).note}` : ""}` : "WeTravel"}<span className="block text-xs text-muted">{when(p.createdAt)}</span></span>
                    <Badge tone={p.status === "succeeded" ? "green" : p.status === "refunded" ? "gray" : "amber"}>{p.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No payments yet.</p>}
            {b.paymentError ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">The WeTravel link couldn't be created automatically ({b.paymentError}). Create one in WeTravel and paste it on the right.</p> : null}
            {events.length ? (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-semibold text-pine">What WeTravel sent ({events.length})</summary>
                <ul className="mt-2 space-y-2">{events.map((e) => <li key={e.id} className="rounded-lg bg-pine/5 p-2"><p className="text-xs font-semibold">{e.type} · {when(e.createdAt)}{e.error ? ` · ${e.error}` : ""}</p><pre className="mt-1 max-h-40 overflow-auto text-[11px]">{JSON.stringify(e.payload, null, 2)}</pre></li>)}</ul>
              </details>
            ) : null}
          </Card>
          <BookingMessages bookingId={b.id} messages={b.messages.map((m) => ({ id: m.id, fromOffice: m.fromOffice, authorName: m.authorName, body: m.body, at: m.createdAt.toISOString() }))} />
          <Card title="Receipts & bills" info="Every successful payment gets a numbered, signed receipt automatically. Open the PDF, email it, or make a bill for the balance." actions={<Link href={`/receipts/new?booking=${b.id}&kind=bill`} className="text-sm font-semibold text-pine hover:underline">New bill</Link>}>
            {b.receipts.length ? (
              <ul className="divide-y divide-line text-sm">
                {b.receipts.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/receipts/${r.id}`} className="font-mono font-semibold text-pine">{r.number}</Link>
                    <span>{money(Number(r.total), r.currency)}</span>
                    {r.voidedAt ? <Badge tone="red">Cancelled</Badge> : <Badge tone={r.kind === "bill" ? "amber" : "green"}>{r.kind === "bill" ? "Bill" : "Paid"}</Badge>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No receipts yet.</p>}
            <MissingReceipts payments={b.payments.filter((p) => p.status === "succeeded" && !b.receipts.some((r) => r.paymentId === p.id)).map((p) => ({ id: p.id, label: `${money(Number(p.amount))} · ${when(p.createdAt)}` }))} />
          </Card>
          <PortalCard
            bookingId={b.id}
            enabled={f.portal.enabled}
            eligible={eligible(b)}
            account={b.traveller ? { email: b.traveller.email, status: b.traveller.status, expiresAt: b.traveller.expiresAt.toISOString(), lastLoginAt: b.traveller.lastLoginAt?.toISOString() ?? null } : null}
            files={b.files.map((x) => ({ id: x.id, name: x.name, kind: FILE_KINDS[x.kind as keyof typeof FILE_KINDS] ?? "Other", bytes: x.bytes, fromOffice: x.uploadedBy !== "traveller", date: x.createdAt.toISOString() }))}
            details={readDetails(b.detailsEnc) as Record<string, string>}
            fields={DETAIL_FIELDS}
          />
        </div>
        <div className="space-y-6">
        {agents ? <AgentSelect bookingId={b.id} agentId={b.agentId} agents={agents.map((a) => ({ id: a.id, label: `${a.company || a.name} (${a.code})` }))} /> : null}
        <BookingControls id={b.id} status={b.status} notes={b.internalNotes ?? ""} paymentUrl={b.paymentUrl ?? ""} balance={balance} />
        </div>
      </div>
    </>
  );
}
