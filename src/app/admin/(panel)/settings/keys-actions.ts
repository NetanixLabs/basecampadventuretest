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
    if (clean.HBL_ENV && !["production", "sandbox"].includes(clean.HBL_ENV)) return { ok: false, message: "Himalayan Bank mode must be production or sandbox." };
    // Check every HBL key really is a usable key before saving it.
    const { importPKCS8, importSPKI } = await import("jose");
    const pem = (v: string, kind: string) => (v.includes("-----BEGIN") ? v.trim() : `-----BEGIN ${kind}-----\n${v.replace(/\s+/g, "").replace(/(.{64})/g, "$1\n")}\n-----END ${kind}-----`);
    const checks: [ConfigKey, "private" | "public", string, string][] = [
      ["HBL_MERCHANT_SIGNING_KEY", "private", "PS256", "Merchant signing private key"],
      ["HBL_MERCHANT_DECRYPTION_KEY", "private", "RSA-OAEP", "Merchant decryption private key"],
      ["HBL_PACO_ENCRYPTION_KEY", "public", "RSA-OAEP", "PACO encryption public key"],
      ["HBL_PACO_SIGNING_KEY", "public", "PS256", "PACO signing public key"],
    ];
    for (const [k, kind, alg, label] of checks) {
      const v = clean[k];
      if (!v) continue;
      try {
        if (kind === "private") await importPKCS8(pem(v, "PRIVATE KEY"), alg);
        else await importSPKI(pem(v, "PUBLIC KEY"), alg);
      } catch {
        return { ok: false, message: `The ${label} isn't a valid ${kind === "private" ? "PKCS#8 private" : "public"} key. Paste it exactly as the bank sent it.` };
      }
    }
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
