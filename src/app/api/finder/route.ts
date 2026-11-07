import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { clientIpFrom } from "@/lib/ip";
import { rateLimited } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const ALLOWED: Record<string, string[]> = {
  style: ["trek", "climb", "culture", "rafting", "bhutan", "tibet"],
  days: ["short", "mid", "long", "epic"],
  altitude: ["low", "mid", "high"],
  budget: ["b1", "b2", "b3", "b4"],
  region: ["everest-region", "annapurna-region", "langtang-region", "manaslu-region", "remote-area-trekking", "any"],
};

/** One finished trip finder: the answers and how many trips matched. Nothing about the person. */
export async function POST(req: Request) {
  if (rateLimited(`finder:${clientIpFrom(req.headers)}`, 20)) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { answers?: Record<string, unknown>; results?: unknown } | null;
  const answers: Record<string, string> = {};
  for (const [k, list] of Object.entries(ALLOWED)) {
    const v = body?.answers?.[k];
    if (typeof v === "string" && list.includes(v)) answers[k] = v;
  }
  if (!Object.keys(answers).length) return new NextResponse(null, { status: 204 });
  const results = Math.max(0, Math.min(99, Math.round(Number(body?.results) || 0)));
  await db.finderAnswer.create({ data: { answers, results } }).catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
