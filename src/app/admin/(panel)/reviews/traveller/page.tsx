import { Badge, Card, Empty, PageHeader, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { features } from "@/lib/admin/features";
import { requireUser } from "@/lib/admin/guards";
import { ReviewActions } from "./review-actions";

export const metadata = { title: "Traveller reviews" };

export default async function TravellerReviews({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireUser("content");
  const { show = "pending" } = await searchParams;
  const status = (["pending", "approved", "rejected"].includes(show) ? show : "pending") as "pending" | "approved" | "rejected";
  const [rows, counts, f] = await Promise.all([
    db.tripReview.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100, include: { booking: { select: { tripTitle: true, reference: true } } } }),
    db.tripReview.groupBy({ by: ["status"], _count: true }),
    features(),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <>
      <PageHeader title="Traveller reviews" description="Reviews sent by travellers after their trip." back={{ href: "/reviews", label: "Reviews & videos" }} info={`After a trip ends, travellers get an email asking for 1–5 stars and a few words (${f.reviews.enabled ? `on, ${f.reviews.afterDays} days after the trip` : "switched off"}; change it in Settings → Features). Nothing is shown until you approve it. Approving adds the review to the top of the trip's reviews and updates its star average.`} />
      <nav className="mb-6 flex gap-2 overflow-x-auto text-sm">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <a key={s} href={`/reviews/traveller/?show=${s}`} className={`rounded-full px-4 py-2 font-semibold capitalize ${s === status ? "bg-pine text-white" : "border border-line hover:border-pine"}`}>{s === "pending" ? "Waiting" : s} ({n(s)})</a>
        ))}
      </nav>
      {rows.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg tracking-wide text-amber-500" aria-label={`${r.rating} stars`}>{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></p>
                  <p className="mt-1 font-bold">{r.title || "No title"}</p>
                  <p className="text-sm text-muted">{r.name}{r.country ? `, ${r.country}` : ""} · {r.booking?.tripTitle ?? r.tripSlug} · {when(r.createdAt)}</p>
                </div>
                {r.consent ? <Badge tone="green">May be published</Badge> : <Badge tone="red">No consent</Badge>}
              </div>
              <p className="mt-3 text-sm whitespace-pre-wrap">{r.body}</p>
              <ReviewActions id={r.id} status={r.status} />
            </Card>
          ))}
        </div>
      ) : (
        <Empty title={status === "pending" ? "No reviews waiting" : `No ${status} reviews`}>{status === "pending" ? "New reviews from travellers will appear here." : null}</Empty>
      )}
    </>
  );
}
