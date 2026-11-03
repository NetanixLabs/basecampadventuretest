/**
 * One-time content corrections, run by deploy/deploy.sh after migrations.
 * Each fix runs once per server (recorded in the "contentFixes" setting), so a
 * later edit in the admin is never overwritten. Text is only replaced where the
 * old, wrong wording is still there.
 */
import "dotenv/config";
import { db } from "@/lib/admin/db";
import { collection } from "@/lib/admin/collections";
import { writeCollection } from "@/lib/admin/publish";

type Fix = { id: string; collection: string; slug: string; replace?: [string, string][]; set?: Record<string, [unknown, unknown]> };

const FIXES: Fix[] = [
  { id: "2026-11-ebc3-namche", collection: "trips", slug: "3-days-everest-base-camp-trek", replace: [["Fly from Namche Bazaar (5,545 m / 18,192 ft) to Kala Patthar", "Fly from Namche Bazaar (3,440 m / 11,286 ft) to Kala Patthar (5,545 m / 18,192 ft)"]] },
  { id: "2026-11-ebcgokyo-altitudes", collection: "trips", slug: "everest-base-camp-and-gokyo-trek", replace: [["Namche Bazaar (33,440 m / 11,286 ft)", "Namche Bazaar (3,440 m / 11,286 ft)"], ["Machhermo (4,470 m / 15,715 ft)", "Machhermo (4,470 m / 14,665 ft)"]] },
  { id: "2026-11-gokyo-dole", collection: "trips", slug: "gokyo-valley-trek", replace: [["Dole (44,200 m / 13,780 ft)", "Dole (4,200 m / 13,780 ft)"]] },
  { id: "2026-11-renjo-namche", collection: "trips", slug: "gokyo-valley-with-renjo-la-pass-trek", replace: [["Namche Bazaar (33,440 m / 11,286 ft)", "Namche Bazaar (3,440 m / 11,286 ft)"]] },
  { id: "2026-11-pikey-walk", collection: "trips", slug: "pikey-peak-trek", replace: [["After a scenic 6–7-hour drive, we reach Japrey", "After a scenic 6–7-hour walk, we reach Japrey"]] },
  { id: "2026-11-poonhill-max", collection: "trips", slug: "ghorepani-poon-hill-trek", set: { maxAltitude: [2860, 3210] } },
];

const esc = (s: string) => JSON.stringify(s).slice(1, -1);

async function main() {
  const row = await db.setting.findUnique({ where: { key: "contentFixes" } });
  const done = new Set<string>(Array.isArray(row?.value) ? (row!.value as string[]) : []);
  const touched = new Set<string>();
  for (const f of FIXES) {
    if (done.has(f.id)) continue;
    const e = await db.entry.findUnique({ where: { collection_slug: { collection: f.collection, slug: f.slug } } });
    if (e) {
      const apply = (v: unknown) => {
        if (v == null) return v;
        let s = JSON.stringify(v);
        for (const [a, b] of f.replace ?? []) s = s.split(esc(a)).join(esc(b));
        const o = JSON.parse(s) as Record<string, unknown>;
        for (const [k, [from, to]] of Object.entries(f.set ?? {})) if (o[k] === from) o[k] = to;
        return o;
      };
      const data = apply(e.data), live = apply(e.live);
      if (JSON.stringify(data) !== JSON.stringify(e.data) || JSON.stringify(live) !== JSON.stringify(e.live)) {
        await db.entry.update({ where: { id: e.id }, data: { data: data as object, ...(e.live ? { live: live as object } : {}) } });
        touched.add(f.collection);
        console.log("applied", f.id);
      }
    }
    done.add(f.id);
  }
  await db.setting.upsert({ where: { key: "contentFixes" }, create: { key: "contentFixes", value: [...done], public: false }, update: { value: [...done] } });
  for (const c of touched) await writeCollection(collection(c)!);
  console.log(touched.size ? `republished: ${[...touched].join(", ")}` : "content fixes: nothing to do");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
