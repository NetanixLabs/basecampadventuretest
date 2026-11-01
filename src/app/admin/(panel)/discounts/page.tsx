import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { DiscountManager } from "./manager";

export const metadata = { title: "Discount codes" };

export default async function Discounts() {
  await requireUser("sales");
  const [codes, trips, usage] = await Promise.all([
    db.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    db.entry.findMany({ where: { collection: "trips", status: "published" }, orderBy: { title: "asc" }, select: { slug: true, title: true } }),
    db.booking.groupBy({ by: ["discountCode"], where: { discountCode: { not: null } }, _sum: { discount: true, total: true } }),
  ]);
  return (
    <>
      <PageHeader title="Discount codes" description="Codes travellers type when booking online, e.g. DASHAIN10. The saving is checked and applied on the server, so it can't be faked." />
      <DiscountManager
        codes={codes.map((c) => ({ ...c, value: Number(c.value), startsAt: c.startsAt?.toISOString().slice(0, 10) ?? "", endsAt: c.endsAt?.toISOString().slice(0, 10) ?? "", createdAt: c.createdAt.toISOString(), revenue: Number(usage.find((u) => u.discountCode === c.code)?._sum.total ?? 0), saved: Number(usage.find((u) => u.discountCode === c.code)?._sum.discount ?? 0) }))}
        trips={trips.map((t) => ({ value: t.slug, label: t.title }))}
      />
    </>
  );
}
