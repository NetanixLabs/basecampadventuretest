"use server";

import { audit } from "@/lib/admin/audit";
import { CONFIG_KEYS, saveConfig, type ConfigKey } from "@/lib/admin/config";
import { sendRaw } from "@/lib/admin/email/send";
import { Denied, assertUser } from "@/lib/admin/guards";

export async function saveKeys(values: Partial<Record<ConfigKey, string | null>>): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("settings");
    const clean = Object.fromEntries(Object.entries(values).filter(([k]) => k in CONFIG_KEYS)) as Partial<Record<ConfigKey, string | null>>;
    if (clean.WETRAVEL_ENV && !["production", "sandbox"].includes(clean.WETRAVEL_ENV)) return { ok: false, message: "WeTravel mode must be production or sandbox." };
    if (clean.SMTP_PORT && !/^\d{2,5}$/.test(clean.SMTP_PORT)) return { ok: false, message: "The SMTP port is a number, usually 587 or 465." };
    await saveConfig(clean);
    // Names only, never values.
    await audit(user.id, "settings.keys", "settings", null, Object.keys(clean).join(", "));
    return { ok: true, message: "Saved and encrypted." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}

export async function testEmail(): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("settings");
    const r = await sendRaw(user.email, "Base Camp admin: email is working", { preview: "Your email settings work.", heading: "Email is working", blocks: [{ kind: "text", text: "This test came from the Base Camp Adventure admin. Booking, enquiry and newsletter emails will be sent the same way." }] }, "settings-test");
    return r.ok ? { ok: true, message: `Sent to ${user.email}. Check your inbox (and spam folder).` } : { ok: false, message: `Sending failed: ${r.error}` };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't send." };
  }
}
