import { notFound } from "next/navigation";
import { EntryEditor } from "@/components/admin/form/entry-editor";
import { collection } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { can, requireUser } from "@/lib/admin/guards";
import { optionsFor } from "@/lib/admin/options";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection: key, id } = await params;
  if (id === "new") return { title: `New ${collection(key)?.singular ?? "item"}` };
  const e = await db.entry.findUnique({ where: { id }, select: { title: true } });
  return { title: e?.title ?? "Edit" };
}

export default async function EditPage({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { user } = await requireUser("content");
  const { collection: key, id } = await params;
  const def = collection(key);
  if (!def) notFound();
  const entry = id === "new" ? null : await db.entry.findUnique({ where: { id }, include: { revisions: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, note: true, createdAt: true, user: { select: { name: true } } } } } });
  if (id !== "new" && (!entry || entry.collection !== key)) notFound();
  const options = await optionsFor(def.sections);

  return (
    <EntryEditor
      def={def}
      id={entry?.id ?? null}
      initial={(entry?.data as Record<string, unknown>) ?? def.blank}
      status={entry?.status ?? "draft"}
      dirty={entry?.dirty ?? false}
      options={options}
      siteUrl={site.url}
      canPublish={can(user.role, "publish")}
      revisions={(entry?.revisions ?? []).map((r) => ({ id: r.id, note: r.note, at: r.createdAt.toISOString(), by: r.user?.name ?? null }))}
    />
  );
}
