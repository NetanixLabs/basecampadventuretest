import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Card, PageHeader, Stat, money, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { can, requireUser } from "@/lib/admin/guards";

export const metadata = { title: "Dashboard" };

const VERB: Record<string, string> = { "content.publish": "published", "content.save": "saved", "content.unpublish": "unpublished", "content.delete": "deleted", "content.reorder": "reordered", "content.archive": "archived" };

const greeting = () => {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kathmandu" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { user } = await requireUser();
  const { denied } = await searchParams;
  const sales = can(user, "sales");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [trips, posts, drafts, changed, enquiriesNew, bookingsOpen, paidMonth, recentEnquiries, recentBookings, recentEdits] = await Promise.all([
    db.entry.count({ where: { collection: "trips", status: "published" } }),
    db.entry.count({ where: { collection: "posts", status: "published" } }),
    db.entry.count({ where: { status: "draft" } }),
    db.entry.count({ where: { dirty: true } }),
    sales ? db.enquiry.count({ where: { status: "new" } }) : 0,
    sales ? db.booking.count({ where: { status: { in: ["requested", "awaiting_payment"] } } }) : 0,
    sales ? db.payment.aggregate({ where: { createdAt: { gte: monthStart }, status: "succeeded" }, _sum: { amount: true } }) : null,
    sales ? db.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5 }) : [],
    sales ? db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 5 }) : [],
    db.auditLog.findMany({ where: { action: { startsWith: "content." } }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { name: true } } } }),
  ]);

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(" ")[0]}`} description="Here's what's happening on basecampadventure.com." />
      {denied ? <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your account doesn't have access to that page. Ask the owner if you need it.</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sales ? (
          <>
            <Stat label="New enquiries" value={enquiriesNew} hint="waiting for a reply" href="/enquiries?status=new" />
            <Stat label="Open bookings" value={bookingsOpen} hint="requested or awaiting payment" href="/bookings" />
            <Stat label="Paid this month" value={money(Number(paidMonth?._sum.amount ?? 0))} hint="through WeTravel" href="/bookings?status=paid" />
          </>
        ) : null}
        <Stat label="Live trips" value={trips} hint={`${posts} blog articles`} href="/c/trips" />
        {!sales ? <Stat label="Drafts" value={drafts} hint={`${changed} with unpublished changes`} /> : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {sales ? (
          <>
            <Card title="Latest enquiries" actions={<Link href="/enquiries" className="text-sm font-semibold text-pine">All →</Link>}>
              {recentEnquiries.length ? (
                <ul className="divide-y divide-line">
                  {recentEnquiries.map((e) => (
                    <li key={e.id}>
                      <Link href={`/enquiries/${e.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-pine">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{e.name}</span>
                          <span className="block truncate text-xs text-muted">{e.trip || e.kind} · {when(e.createdAt)}</span>
                        </span>
                        {e.status === "new" ? <Badge tone="amber">New</Badge> : <Badge>{e.status}</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No enquiries yet. Website forms land here.</p>}
            </Card>
            <Card title="Latest bookings" actions={<Link href="/bookings" className="text-sm font-semibold text-pine">All →</Link>}>
              {recentBookings.length ? (
                <ul className="divide-y divide-line">
                  {recentBookings.map((b) => (
                    <li key={b.id}>
                      <Link href={`/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-pine">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{b.leadName} · {b.tripTitle}</span>
                          <span className="block truncate text-xs text-muted">{b.reference} · {money(Number(b.total))}</span>
                        </span>
                        <Badge tone={b.status === "paid" || b.status === "confirmed" ? "green" : b.status === "deposit_paid" ? "blue" : "amber"}>{b.status.replace("_", " ")}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No bookings yet.</p>}
            </Card>
          </>
        ) : null}
        <Card title="Quick actions">
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              ["/c/posts/new", "Write a blog article"],
              ["/c/trips/new", "Add a new trip"],
              ["/c/offers/new", "Create a festival offer"],
              ["/media", "Upload photos"],
              ["/seo", "Check SEO health"],
              ["/singles/home-copy", "Edit homepage text"],
              ["/singles/home", "Change homepage trips"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold hover:border-pine hover:text-pine">
                  {label} <ArrowRight className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent changes">
          {recentEdits.length ? (
            <ul className="space-y-2 text-sm">
              {recentEdits.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate"><strong>{a.user?.name ?? "Someone"}</strong> {VERB[a.action] ?? "changed"} {a.summary}</span>
                  <span className="shrink-0 text-xs text-muted">{when(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Edits made in the admin will appear here.</p>}
        </Card>
      </div>
    </>
  );
}
