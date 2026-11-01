"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { uploadsDir } from "@/lib/admin/media";

type R = { ok: true; usedBy?: string[] } | { ok: false; error: string; usedBy?: string[] };

export async function updateMediaAction(id: string, alt: string): Promise<R> {
  try {
    const { user } = await assertUser("media");
    await db.media.update({ where: { id }, data: { alt: alt.slice(0, 300) } });
    await audit(user.id, "media.update", "media", id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Denied ? e.message : "Couldn't save." };
  }
}

/** Where a file is used, so nothing on the website breaks by deleting it. */
async function usage(src: string) {
  const rows = await db.$queryRaw<{ title: string; collection: string }[]>`
    SELECT title, collection FROM "Entry" WHERE data::text LIKE ${"%" + src + "%"} OR live::text LIKE ${"%" + src + "%"} LIMIT 10`;
  const docs = await db.$queryRaw<{ key: string }[]>`SELECT key FROM "Setting" WHERE value::text LIKE ${"%" + src + "%"} LIMIT 5`;
  return [...rows.map((r) => `${r.title} (${r.collection})`), ...docs.map((d) => d.key.replace("doc:", ""))];
}

export async function deleteMediaAction(id: string): Promise<R> {
  try {
    const { user } = await assertUser("media");
    const m = await db.media.findUnique({ where: { id } });
    if (!m) return { ok: true };
    const usedBy = await usage(m.src);
    if (usedBy.length) return { ok: false, error: "This file is still used on the website. Remove it there first.", usedBy };
    await db.media.delete({ where: { id } });
    if (m.src.startsWith("/uploads/")) {
      const file = path.resolve(/*turbopackIgnore: true*/ uploadsDir(), m.src.replace(/^\/uploads\//, ""));
      if (file.startsWith(uploadsDir() + path.sep)) await unlink(file).catch(() => undefined);
    }
    await audit(user.id, "media.delete", "media", id, m.src);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Denied ? e.message : "Couldn't delete." };
  }
}
