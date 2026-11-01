/**
 * The visitor's real IP address, for rate limits and the audit log.
 *
 * In production Caddy works it out (trusting Cloudflare's CF-Connecting-IP
 * only for requests that really come from Cloudflare, see deploy/Caddyfile)
 * and passes it as X-Real-IP, overwriting anything the visitor sent. Headers
 * a visitor can set themselves (X-Forwarded-For, CF-Connecting-IP) are only
 * believed in development.
 */
export function clientIpFrom(h: Headers): string {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  if (process.env.NODE_ENV !== "production") return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return "unknown";
}
