import "server-only";
import { db } from "@/lib/admin/db";
import { adminConfigured } from "@/lib/admin/env";
import { decrypt, encrypt } from "@/lib/admin/crypto";

/**
 * Keys and connection settings the owner can set in Admin → Settings →
 * Keys & email. Stored AES-256-GCM encrypted in the database (the key lives
 * only in the server's .env), never sent back to the browser. Anything not
 * set in the admin falls back to the server's .env file.
 */
export const CONFIG_KEYS = {
  WETRAVEL_API_KEY: { label: "WeTravel API key", secret: true },
  WETRAVEL_ENV: { label: "WeTravel mode", secret: false },
  WETRAVEL_WEBHOOK_SECRET: { label: "WeTravel webhook signing secret", secret: true },
  SMTP_HOST: { label: "SMTP server", secret: false },
  SMTP_PORT: { label: "SMTP port", secret: false },
  SMTP_USER: { label: "SMTP username", secret: false },
  SMTP_PASS: { label: "SMTP password", secret: true },
  EMAIL_FROM: { label: "Send emails from", secret: false },
  OFFICE_EMAIL: { label: "Office alerts go to", secret: false },
} as const;
export type ConfigKey = keyof typeof CONFIG_KEYS;

let cache: { at: number; values: Partial<Record<ConfigKey, string>> } | null = null;

async function stored(): Promise<Partial<Record<ConfigKey, string>>> {
  if (!adminConfigured()) return {};
  if (cache && Date.now() - cache.at < 30_000) return cache.values;
  const rows = await db.setting.findMany({ where: { key: { startsWith: "config:" } } }).catch(() => []);
  const values: Partial<Record<ConfigKey, string>> = {};
  for (const r of rows) {
    const k = r.key.slice("config:".length) as ConfigKey;
    try {
      values[k] = decrypt((r.value as { enc: string }).enc);
    } catch {
      /* unreadable (encryption key changed): fall back to .env */
    }
  }
  cache = { at: Date.now(), values };
  return values;
}

/** One setting: the admin's value, or the server's .env, or "". */
export async function cfg(key: ConfigKey): Promise<string> {
  return (await stored())[key] || process.env[key] || "";
}

/** Which settings come from the admin (true) or the server (false), and whether each is set. */
export async function configStatus() {
  const s = await stored();
  return Object.fromEntries(
    (Object.keys(CONFIG_KEYS) as ConfigKey[]).map((k) => [k, { fromAdmin: Boolean(s[k]), set: Boolean(s[k] || process.env[k]), value: CONFIG_KEYS[k].secret ? null : s[k] || process.env[k] || "" }]),
  ) as Record<ConfigKey, { fromAdmin: boolean; set: boolean; value: string | null }>;
}

export async function saveConfig(values: Partial<Record<ConfigKey, string | null>>) {
  for (const [k, v] of Object.entries(values) as [ConfigKey, string | null][]) {
    if (!(k in CONFIG_KEYS)) continue;
    const key = `config:${k}`;
    if (v === null) await db.setting.deleteMany({ where: { key } });
    else if (v.trim()) await db.setting.upsert({ where: { key }, create: { key, value: { enc: encrypt(v.trim()) }, public: false }, update: { value: { enc: encrypt(v.trim()) } } });
  }
  cache = null;
}
