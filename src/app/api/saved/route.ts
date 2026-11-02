import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/admin/db";
import { hashToken, randomToken } from "@/lib/admin/crypto";
import { sendTemplate, officeEmail } from "@/lib/admin/email/send";
import { features } from "@/lib/admin/features";
import { getTrip } from "@/lib/content";
import { clientIpFrom } from "@/lib/ip";
import { rateLimited } from "@/lib/server/store";
import { site } from "@/lib/site";
import { tripDetails } from "@/lib/server/saved";

const schema = z.object({
  email: z.email("That email address doesn't look right").max(200),
  trips: z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).min(1).max(30),
  remind: z.boolean().optional(),
  website: z.string().max(0).optional().or(z.literal("")),
});

/** Emails a visitor their saved trips (and, if they ticked it, one reminder later). */
export async function POST(req: Request) {
  const f = await features();
  if (!f.saved.enabled) return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
  const ip = clientIpFrom(req.headers);
  if (rateLimited(`saved:${ip}`, 5)) return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Please check your email" }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });
  const trips = [...new Set(parsed.data.trips)].filter((s) => getTrip(s));
  if (!trips.length) return NextResponse.json({ ok: false, error: "Save a trip first." }, { status: 400 });
  const token = randomToken(18);
  await db.savedList.create({ data: { email: parsed.data.email.toLowerCase(), trips, token: hashToken(token), remindAt: parsed.data.remind ? new Date(Date.now() + f.saved.reminderDays * 864e5) : null } });
  const link = `${site.url.replace(/\/$/, "")}/saved/?list=${token}`;
  await sendTemplate("saved-trips", parsed.data.email, { count: trips.length }, { details: tripDetails(trips), buttonHref: link, replyTo: await officeEmail() }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
