import "server-only";
import { z } from "zod";

/**
 * Admin environment, validated on first use (never at build time, so
 * `next build` works on a machine without secrets).
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** 32 random bytes, base64. Encrypts 2FA secrets at rest. */
  ENCRYPTION_KEY: z
    .string()
    .min(1, "ENCRYPTION_KEY is required")
    .refine((v) => Buffer.from(v, "base64").length === 32, "ENCRYPTION_KEY must be 32 bytes, base64 encoded"),
  /** Public address of the admin, used in emailed links. */
  ADMIN_URL: z.url().default("https://admin.basecampadventure.com"),
  /** Keep true in production. "false" only for local development. */
  REQUIRE_TOTP: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
  SESSION_HOURS: z.coerce.number().int().positive().max(24 * 14).default(72),
  SESSION_IDLE_MINUTES: z.coerce.number().int().positive().default(60),
  /** Where published content snapshots are written; the site reads them. */
  CONTENT_DIR: z.string().default(""),
  /** Where uploaded images are stored. */
  UPLOADS_DIR: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  EMAIL_FROM: z.string().default("Base Camp Adventure <info@basecampadventure.com>"),
  /** Where office notifications go (new enquiry, new booking, payment). */
  OFFICE_EMAIL: z.string().default("info@basecampadventure.com"),
  /** Public address of the traveller portal, used in emailed links. */
  PORTAL_URL: z.url().default("https://my.basecampadventure.com"),
  /** Shared secret for the scheduled jobs (/api/cron), sent as a bearer token. */
  CRON_SECRET: z.string().default(""),
  /** Where travellers' documents are stored, encrypted. Never inside the website folder. */
  PRIVATE_DIR: z.string().default(""),
});

export type AdminEnv = z.infer<typeof schema>;
let cached: AdminEnv | null = null;

export function env(): AdminEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Admin is misconfigured: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  if (!parsed.data.REQUIRE_TOTP && process.env.NODE_ENV === "production") {
    console.warn("[admin] REQUIRE_TOTP=false in production: accounts are protected by a password only.");
  }
  cached = parsed.data;
  return cached;
}

/** Is the admin configured at all? Public routes fall back to files when not. */
export const adminConfigured = () => Boolean(process.env.DATABASE_URL);
