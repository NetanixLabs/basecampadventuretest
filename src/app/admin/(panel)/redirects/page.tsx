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
      <PageHeader title="Redirects" description="Send an old address to a new one (301, so Google moves its ranking across). Renaming a page's address in the editor adds one automatically. The old WordPress addresses are already handled." />
      <RedirectManager rows={rows.map((r) => ({ id: r.id, from: r.from, to: r.to, note: r.note, createdAt: r.createdAt.toISOString() }))} />
    </>
  );
}
