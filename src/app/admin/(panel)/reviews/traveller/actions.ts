"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/admin/audit";
import { collection } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { refreshSite, writeCollection } from "@/lib/admin/publish";

type R = { ok: boolean; message: string };
type TripData = { reviews?: unknown[]; rating?: { value: number; count: number } | null };

/** Adds the review to the trip (newest first) and updates the star average, then publishes. */
function withReview(data: TripData, r: { name: string; country: string | null; rating: number; title: string | null; body: string; createdAt: Date }): TripData {
  const reviews = Array.isArray(data.reviews) ? data.reviews : [];
  const count = data.rating?.count ?? reviews.length;
  const value = data.rating?.value ?? 5;
  const next = count + 1;
  return {
    ...data,
    reviews: [{ author: r.country ? `${r.name}, ${r.country}` : r.name, rating: r.rating, title: r.title, body: r.body, date: r.createdAt.toISOString().slice(0, 10) }, ...reviews],
    rating: { value: Math.round(((value * count + r.rating) / next) * 10) / 10, count: next },
  };
}

export async function decideReview(id: string, decision: "approve" | "reject" | "delete"): Promise<R> {
  try {
    const { user } = await assertUser("content");
    const r = await db.tripReview.findUnique({ where: { id } });
    if (!r) return { ok: false, message: "Review not found." };
    if (decision === "delete") {
      await db.tripReview.delete({ where: { id } });
    } else if (decision === "reject") {
      await db.tripReview.update({ where: { id }, data: { status: "rejected", decidedAt: new Date() } });
    } else {
      if (r.status === "approved") return { ok: true, message: "Already on the trip page." };
      if (!r.consent) return { ok: false, message: "The traveller didn't agree to publishing." };
      const entry = await db.entry.findFirst({ where: { collection: "trips", slug: r.tripSlug } });
      if (!entry) return { ok: false, message: "The trip no longer exists." };
      const data = withReview(entry.data as TripData, r) as Prisma.InputJsonValue;
      const live = entry.live ? (withReview(entry.live as TripData, r) as Prisma.InputJsonValue) : undefined;
      await db.$transaction([
        db.entry.update({ where: { id: entry.id }, data: { data, ...(live ? { live } : {}) } }),
        db.tripReview.update({ where: { id }, data: { status: "approved", decidedAt: new Date() } }),
      ]);
      if (live) {
        await writeCollection(collection("trips")!);
        refreshSite();
      }
    }
    await audit(user.id, `review.${decision}`, "review", id, `${r.rating}★ ${r.tripSlug}`);
    revalidatePath("/admin/reviews/traveller");
    return { ok: true, message: decision === "approve" ? "Approved and published on the trip page." : decision === "reject" ? "Rejected. It won't be shown." : "Deleted." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Something went wrong." };
  }
}
