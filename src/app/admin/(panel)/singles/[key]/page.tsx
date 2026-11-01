import { notFound } from "next/navigation";
import { DocEditor } from "@/components/admin/form/doc-editor";
import { singleton } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { optionsFor } from "@/lib/admin/options";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  return { title: singleton((await params).key)?.label ?? "Edit" };
}

export default async function SinglePage({ params }: { params: Promise<{ key: string }> }) {
  await requireUser("content");
  const def = singleton((await params).key);
  if (!def) notFound();
  const row = await db.setting.findUnique({ where: { key: `doc:${def.key}` } });
  return <DocEditor def={def} initial={(row?.value as Record<string, unknown>) ?? def.defaults ?? {}} options={await optionsFor(def.sections)} siteUrl={site.url} />;
}
