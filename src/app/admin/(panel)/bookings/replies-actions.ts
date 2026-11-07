"use server";

import { randomBytes } from "node:crypto";
import { audit } from "@/lib/admin/audit";
import { Denied, assertUser } from "@/lib/admin/guards";
import { savedReplies, writeReplies, type SavedReply } from "@/lib/server/replies";

type R = { ok: boolean; message: string; replies?: SavedReply[] };

export async function saveReply(title: string, body: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const t = String(title ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 80);
    const b = String(body ?? "").trim().slice(0, 2000);
    if (!t || b.length < 5) return { ok: false, message: "Give the reply a short name and some text." };
    const list = await savedReplies();
    if (list.length >= 60) return { ok: false, message: "That's the most saved replies; delete one first." };
    const next = [...list, { id: randomBytes(6).toString("hex"), title: t, body: b }];
    await writeReplies(next);
    await audit(user.id, "replies.save", "settings", null, t);
    return { ok: true, message: `Saved as "${t}".`, replies: next };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}

export async function deleteReply(id: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const next = (await savedReplies()).filter((r) => r.id !== id);
    await writeReplies(next);
    await audit(user.id, "replies.delete", "settings", null, id);
    return { ok: true, message: "Deleted.", replies: next };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't delete." };
  }
}
