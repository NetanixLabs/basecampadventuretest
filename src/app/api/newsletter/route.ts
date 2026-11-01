import { NextResponse } from "next/server";
import { clientIpFrom } from "@/lib/ip";
import { z } from "zod";
import { saveSubscriber } from "@/lib/server/sales";
import { rateLimited } from "@/lib/server/store";

const schema = z.object({
  email: z.email("That email address doesn't look right").max(200),
  // Where on the site they signed up, e.g. "footer" or "offers".
  source: z.string().trim().max(40).optional(),
  // Honeypot: real people never see this field.
  website: z.string().max(0).optional().or(z.literal("")),
});

/** Newsletter sign-up: email only. The admin's email system sends the campaigns. */
export async function POST(req: Request) {
  const ip = clientIpFrom(req.headers);
  if (rateLimited(`newsletter:${ip}`, 5)) {
    return NextResponse.json({ ok: false, error: "Too many sign-ups from this connection. Please try again later." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Please check your email" }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });
  await saveSubscriber(parsed.data.email, parsed.data.source ?? "site");
  return NextResponse.json({ ok: true });
}
