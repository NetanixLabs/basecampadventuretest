import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/admin/db";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { features } from "@/lib/admin/features";
import { clientIpFrom } from "@/lib/ip";
import { bookingForReview } from "@/lib/server/reviews";
import { rateLimited } from "@/lib/server/store";

const schema = z.object({
  token: z.string().min(10).max(100),
  rating: z.number().int().min(1).max(5),
  name: z.string().trim().min(2, "Please add your name").max(80),
  country: z.string().trim().max(60).optional().default(""),
  title: z.string().trim().max(120).optional().default(""),
  body: z.string().trim().min(20, "Please write a little more (at least 20 characters)").max(4000),
  consent: z.literal(true, "Please tick the box so we may show your review"),
  website: z.string().max(0).optional().or(z.literal("")).or(z.null()),
});

const clean = (s: string) => s.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim();

export async function POST(req: Request) {
  if (!(await features()).reviews.enabled) return NextResponse.json({ error: "Not available." }, { status: 404 });
  if (rateLimited(`review:${clientIpFrom(req.headers)}`)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true });
  const b = await bookingForReview(d.token);
  if (!b) return NextResponse.json({ error: "This review link has been used or has expired." }, { status: 410 });
  // One review per link: the token is cleared in the same step.
  const claimed = await db.booking.updateMany({ where: { id: b.id, reviewTokenHash: b.reviewTokenHash }, data: { reviewTokenHash: null } });
  if (!claimed.count) return NextResponse.json({ error: "This review link has been used." }, { status: 410 });
  const review = await db.tripReview.create({ data: { bookingId: b.id, tripSlug: b.tripSlug, name: clean(d.name), country: clean(d.country) || null, rating: d.rating, title: clean(d.title) || null, body: clean(d.body), consent: true } });
  const admin = `${(process.env.ADMIN_URL ?? "https://admin.basecampadventure.com").replace(/\/$/, "")}/reviews/traveller/`;
  await sendTemplate("review-office", await officeEmail(), { name: review.name, trip: b.tripTitle, rating: review.rating }, { buttonHref: admin, details: [["Stars", "★".repeat(review.rating)], ...(review.title ? ([["Title", review.title]] as [string, string][]) : []), ["Review", review.body.slice(0, 600)]] }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
