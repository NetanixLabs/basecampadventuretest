import { NextResponse } from "next/server";
import { clientIpFrom } from "@/lib/ip";
import { z } from "zod";
import { saveEnquiry } from "@/lib/server/sales";
import { sourceFromCookie } from "@/lib/sources";
import { rateLimited, reference } from "@/lib/server/store";

const schema = z.object({
  kind: z.enum(["contact", "custom-trip", "trip-request"]).default("contact"),
  name: z.string().trim().min(2, "Please tell us your name").max(120),
  email: z.email("That email address doesn't look right").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  trip: z.string().trim().max(200).optional().or(z.literal("")),
  date: z.string().trim().max(40).optional().or(z.literal("")),
  travellers: z.string().trim().max(40).optional().or(z.literal("")),
  duration: z.string().trim().max(40).optional().or(z.literal("")),
  budget: z.string().trim().max(40).optional().or(z.literal("")),
  interests: z.array(z.string().max(60)).max(20).optional(),
  fitness: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
  // Trip request extras.
  tripSlug: z.string().trim().max(200).optional().or(z.literal("")),
  places: z.array(z.string().max(60)).max(20).optional(),
  style: z.string().trim().max(40).optional().or(z.literal("")),
  contactBy: z.enum(["Email", "WhatsApp", "Phone"]).optional(),
  // Honeypot: real people never see this field.
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const ip = clientIpFrom(req.headers);
  if (rateLimited(`enquiry:${ip}`)) {
    return NextResponse.json({ ok: false, error: "Too many messages from this connection. Please try again in a few minutes, or WhatsApp us." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true, reference: "BCA-OK" });

  const ref = reference("ENQ");
  const { website: _honeypot, ...data } = parsed.data;
  void _honeypot;
  const { kind, name, email, phone, country, trip, ...rest } = data;
  await saveEnquiry({ reference: ref, kind, name, email, phone, country, trip, data: rest, ip, source: sourceFromCookie(req.headers.get("cookie")) });
  return NextResponse.json({ ok: true, reference: ref });
}
