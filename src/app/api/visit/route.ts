import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { clientIpFrom } from "@/lib/ip";
import { rateLimited } from "@/lib/server/store";
import { isSource } from "@/lib/sources";

export const dynamic = "force-dynamic";

/** One visit, counted per day and source. No IP, cookie or browser details are stored. */
export async function POST(req: Request) {
  if (rateLimited(`visit:${clientIpFrom(req.headers)}`, 30)) return new NextResponse(null, { status: 204 });
  if (/bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { source?: unknown } | null;
  const source = isSource(body?.source) ? body.source : null;
  if (!source) return new NextResponse(null, { status: 204 });
  const day = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  await db.$executeRaw`INSERT INTO "VisitDay" ("day", "source", "visits") VALUES (${day}::date, ${source}, 1) ON CONFLICT ("day", "source") DO UPDATE SET "visits" = "VisitDay"."visits" + 1`.catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
