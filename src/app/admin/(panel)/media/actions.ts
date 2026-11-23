"use server";

import { assertStepUp } from "@/lib/admin/step-up";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser, can } from "@/lib/admin/guards";
import { uploadsDir } from "@/lib/admin/media";
import { forgetUsage, replaceEverywhere, whereUsed, type Use } from "@/lib/admin/media-usage";

type R = { ok: true; usedBy?: Use[] } | { ok: false; error: string; usedBy?: Use[] };
const fail = (e: unknown, fallback: string) => ({ ok: false as const, error: e instanceof Denied ? e.message : fallback });

export async function updateMediaAction(id: string, alt: string): Promise<R> {
  try {
    const { user } = await assertUser("media");
    await db.media.update({ where: { id }, data: { alt: alt.slice(0, 300) } });
    await audit(user.id, "media.update", "media", id);
    return { ok: true };
  } catch (e) {
    return fail(e, "Couldn't save.");
  }
}

/** Where a file is used, with links to edit each place. */
export async function usageAction(id: string): Promise<{ ok: true; usedBy: Use[] } | { ok: false; error: string }> {
  try {
    await assertUser("media");
    const m = await db.media.findUnique({ where: { id }, select: { src: true } });
    return { ok: true, usedBy: m ? await whereUsed(m.src) : [] };
  } catch (e) {
    return fail(e, "Couldn't check where it's used.");
  }
}

async function removeFile(id: string, userId: string) {
  const m = await db.media.findUnique({ where: { id } });
  if (!m) return { deleted: true, usedBy: [] as Use[] };
  const usedBy = await whereUsed(m.src);
  if (usedBy.length) return { deleted: false, usedBy };
  await db.media.delete({ where: { id } });
  if (m.src.startsWith("/uploads/")) {
    const file = path.resolve(/*turbopackIgnore: true*/ uploadsDir(), m.src.replace(/^\/uploads\//, ""));
    if (file.startsWith(uploadsDir() + path.sep)) await unlink(file).catch(() => undefined);
  }
  await audit(userId, "media.delete", "media", id, m.src);
  return { deleted: true, usedBy: [] as Use[] };
}

export async function deleteMediaAction(id: string): Promise<R> {
  try {
    const auth = await assertUser("media");
    const { user } = auth;
    await assertStepUp(auth, "delete");
    const r = await removeFile(id, user.id);
    forgetUsage();
    if (!r.deleted) return { ok: false, error: "This file is still used on the website. Remove it there first, or use Replace everywhere.", usedBy: r.usedBy };
    return { ok: true };
  } catch (e) {
    return fail(e, "Couldn't delete.");
  }
}

/** Deletes several files; any still in use are skipped and named. */
export async function deleteManyAction(ids: string[]): Promise<{ ok: true; deleted: number; kept: number } | { ok: false; error: string }> {
  try {
    const auth = await assertUser("media");
    const { user } = auth;
    await assertStepUp(auth, "delete");
    let deleted = 0, kept = 0;
    for (const id of ids.slice(0, 200)) {
      const r = await removeFile(id, user.id);
      if (r.deleted) deleted++; else kept++;
    }
    forgetUsage();
    return { ok: true, deleted, kept };
  } catch (e) {
    return fail(e, "Couldn't delete.");
  }
}

/**
 * Puts another photo in place of this one on every page that uses it, and
 * publishes the change. `withId` is a photo already in the library (just
 * uploaded, or picked from it).
 */
export async function replaceMediaAction(id: string, withId: string): Promise<{ ok: true; entries: number; sections: number; newSrc: string } | { ok: false; error: string }> {
  try {
    const auth = await assertUser("media");
    const { user } = auth;
    await assertStepUp(auth, "replace");
    if (!can(user, "publish")) return { ok: false, error: "Replacing a photo puts it live on the website, which needs the Publish permission." };
    const [from, to] = await Promise.all([db.media.findUnique({ where: { id } }), db.media.findUnique({ where: { id: withId } })]);
    if (!from || !to) return { ok: false, error: "That photo isn't in the library any more." };
    if (from.mime.startsWith("video/") !== to.mime.startsWith("video/")) return { ok: false, error: "Replace a photo with a photo, and a video with a video." };
    // The new photo keeps the old description unless it has a real one of its own.
    if (from.alt && (!to.alt || to.alt === to.originalName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").toLowerCase())) {
      await db.media.update({ where: { id: to.id }, data: { alt: from.alt } });
    }
    const r = await replaceEverywhere(user.id, from.src, { src: to.src, width: to.width, height: to.height });
    await audit(user.id, "media.replace", "media", id, `${from.src} → ${to.src} (${r.entries} items, ${r.sections} sections)`);
    return { ok: true, ...r, newSrc: to.src };
  } catch (e) {
    console.error("[media] replace failed", e);
    return fail(e, "Couldn't finish replacing the photo. Please try again; places already updated keep the new photo.");
  }
}
