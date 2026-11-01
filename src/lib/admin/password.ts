import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Passwords: Argon2id, OWASP's first recommendation (m=19 MiB, t=2, p=1).
 * Parameters are stored in each hash, so they can be raised later.
 */
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string) => hash(plain.normalize("NFKC"), OPTIONS);

export async function verifyPassword(plain: string, stored: string) {
  try {
    return await verify(stored, plain.normalize("NFKC"));
  } catch {
    return false;
  }
}

/** A hash used to keep "unknown email" logins as slow as real ones. */
let dummy: Promise<string> | null = null;
export const dummyHash = () => (dummy ??= hashPassword("not-a-real-password-placeholder"));

/** Plain rules people can follow: length beats symbols. */
export function passwordProblem(pw: string, email?: string): string | null {
  if (pw.length < 12) return "Use at least 12 characters. A short sentence works well.";
  if (pw.length > 200) return "That password is too long.";
  if (/^(.)\1+$/.test(pw)) return "That password is too easy to guess.";
  const lower = pw.toLowerCase();
  if (["password", "basecamp", "qwerty", "123456", "nepal"].some((w) => lower.includes(w) && pw.length < 16)) {
    return "Avoid common words like 'password' or the company name.";
  }
  if (email && lower.includes(email.split("@")[0].toLowerCase())) return "Don't include your email name in the password.";
  return null;
}
