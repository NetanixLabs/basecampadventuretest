import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/admin/db";
import { clientIpFrom } from "@/lib/ip";
import { rateLimited } from "@/lib/server/store";

export const dynamic = "force-dynamic";
const MAX = 5000;

/** Addresses nobody needs to hear about: bots probing for WordPress files and the like. */
const NOISE = /^\/(wp-(login|admin|includes|json)|xmlrpc|\.env|\.git|cgi-bin|phpmyadmin|vendor|admin\.php|config\.)|\.(php|asp|aspx|jsp|cgi|env|sql|bak|zip)$/i;

/**
 * The "not found" page reports which address was missing and which page linked
 * to it. The office then fixes it with one redirect, so links from other
 * websites (backlinks) keep their value. No IP or personal details are stored.
 */
export async function POST(req: Request) {
  if (rateLimited(`404:${clientIpFrom(req.headers)}`, 20)) return new NextResponse(null, { status: 204 });
  if (/bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { path?: unknown; ref?: unknown } | null;
  const raw = typeof body?.path === "string" ? body.path : "";
  let path: string;
  try {
    path = decodeURI(new URL(raw, "https://x.invalid").pathname).slice(0, 300);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!path.startsWith("/") || path.startsWith("/_next/") || path.startsWith("/api/") || NOISE.test(path)) return new NextResponse(null, { status: 204 });
  let ref = "";
  try {
    if (typeof body?.ref === "string" && body.ref) {
      const u = new URL(body.ref);
      if (u.protocol === "https:" || u.protocol === "http:") ref = `${u.origin}${u.pathname}`.slice(0, 300);
    }
  } catch { /* no usable referrer */ }

  const now = new Date();
  const row = await db.missingPage.findUnique({ where: { path } }).catch(() => null);
  // Anyone can trigger this, so the list is capped: a flood of made-up addresses can't fill the database.
  if (!row && (await db.missingPage.count().catch(() => MAX)) >= MAX) return new NextResponse(null, { status: 204 });
  const refs = { ...((row?.referrers as Record<string, number>) ?? {}) };
  if (ref) refs[ref] = (refs[ref] ?? 0) + 1;
  const top = Object.fromEntries(Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 20)) as Prisma.InputJsonValue;
  await db.missingPage
    .upsert({ where: { path }, create: { path, hits: 1, referrers: top, firstSeen: now, lastSeen: now }, update: { hits: { increment: 1 }, referrers: top, lastSeen: now } })
    .catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
