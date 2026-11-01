import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/admin/crypto";
import { env } from "@/lib/admin/env";
import { runJobs } from "@/lib/server/jobs";

export const dynamic = "force-dynamic";

/** Scheduled jobs. Called by the server's timer with the CRON_SECRET; 404 for anyone else. */
export async function POST(req: Request) {
  const secret = env().CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || secret.length < 24 || !safeEqual(auth, `Bearer ${secret}`)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ ok: true, ...(await runJobs()) });
}
