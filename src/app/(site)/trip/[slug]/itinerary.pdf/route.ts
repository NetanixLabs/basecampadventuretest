import { getTrip, getTripInfo } from "@/lib/content";
import { programFileName, programPdf } from "@/lib/program-pdf";

/**
 * /trip/<slug>/itinerary.pdf — the trip program as a PDF, built from the
 * trip's current content. Open to search engines (it is listed in the
 * sitemap), so it can appear for searches such as "Everest Base Camp trek
 * itinerary pdf", and every page links back to the trip.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = getTrip(slug);
  if (!trip) return new Response("Not found", { status: 404 });
  const pdf = await programPdf(trip, new URL(req.url).origin, getTripInfo(trip));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${programFileName(trip)}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
