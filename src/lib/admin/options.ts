import "server-only";
import type { CollectionDef, Field, Option, OptionSource } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";

/** Fills the pick-lists an editor needs (trips, regions, categories…). */
export async function optionsFor(sections: CollectionDef["sections"]): Promise<Partial<Record<OptionSource, Option[]>>> {
  const wanted = new Set<OptionSource>();
  const walk = (fields: Field[]) =>
    fields.forEach((f) => {
      if ((f.type === "select" || f.type === "multiselect") && f.source) wanted.add(f.source);
      if (f.type === "repeater" || f.type === "group") walk(f.fields);
    });
  sections.forEach((s) => walk(s.fields));
  const out: Partial<Record<OptionSource, Option[]>> = {};
  await Promise.all(
    [...wanted].map(async (src) => {
      const rows = await db.entry.findMany({ where: { collection: src }, orderBy: [{ sort: "asc" }, { title: "asc" }], select: { slug: true, title: true, status: true } });
      out[src] = rows.map((r) => ({ value: r.slug, label: r.status === "published" ? r.title : `${r.title} (draft)` }));
    }),
  );
  return out;
}
