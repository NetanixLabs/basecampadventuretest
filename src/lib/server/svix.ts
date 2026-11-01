import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a webhook signed the Svix way (used by WeTravel): HMAC-SHA256 of
 * "<id>.<timestamp>.<body>" with the endpoint's whsec_ secret, sent in the
 * svix-signature header. Messages older than 5 minutes are refused, so a
 * captured request can't be replayed later.
 */
export function verifySvix(secret: string, headers: Headers, body: string, toleranceSec = 300): boolean {
  const id = headers.get("svix-id") ?? headers.get("webhook-id");
  const ts = headers.get("svix-timestamp") ?? headers.get("webhook-timestamp");
  const sigs = headers.get("svix-signature") ?? headers.get("webhook-signature");
  if (!id || !ts || !sigs || !secret) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
