import type { NextConfig } from "next";
import { CONTENT_REDIRECTS } from "./src/lib/redirects";

/**
 * Content Security Policy.
 *
 * Third parties are listed by name and only for what they need:
 * tawk.to (live chat), Google Analytics 4, and YouTube's no-cookie player.
 * WeTravel checkout opens on its own domain, so it needs no entry here.
 */
const csp = [
  "default-src 'self'",
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline' https://embed.tawk.to https://*.tawk.to https://www.googletagmanager.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://embed.tawk.to https://*.tawk.to https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://*.tawk.to https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.tawk.to https://tawk.link https://i.ytimg.com https://www.googletagmanager.com https://*.google-analytics.com",
  "font-src 'self' data: https://*.tawk.to https://fonts.gstatic.com",
  "connect-src 'self' https://*.tawk.to wss://*.tawk.to https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "frame-src https://*.tawk.to https://www.youtube-nocookie.com",
  "media-src 'self' https://*.tawk.to",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.wetravel.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  distDir: process.env.BCA_NEXT_DIST_DIR || ".next",
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  // pdfkit reads its built-in font metrics from its own folder at runtime.
  serverExternalPackages: ["pdfkit"],
  // WordPress served every URL with a trailing slash. Matching it means not a
  // single indexed URL changes shape on the day of the switch.
  trailingSlash: true,
  // Server routes read the imported content at runtime; ship it with them.
  outputFileTracingIncludes: {
    "/api/**": ["./src/content/trips.json"],
    "/wp-content/**": ["./src/content/media-redirects.json", "./src/content/media-files.json"],
    // The trip program PDF is set in the site's own fonts.
    "/trip/**": ["./node_modules/@fontsource/manrope/files/manrope-latin-{600,700}-normal.woff", "./node_modules/@fontsource/dm-sans/files/dm-sans-latin-{400,500,700}-normal.woff"],
  },
  images: {
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/media/**", search: "?v=without-logo-1" },
      { pathname: "/photos/**", search: "?v=without-logo-1" },
    ],
    deviceSizes: [640, 828, 1200, 1920, 2560, 3840],
    imageSizes: [96, 256, 384],
    qualities: [70, 75, 80, 82, 85, 95],
    // WebP only: AVIF takes several times longer to encode, which made first
    // visits wait on the optimiser. The sources are WebP already.
    formats: ["image/webp"],
    minimumCacheTTL: 2_678_400,
  },
  async redirects() {
    return [
      // Old aliases that still circulate in emails and bookmarks.
      { source: "/home/", destination: "/", permanent: true },
      { source: "/trips/", destination: "/trip/", permanent: true },
      { source: "/blog/", destination: "/blogs/", permanent: true },
      // WP Travel Engine and plugin pages that have no meaning outside WordPress.
      { source: "/online-payment-form/", destination: "/online-payment/", permanent: true },
      { source: "/checkout/", destination: "/booking/", permanent: true },
      { source: "/travelers-information/", destination: "/booking/", permanent: true },
      { source: "/search-result/", destination: "/trip/", permanent: true },
      { source: "/wishlist/", destination: "/trip/", permanent: true },
      { source: "/user-dashboard/", destination: "/", permanent: true },
      { source: "/review-listing-page/", destination: "/testimonials/", permanent: true },
      { source: "/thanking-you/", destination: "/thank-you/", permanent: true },
      { source: "/enquiry-received/", destination: "/thank-you/", permanent: true },
      { source: "/enquiry-thankyou-page/", destination: "/thank-you/", permanent: true },
      { source: "/success/", destination: "/thank-you/", permanent: true },
      { source: "/cancel/", destination: "/booking/", permanent: true },
      { source: "/feed/", destination: "/blogs/", permanent: true },
      { source: "/author/:path*", destination: "/our-team/", permanent: true },
      { source: "/tag/:path*", destination: "/blogs/", permanent: true },
      { source: "/difficulty/:path*", destination: "/trip/", permanent: true },
      { source: "/trip-difficulty/:path*", destination: "/trip/", permanent: true },
      // Trip tags in the live sitemap, each to the trip it was about.
      { source: "/trip-tag/everest-base-camp-three-passes-trek/", destination: "/trip/everest-three-passes-trek/", permanent: true },
      { source: "/trip-tag/makalu/", destination: "/trip/makalu-base-camp-trek/", permanent: true },
      { source: "/trip-tag/:path*", destination: "/trip/", permanent: true },
      { source: "/trip_tag/:path*", destination: "/trip/", permanent: true },
      { source: "/destinations/", destination: "/destination/", permanent: true },
      { source: "/photo-credits/", destination: "/gallery/", permanent: true },
      // Old addresses linked from inside the imported content (src/lib/redirects.ts).
      ...CONTENT_REDIRECTS.map((r) => ({ ...r, permanent: true })),
      { source: "/category/:path*/page/:n/", destination: "/category/:path*/", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/(media|photos|brand)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/videos/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
