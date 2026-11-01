"use server";

import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/admin/audit";
import { singleton } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { refreshSite, writeSingleton } from "@/lib/admin/publish";

export async function saveSingletonAction(key: string, data: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await assertUser("publish");
    const def = singleton(key);
    if (!def) return { ok: false, error: "Unknown page." };
    const value = JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
    await db.setting.upsert({ where: { key: `doc:${key}` }, create: { key: `doc:${key}`, value, public: false }, update: { value } });
    await writeSingleton(key);
    refreshSite();
    await audit(user.id, "content.publish", "singleton", key, def.label);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
}
