import "server-only";
import { db } from "@/lib/admin/db";
import type { Coupon } from "@/lib/admin/email/coupon";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, "");
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** Builds the voucher for a discount code from what's saved in the admin. */
export async function couponFor(code: string): Promise<Coupon | null> {
  const d = await db.discountCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!d) return null;
  const names = async (collection: string, slugs: string[]) => (slugs.length ? (await db.entry.findMany({ where: { collection, slug: { in: slugs } }, select: { title: true } })).map((t) => t.title) : []);
  const titles = [...(await names("destinations", d.destinations)), ...(await names("activities", d.activities)), ...(await names("trips", d.trips))];
  const value = Number(d.value);
  return {
    code: d.code,
    amount: d.kind === "percent" ? `${value}% OFF` : `${usd(value)} OFF`,
    label: d.label,
    validUntil: d.endsAt ? d.endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null,
    validFor: !titles.length ? "Every trip" : titles.length <= 2 ? titles.join(" & ") : `${titles.slice(0, 2).join(", ")} & more`,
    minPax: d.minPax,
    bookUrl: `${site()}/booking/?code=${encodeURIComponent(d.code)}${d.trips.length === 1 ? `&trip=${encodeURIComponent(d.trips[0])}` : ""}&utm_source=coupon&utm_medium=email`,
  };
}
