import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/admin/env";

/** AES-256-GCM, base64(iv[12] | tag[16] | ciphertext). Used for 2FA secrets. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", Buffer.from(env().ENCRYPTION_KEY, "base64"), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const d = createDecipheriv("aes-256-gcm", Buffer.from(env().ENCRYPTION_KEY, "base64"), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}

/** SHA-256 for random, high-entropy secrets (session tokens, reset links, backup codes). */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Codes people type from paper: no 0/O/1/I/L/U. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export function backupCode(): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let s = "";
  while (s.length < 10) for (const b of randomBytes(20)) if (b < limit && s.length < 10) s += ALPHABET[b % ALPHABET.length];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
