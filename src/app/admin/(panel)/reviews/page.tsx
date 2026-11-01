import Link from "next/link";
import { ArrowRight, Clapperboard as Youtube, Film, Star, Trophy } from "lucide-react";
import { Guide } from "@/components/admin/info";
import { PageHeader } from "@/components/admin/ui";
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
      <PageHeader title="Reviews & videos" description="What travellers say about Base Camp Adventure." info="Reviews written for one trip are edited on that trip (Trips → the trip → Traveller reviews). The pages here control the review tabs on the homepage and the Reviews page." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-line bg-card p-5 transition-colors hover:border-pine">
            <Icon className="size-6 text-pine" aria-hidden />
            <p className="mt-3 flex items-center justify-between font-bold">{title} <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" /></p>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </Link>
        ))}
      </div>
      <Guide className="mt-6" title="How to add a video review">
        <p>1. Open the Media library, choose Videos and upload the MP4 (best under 50 MB, filmed upright).</p>
        <p>2. Click the video and press Copy address.</p>
        <p>3. Go to Video reviews → New video review, give it a title and paste the address. Publish.</p>
        <p>The Base Camp logo is added to every video review automatically, in the bottom-right corner.</p>
      </Guide>
    </>
  );
}
