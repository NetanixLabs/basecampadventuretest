import Link from "next/link";
import { ArrowRight, Clapperboard as Youtube, Film, Star, Trophy } from "lucide-react";
import { Card, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";

export const metadata = { title: "Reviews & videos" };

export default async function ReviewsHub() {
  await requireUser("content");
  const counts = await db.entry.groupBy({ by: ["collection"], _count: true, where: { collection: { in: ["videoReviews", "videos", "awards"] } } });
  const n = (k: string) => counts.find((c) => c.collection === k)?._count ?? 0;
  const items = [
    { href: "/c/videoReviews", icon: Film, title: "Video reviews", text: `${n("videoReviews")} portrait videos from travellers, shown in the homepage carousel with the Base Camp logo.` },
    { href: "/singles/tripadvisor", icon: Star, title: "Tripadvisor", text: "Rating, review count and ranking shown with the badge." },
    { href: "/singles/google-reviews", icon: Star, title: "Google reviews", text: "Reviews shown in the Google tab." },
    { href: "/singles/trustindex-reviews", icon: Star, title: "Trustindex reviews", text: "Reviews shown in the Trustindex tab." },
    { href: "/c/videos", icon: Youtube, title: "YouTube videos", text: `${n("videos")} company videos, on the homepage and trip pages.` },
    { href: "/c/awards", icon: Trophy, title: "Awards", text: `${n("awards")} awards and certificates.` },
  ];
  return (
    <>
      <PageHeader title="Reviews & videos" description="What travellers say about Base Camp Adventure. Traveller reviews of a single trip are edited on that trip." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-line bg-card p-5 transition-colors hover:border-pine">
            <Icon className="size-6 text-pine" aria-hidden />
            <p className="mt-3 flex items-center justify-between font-bold">{title} <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" /></p>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6" title="Tip">
        <p className="text-sm text-muted">To add a video review: upload the MP4 in the media library (Videos), copy its address, then create a new video review and paste it in. Keep videos under 50 MB (1080p) so they start quickly on phones.</p>
      </Card>
    </>
  );
}
