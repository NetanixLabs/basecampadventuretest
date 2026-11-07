import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { assertUser } from "@/lib/admin/guards";
import { SEGMENTS, customerStats, isSegment } from "@/lib/server/segments";

/** The selected customers as a spreadsheet (CSV), e.g. past travellers for an offer. */
export async function GET(req: Request) {
  let userId: string;
  try {
    userId = (await assertUser("customers")).user.id;
  } catch {
    return new Response("Sign in again.", { status: 401 });
  }
  const u = new URL(req.url).searchParams;
  const seg = u.get("seg") ?? "";
  const tag = (u.get("tag") ?? "").slice(0, 30);
  const term = (u.get("q") ?? "").trim().slice(0, 80);
  const stats = await customerStats();
  const rows = (await db.customer.findMany({
    where: { ...(tag ? { tags: { has: tag } } : {}), ...(term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, { country: { contains: term, mode: "insensitive" } }] } : {}) },
    orderBy: { name: "asc" },
  })).filter((c) => !isSegment(seg) || stats.get(c.email.toLowerCase())?.segments.includes(seg));
  const subs = new Map((await db.subscriber.findMany({ where: { email: { in: rows.map((r) => r.email.toLowerCase()) } }, select: { email: true, status: true } })).map((s) => [s.email, s.status]));
  const q = (v: unknown) => { const s = String(v ?? ""); return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; };
  const d = (x: Date | null | undefined) => (x ? x.toISOString().slice(0, 10) : "");
  const csv = [
    "name,email,phone,country,trips,paid_usd,last_trip,next_trip,groups,tags,newsletter",
    ...rows.map((c) => {
      const s = stats.get(c.email.toLowerCase());
      return [c.name, c.email, c.phone, c.country, s?.trips ?? 0, s ? s.paid.toFixed(2) : "0.00", d(s?.last), d(s?.next), (s?.segments ?? []).map((x) => SEGMENTS[x]).join("; "), c.tags.join("; "), subs.get(c.email.toLowerCase()) ?? "not subscribed"].map(q).join(",");
    }),
  ].join("\n");
  await audit(userId, "customers.export", "customer", null, `${rows.length} rows${seg ? ` ${seg}` : ""}${tag ? ` tag ${tag}` : ""}`);
  return new Response(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="customers${isSegment(seg) ? `-${seg}` : ""}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
