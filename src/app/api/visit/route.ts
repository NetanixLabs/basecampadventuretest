import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { clientIpFrom } from "@/lib/ip";
import { rateLimited } from "@/lib/server/store";
import { isSource } from "@/lib/sources";

export const dynamic = "force-dynamic";

/** The referring website's domain (no full address, nothing personal) and the page it linked to. */
function referralOf(ref: unknown, path: unknown, ownHost: string) {
  if (typeof ref !== "string" || !ref || typeof path !== "string" || !path.startsWith("/")) return null;
  try {
    const domain = new URL(ref).hostname.toLowerCase().replace(/^www\./, "");
    const own = ownHost.toLowerCase().split(":")[0].replace(/^www\./, "");
    if (!domain || domain === own || domain.endsWith(`.${own}`) || domain === "basecampadventure.com") return null;
    return { domain: domain.slice(0, 120), path: path.split(/[?#]/)[0].slice(0, 200) };
  } catch {
    return null;
  }
}

/** One visit, counted per day and source. No IP, cookie or browser details are stored. */
export async function POST(req: Request) {
  if (rateLimited(`visit:${clientIpFrom(req.headers)}`, 30)) return new NextResponse(null, { status: 204 });
  if (/bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { source?: unknown; ref?: unknown; path?: unknown } | null;
  const source = isSource(body?.source) ? body.source : null;
  if (!source) return new NextResponse(null, { status: 204 });
  const day = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  await db.$executeRaw`INSERT INTO "VisitDay" ("day", "source", "visits") VALUES (${day}::date, ${source}, 1) ON CONFLICT ("day", "source") DO UPDATE SET "visits" = "VisitDay"."visits" + 1`.catch(() => undefined);
  // Which other website sent the visitor, and to which page: the backlinks that bring people.
  const referral = referralOf(body?.ref, body?.path, req.headers.get("host") ?? "");
  if (referral) {
    // Capped at 20,000 website/page pairs, so made-up referrers can't fill the database.
    const updated = await db.$executeRaw`UPDATE "Referral" SET "visits" = "visits" + 1, "lastSeen" = now() WHERE "domain" = ${referral.domain} AND "path" = ${referral.path}`.catch(() => 1);
    if (!updated) {
      await db.$executeRaw`INSERT INTO "Referral" ("domain", "path", "visits", "firstSeen", "lastSeen") SELECT ${referral.domain}, ${referral.path}, 1, now(), now()
        WHERE (SELECT count(*) FROM "Referral") < 20000 ON CONFLICT ("domain", "path") DO NOTHING`.catch(() => undefined);
    }
  }
  return new NextResponse(null, { status: 204 });
}
