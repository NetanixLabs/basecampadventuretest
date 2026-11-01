"use server";

import { Denied, assertUser } from "@/lib/admin/guards";
import { InputError, removeEntry, reorder, saveEntry, setStatus, type SaveResult } from "@/lib/admin/entries";
import { db } from "@/lib/admin/db";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    if (e instanceof InputError || e instanceof Denied) return { ok: false, error: e.message };
    console.error("[admin] action failed", e);
    return { ok: false, error: "Something went wrong while saving. Your changes are still on screen; please try again." };
  }
}

export async function saveAction(key: string, id: string | null, data: Record<string, unknown>, publish: boolean): Promise<Result<SaveResult>> {
  return run(async () => {
    const { user } = await assertUser(publish ? "publish" : "content");
    return saveEntry(user.id, key, id, data, publish);
  });
}

export async function unpublishAction(key: string, id: string) {
  return run(async () => {
    const { user } = await assertUser("publish");
    await setStatus(user.id, key, id, "draft");
  });
}

export async function deleteAction(key: string, id: string) {
  return run(async () => {
    const { user } = await assertUser("publish");
    await removeEntry(user.id, key, id);
  });
}

export async function reorderAction(key: string, ids: string[]) {
  return run(async () => {
    const { user } = await assertUser("publish");
    await reorder(user.id, key, ids);
  });
}

export async function revisionAction(revisionId: string) {
  return run(async () => {
    await assertUser("content");
    const r = await db.revision.findUnique({ where: { id: revisionId }, select: { data: true } });
    if (!r) throw new InputError("That version no longer exists.");
    return r.data as Record<string, unknown>;
  });
}
