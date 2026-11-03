/**
 * One-time content corrections, run by deploy/deploy.sh after migrations.
 * Each fix runs once per server (recorded in the "contentFixes" setting), so a
 * later edit in the admin is never overwritten. The fixes themselves live in
 * src/lib/admin/content-fixes.ts.
 */
import "dotenv/config";
import { db } from "@/lib/admin/db";
import { collection } from "@/lib/admin/collections";
import { FIXES, appliesTo, applyFix } from "@/lib/admin/content-fixes";
import { writeCollection, writeSettings } from "@/lib/admin/publish";

async function main() {
  const row = await db.setting.findUnique({ where: { key: "contentFixes" } });
  const done = new Set<string>(Array.isArray(row?.value) ? (row!.value as string[]) : []);
  const todo = FIXES.filter((f) => !done.has(f.id));
  let changed = 0;
  if (todo.length) {
    for (const e of await db.entry.findMany({ where: { collection: "trips" } })) {
      let data = e.data as unknown, live = e.live as unknown;
      for (const f of todo) if (appliesTo(f, e.slug)) { data = applyFix(data, f, e.slug); live = applyFix(live, f, e.slug); }
      if (JSON.stringify(data) !== JSON.stringify(e.data) || JSON.stringify(live) !== JSON.stringify(e.live)) {
        await db.entry.update({ where: { id: e.id }, data: { data: data as object, ...(e.live ? { live: live as object } : {}) } });
        changed++;
        console.log("corrected", e.slug);
      }
    }
    for (const f of todo) done.add(f.id);
    await db.setting.upsert({ where: { key: "contentFixes" }, create: { key: "contentFixes", value: [...done], public: false }, update: { value: [...done] } });
  }
  // Settings: the photo watermark became smaller (16% → 10% of the width) on 3 Nov 2026.
  if (!done.has("2026-11-watermark-10")) {
    const f = await db.setting.findUnique({ where: { key: "features" } });
    const v = f?.value as { watermark?: { size?: number } } | null;
    if (v?.watermark?.size === 16) {
      await db.setting.update({ where: { key: "features" }, data: { value: { ...v, watermark: { ...v.watermark, size: 10 } } as object } });
      await writeSettings();
      console.log("watermark size set to 10%");
    }
    done.add("2026-11-watermark-10");
    await db.setting.upsert({ where: { key: "contentFixes" }, create: { key: "contentFixes", value: [...done], public: false }, update: { value: [...done] } });
  }
  if (changed) await writeCollection(collection("trips")!);
  console.log(changed ? `content fixes: ${changed} trips corrected and republished` : "content fixes: nothing to do");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
