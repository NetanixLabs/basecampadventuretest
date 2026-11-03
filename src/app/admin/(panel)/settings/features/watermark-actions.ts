"use server";

import { audit } from "@/lib/admin/audit";
import { bulkStatus, refreshIfPending, startBulkWatermark, undoBulkWatermark, type BulkState } from "@/lib/admin/bulk-watermark";
import { Denied, assertUser } from "@/lib/admin/guards";

type Public = Omit<BulkState, "map"> & { photos: number };
const shape = (s: BulkState): Public => ({ state: s.state, done: s.done, total: s.total, changed: s.changed, startedAt: s.startedAt, finishedAt: s.finishedAt, error: s.error, photos: Object.keys(s.map).length });

export async function watermarkStatus(): Promise<Public | null> {
  try {
    await assertUser("settings");
    await refreshIfPending();
    return shape(await bulkStatus());
  } catch {
    return null;
  }
}

export async function watermarkExisting(): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("settings");
    const r = await startBulkWatermark();
    if (r.ok) await audit(user.id, "media.watermark-existing", "settings", null);
    return r;
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't start." };
  }
}

export async function undoWatermarkExisting(): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("settings");
    const r = await undoBulkWatermark();
    if (r.ok) await audit(user.id, "media.watermark-undo", "settings", null);
    return r;
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't undo." };
  }
}
