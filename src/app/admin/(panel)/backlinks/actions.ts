"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { cleanUrl, recheck } from "@/lib/admin/backlinks";
import { db } from "@/lib/admin/db";
import { addRedirect } from "@/lib/admin/entries";
import { Denied, assertUser } from "@/lib/admin/guards";
import { refreshSite } from "@/lib/admin/publish";

type R = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown, fallback = "Something went wrong. Please try again."): R => ({ ok: false, error: e instanceof Denied ? e.message : e instanceof Error && e.message.startsWith("!") ? e.message.slice(1) : fallback });
const done = (message?: string): R => { revalidatePath("/backlinks"); return { ok: true, message }; };

/** Sends a missing address to a working page (a permanent 301, so the link keeps its value). */
export async function fixMissingAction(path: string, to: string): Promise<R> {
  try {
    const { user } = await assertUser("content");
    const t = to.trim().replace(/^https?:\/\/(www\.)?basecampadventure\.com/, "");
    if (!t.startsWith("/") && !/^https?:\/\//.test(t)) throw new Error("!The new address must start with / or https://");
    if (t === path) throw new Error("!That's the same address.");
    await addRedirect(path, t, "Fixed from Backlinks & broken links");
    await db.missingPage.delete({ where: { path } }).catch(() => undefined);
    refreshSite();
    await audit(user.id, "redirect.save", "redirect", null, `${path} → ${t}`);
    return done(`Fixed: ${path} now goes to ${t}.`);
  } catch (e) {
    return fail(e);
  }
}

export async function ignoreMissingAction(path: string): Promise<R> {
  try {
    await assertUser("content");
    await db.missingPage.update({ where: { path }, data: { ignored: true } });
    return done("Hidden from the list.");
  } catch (e) {
    return fail(e);
  }
}

/** Adds backlinks from pasted text (one address per line, or a Search Console export) and checks them. */
export async function addBacklinksAction(text: string, note: string): Promise<R> {
  try {
    const { user } = await assertUser("content");
    const urls = [...new Set(text.split(/[\s,]+/).map(cleanUrl).filter((u): u is string => Boolean(u)))].slice(0, 200);
    if (!urls.length) throw new Error("!Paste at least one web address of a page that links to you.");
    const existing = new Set((await db.backlink.findMany({ where: { sourceUrl: { in: urls } }, select: { sourceUrl: true } })).map((b) => b.sourceUrl));
    const fresh = urls.filter((u) => !existing.has(u));
    for (const u of fresh) await db.backlink.create({ data: { sourceUrl: u, note: note.trim().slice(0, 200) || null } });
    // Check the first ones straight away; the rest are checked by the scheduled jobs.
    const created = await db.backlink.findMany({ where: { sourceUrl: { in: fresh } }, select: { id: true } });
    await Promise.all(created.slice(0, 10).map((b) => recheck(b.id)));
    await audit(user.id, "backlink.add", "backlink", null, `${fresh.length} added`);
    return done(`${fresh.length} added${existing.size ? `, ${existing.size} already in the list` : ""}.${created.length > 10 ? " The rest are checked within the hour." : ""}`);
  } catch (e) {
    return fail(e);
  }
}

export async function checkBacklinkAction(id: string): Promise<R> {
  try {
    await assertUser("content");
    const b = await recheck(id);
    return done(b ? (b.status === "live" ? "The link is there and passes value." : b.status === "nofollow" ? "The link is there, marked nofollow." : b.status === "missing" ? "The page no longer links to you." : `Couldn't open the page: ${b.lastError}`) : undefined);
  } catch (e) {
    return fail(e);
  }
}

export async function checkAllAction(): Promise<R> {
  try {
    await assertUser("content");
    const rows = await db.backlink.findMany({ orderBy: { lastChecked: { sort: "asc", nulls: "first" } }, take: 40, select: { id: true } });
    for (let i = 0; i < rows.length; i += 5) await Promise.all(rows.slice(i, i + 5).map((r) => recheck(r.id)));
    return done(`${rows.length} checked.`);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBacklinkAction(id: string): Promise<R> {
  try {
    await assertUser("content");
    await db.backlink.delete({ where: { id } });
    return done("Removed.");
  } catch (e) {
    return fail(e);
  }
}
