"use server";

import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/admin/audit";
import { saveConfig } from "@/lib/admin/config";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { refreshSite, writeSettings } from "@/lib/admin/publish";
import { FEATURE_DEFAULTS, withFeatureDefaults, type Features } from "@/lib/features";

export async function saveFeatures(input: Features, secrets: { WHATSAPP_TOKEN?: string; WHATSAPP_PHONE_ID?: string; CALLMEBOT_KEYS?: string }): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("settings");
    const f = withFeatureDefaults(input);
    f.abandoned.afterHours = Math.min(168, Math.max(1, Math.round(Number(f.abandoned.afterHours) || 24)));
    f.reviews.afterDays = Math.min(60, Math.max(0, Math.round(Number(f.reviews.afterDays) || 2)));
    f.portal.expiryDays = Math.min(365, Math.max(1, Math.round(Number(f.portal.expiryDays) || 30)));
    f.portal.inviteHours = Math.min(336, Math.max(1, Math.round(Number(f.portal.inviteHours) || 72)));
    for (const k of ["eur", "gbp", "aud"] as const) f.currency[k] = Math.min(100, Math.max(0.01, Math.round(Number(f.currency[k]) * 10000) / 10000 || FEATURE_DEFAULTS.currency[k]));
    f.saved.reminderDays = Math.min(30, Math.max(1, Math.round(Number(f.saved.reminderDays)) || 3));
    f.payments.nprRate = Math.min(1000, Math.max(1, Math.round(Number(f.payments.nprRate) * 100) / 100 || 133));
    if (!f.payments.wetravel && !f.payments.hbl) return { ok: false, message: "Keep at least one payment method switched on." };
    if (!f.payments[f.payments.preferred]) f.payments.preferred = f.payments.wetravel ? "wetravel" : "hbl";
    f.whatsapp.recipients = String(f.whatsapp.recipients ?? "").replace(/[^0-9,+ ]/g, "").slice(0, 200);
    const value = f as unknown as Prisma.InputJsonValue;
    await db.setting.upsert({ where: { key: "features" }, create: { key: "features", value, public: true }, update: { value } });
    const keys = Object.fromEntries(Object.entries(secrets).filter(([, v]) => v && v.trim()));
    if (Object.keys(keys).length) await saveConfig(keys);
    await writeSettings();
    refreshSite();
    await audit(user.id, "settings.features", "settings", null);
    return { ok: true, message: "Saved. The website follows these switches now." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}
