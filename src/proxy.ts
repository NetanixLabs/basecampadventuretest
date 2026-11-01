import { NextResponse, type NextRequest } from "next/server";

/**
 * One app, two sites.
 *
 *  basecampadventure.com/...        the public website (unchanged)
 *  admin.basecampadventure.com/...  the admin, served from src/app/admin
 *
 * On the admin host every path is mapped to /admin/<path>, so the admin has
 * clean addresses (admin.basecampadventure.com/trips). On the public host
 * /admin does not exist. The admin also gets strict security headers and is
 * never indexed. Real access control happens on the server in every admin
 * page and action (src/lib/admin/guards.ts), not here.
 */
const ADMIN_HOST = (process.env.ADMIN_HOST ?? "admin.basecampadventure.com").toLowerCase();

const isAdminHost = (host: string) => {
  const h = host.toLowerCase().split(":")[0];
  return h === ADMIN_HOST || h.startsWith("admin.");
};

/**
 * CSRF guard: a request that changes something must come from a page on the
 * same site. Browsers always send Origin (or at least Referer) on such
 * requests, so a forged form or script on another website is refused here,
 * before any code runs. (On top of SameSite=Strict cookies and Next.js's own
 * Origin check on server actions.)
 */
function crossSite(req: NextRequest, host: string) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return null; // no browser context (e.g. a server-to-server call)
  try {
    return new URL(source).host.toLowerCase() !== host.toLowerCase();
  } catch {
    return true;
  }
}

const forbidden = () => new NextResponse("Forbidden: cross-site request", { status: 403, headers: { "Cache-Control": "no-store" } });

export function proxy(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  if (isAdminHost(host)) {
    // Admin: every change must come from the admin itself; a request with no
    // origin at all is refused too, because only browsers use the admin.
    const cross = crossSite(req, host);
    if (cross === true || (cross === null && !["GET", "HEAD", "OPTIONS"].includes(req.method))) return forbidden();
  } else if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/") && crossSite(req, host) === true) {
    // Public forms can only be sent from basecampadventure.com itself.
    return forbidden();
  }

  if (!isAdminHost(host)) {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
    }
    return NextResponse.next();
  }

  // Shared static files (logo, fonts, uploaded images) are served as they are.
  // (Admin API routes such as /api/subscribers.csv are not files.)
  const isFile = (/\.[a-z0-9]{2,5}$/i.test(pathname) && !pathname.startsWith("/admin/") && !pathname.startsWith("/api/")) || pathname.startsWith("/email-image") || pathname.startsWith("/coupon/");
  let res: NextResponse;
  if (isFile || pathname.startsWith("/admin/") || pathname === "/admin") {
    res = NextResponse.next();
  } else {
    const url = req.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    res = NextResponse.rewrite(url);
  }

  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (!isFile) res.headers.set("Cache-Control", "no-store");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
