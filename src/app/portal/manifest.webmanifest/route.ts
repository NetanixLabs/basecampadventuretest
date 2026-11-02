/** Lets travellers add their trip page to the phone's home screen like an app. */
export function GET() {
  return Response.json(
    {
      name: "My trip · Base Camp Adventure",
      short_name: "My trip",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f6f9fa",
      theme_color: "#00788a",
      icons: [{ src: "/brand/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400" } },
  );
}
