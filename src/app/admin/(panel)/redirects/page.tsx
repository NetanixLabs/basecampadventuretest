import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { RedirectManager } from "./manager";

export const metadata = { title: "Redirects" };

export default async function Redirects() {
  await requireUser("content");
  const rows = await db.redirect.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Redirects" description="Old addresses that forward to new ones." info="A redirect sends visitors and Google from an old address to a new one (a permanent 301, so the page keeps its ranking). Changing a page's web address in the editor adds one automatically. Every address from the previous website is already forwarded." />
      <RedirectManager rows={rows.map((r) => ({ id: r.id, from: r.from, to: r.to, note: r.note, createdAt: r.createdAt.toISOString() }))} />
    </>
  );
}
