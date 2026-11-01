import { getAbout, getFeaturedTrips, getLiveTerms, getPostCards, getTripadvisor, getTrips, getTrustindexReviews } from "@/lib/content";
import { abs } from "@/lib/seo";
import { difficultyLabel, site } from "@/lib/site";
import type { Trip } from "@/lib/types";

const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function tripLine(t: Trip, regionNames: Record<string, string>) {
  const bits = [
    `${t.days} days`,
    t.maxAltitude ? `max ${t.maxAltitude.toLocaleString("en-US")} m` : null,
    t.price ? `from US$${t.price.amount.toLocaleString("en-US")} per person` : "price on request",
    t.difficulty ? difficultyLabel[t.difficulty] : null,
    regionNames[t.destinations[0]],
  ].filter(Boolean);
  return `- [${t.title}](${abs(`/trip/${t.slug}/`)}): ${bits.join(", ")}. ${t.summary}`;
}

/** Facts an assistant can quote with confidence, from the admin's live data. */
function keyFacts() {
  const ta = getTripadvisor();
  const ti = getTrustindexReviews();
  const trips = getTrips();
  const prices = trips.map((t) => t.price?.amount).filter((n): n is number => Boolean(n));
  return [
    `- Local Nepali-owned trekking and tour operator based in ${site.address.street}, ${site.address.city}, Nepal, founded in ${site.founded}.`,
    `- Licensed by the Government of Nepal (Reg. ${site.registration.find((r) => r.label === "Govt. Reg.")?.value}); member of TAAN (${site.registration.find((r) => r.label === "TAAN")?.value}) and the Nepal Mountaineering Association (${site.registration.find((r) => r.label === "NMA")?.value}); partner of the Himalayan Rescue Association and KEEP.`,
    ta ? `- Tripadvisor: ${ta.rating}/5 from ${ta.reviews} reviews${ta.ranking ? ` (${ta.ranking})` : ""}; Travellers' Choice award.` : null,
    ti?.rating ? `- Trustindex: ${ti.rating}/5 from ${ti.totalReviews} reviews.` : null,
    `- ${trips.length} trips: treks, tours, peak climbing, expeditions, safaris and rafting in Nepal, Bhutan and Tibet${prices.length ? `, from US$${Math.min(...prices).toLocaleString("en-US")} per person` : ""}.`,
    `- Contact 24/7: ${site.contactPerson}, phone/WhatsApp ${site.mobile}, email ${site.email}.`,
  ].filter(Boolean) as string[];
}

/** /llms.txt: a short, link-rich map of the site for language models. */
export function llmsIndex() {
  const { destinations, activities } = getLiveTerms();
  const names = Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
  const trips = getTrips();
  const about = getAbout();
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description} Licensed local operator in Kathmandu offering treks, tours and climbs in Nepal, Bhutan and Tibet with its own guides. Phone/WhatsApp 24/7: ${site.mobile}. Email: ${site.email}.`,
    "",
    "## Key facts",
    ...keyFacts(),
    "",
    "## Most popular trips",
    ...getFeaturedTrips().slice(0, 8).map((c) => {
      const t = trips.find((x) => x.slug === c.slug);
      return t ? tripLine(t, names) : `- [${c.title}](${abs(`/trip/${c.slug}/`)})`;
    }),
    "",
    "## How to book",
    `- Book online on any trip page: choose a date and group size; a 20% deposit secures the place and the balance is paid before departure. Payments are processed securely by WeTravel.`,
    `- Every trip can be tailored (dates, length, hotels, private or group): [customize a trip](${abs("/customize-trip/")}).`,
    `- Questions are answered personally by the Kathmandu team, usually within a few hours: [contact](${abs("/contact-us/")}).`,
    ...(about?.why?.length ? ["", "## Why travel with Base Camp Adventure", ...about.why.map((w) => `- ${w.title}: ${strip(w.text)}`)] : []),
    "",
    "## Regions",
    ...destinations.map((d) => `- [${d.name}](${abs(`/destinations/${d.slug}/`)})${d.seo?.description ? `: ${d.seo.description}` : ""}`),
    "",
    "## Activities",
    ...activities.map((a) => `- [${a.name}](${abs(`/activities/${a.slug}/`)})${a.seo?.description ? `: ${a.seo.description}` : ""}`),
    "",
    "## All trips by region",
    ...destinations.flatMap((d) => [
      "",
      `### [${d.name}](${abs(`/destinations/${d.slug}/`)})`,
      ...trips.filter((t) => t.destinations[0] === d.slug).map((t) => tripLine(t, names)),
    ]),
    "",
    "## Planning guides",
    ...getPostCards().slice(0, 80).map((p) => `- [${p.title}](${abs(`/${p.slug}/`)}): ${p.excerpt}`),
    "",
    "## Company",
    `- [About us](${abs("/about-us/")})`,
    `- [Our team](${abs("/our-team/")})`,
    `- [Traveller reviews](${abs("/testimonials/")})`,
    `- [Booking terms](${abs("/terms-and-conditions/")})`,
    `- [Visa information](${abs("/visa-info/")})`,
    `- [Contact](${abs("/contact-us/")})`,
    "",
    `Full trip details for every itinerary: ${abs("/llms-full.txt")}`,
  ];
  return lines.join("\n");
}

/** /llms-full.txt: every trip with its facts, day-by-day plan and inclusions. */
export function llmsFull() {
  const { destinations } = getLiveTerms();
  const names = Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
  return [
    `# ${site.name}: full trip catalogue`,
    "",
    "## About the company",
    ...keyFacts(),
    "",
    ...getTrips().flatMap((t) => [
      `## ${t.title}`,
      `URL: ${abs(`/trip/${t.slug}/`)}`,
      `Region: ${names[t.destinations[0]] ?? "Nepal"} | Duration: ${t.days} days | Max altitude: ${t.maxAltitude ? `${t.maxAltitude} m` : "n/a"} | Price: ${t.price ? `US$${t.price.amount} per person` : "on request"}${t.rating ? ` | Rating: ${t.rating.value}/5 from ${t.rating.count} reviews` : ""}`,
      "",
      t.summary,
      "",
      ...(t.itinerary.length ? ["Itinerary:", ...t.itinerary.map((d) => `- Day ${d.day}: ${d.title}`), ""] : []),
      ...(t.includes.length ? ["Included:", ...t.includes.map((x) => `- ${x}`), ""] : []),
      ...(t.excludes.length ? ["Not included:", ...t.excludes.map((x) => `- ${x}`), ""] : []),
      ...(t.faqs.length ? ["FAQ:", ...t.faqs.slice(0, 8).map((f) => `- Q: ${f.q}\n  A: ${strip(f.a)}`), ""] : []),
      "---",
      "",
    ]),
  ].join("\n");
}
