import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { CouponSender } from "./coupon-sender";
import { DiscountManager } from "./manager";

export const metadata = { title: "Discount codes" };

export default async function Discounts() {
  await requireUser("sales");
  const [codes, trips, usage, terms] = await Promise.all([
    db.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    db.entry.findMany({ where: { collection: "trips", status: "published" }, orderBy: { title: "asc" }, select: { slug: true, title: true } }),
    db.booking.groupBy({ by: ["discountCode"], where: { discountCode: { not: null } }, _sum: { discount: true, total: true } }),
    db.entry.findMany({ where: { collection: { in: ["destinations", "activities"] } }, orderBy: { title: "asc" }, select: { collection: true, slug: true, title: true } }),
  ]);
  return (
    <>
      <PageHeader title="Discount codes" description="Codes travellers enter when booking online." info="Travellers type the code on the booking page, e.g. DASHAIN10. The website checks it (dates, uses, trips, group size) and prices the booking on the server, so a code can't be faked or edited in the browser. Usage and the value booked with each code are shown here." />
      <DiscountManager
        codes={codes.map((c) => ({ ...c, value: Number(c.value), startsAt: c.startsAt?.toISOString().slice(0, 10) ?? "", endsAt: c.endsAt?.toISOString().slice(0, 10) ?? "", createdAt: c.createdAt.toISOString(), revenue: Number(usage.find((u) => u.discountCode === c.code)?._sum.total ?? 0), saved: Number(usage.find((u) => u.discountCode === c.code)?._sum.discount ?? 0) }))}
        trips={trips.map((t) => ({ value: t.slug, label: t.title }))}
        destinations={terms.filter((t) => t.collection === "destinations").map((t) => ({ value: t.slug, label: t.title }))}
        activities={terms.filter((t) => t.collection === "activities").map((t) => ({ value: t.slug, label: t.title }))}
      />
      <CouponSender codes={codes.filter((c) => c.active).map((c) => ({ code: c.code, label: c.label }))} />
    </>
  );
}
