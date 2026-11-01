import { getPublicSettings } from "@/lib/content";

/** The IndexNow key file (proves to search engines that pings come from this site). */
export function GET() {
  const key = getPublicSettings().indexnowKey;
  return typeof key === "string" && key ? new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } }) : new Response("Not found", { status: 404 });
}
