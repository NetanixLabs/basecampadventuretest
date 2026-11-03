import { NextResponse } from "next/server";
import { openDepartures } from "@/lib/server/departures";

export const dynamic = "force-dynamic";

/** Fixed departures with seats left, for a trip's booking form. Public, no personal data. */
export async function GET(req: Request) {
  const trip = new URL(req.url).searchParams.get("trip") ?? "";
  if (!/^[a-z0-9-]{1,120}$/.test(trip)) return NextResponse.json({ departures: [] }, { status: 400 });
  const departures = await openDepartures(trip).catch(() => []);
  return NextResponse.json({ departures }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" } });
}
