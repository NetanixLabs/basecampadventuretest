import "server-only";
import { resolveOldPath } from "@/lib/redirects";
import { tripInfo, type InfoOverrides } from "@/lib/trip-info";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type {
  CommunityPost,
  Img,
  MenuItem,
  Offer,
  Page,
  Photo,
  Post,
  PostCard,
  Taxonomies,
  TeamMember,
  Trip,
  TripCard,
  Video,
  Award,
  EquipmentList,
  GoogleReviews,
  ReviewSourcesData,
  TrustindexReviews,
  VideoReview,
} from "@/lib/types";

/**
 * Content access.
 *
 * Reads the JSON written by the WordPress importer. Every page goes through
 * these functions, so swapping the source for the admin database later is a
 * change to this file only.
 */

/**
 * Published content lives in CONTENT_DIR, written by the admin whenever
 * something is published. Anything not published there yet falls back to the
 * files in the repository, so a fresh checkout works with no database.
 */
const repoDir = path.join(process.cwd(), "src", "content");
const liveDir = path.resolve(process.env.CONTENT_DIR || path.join(process.cwd(), ".storage", "content"));

function fileFor(name: string): { file: string; modified: number } | null {
  for (const d of [liveDir, repoDir]) {
    const file = path.join(d, `${name}.json`);
    try {
      return { file, modified: statSync(file).mtimeMs };
    } catch {
      /* try the next place */
    }
  }
  return null;
}

/**
 * Altitudes in the imported text arrive wrapped as
 * <span class="measurement" data-meters="5364">5,364 m</span>. They are shown
 * as plain text with both units, e.g. "5,364 m (17,598 ft)".
 */
const MEASURE = /<span class="measurement" data-meters="(\d+)">[^<]*<\/span>/g;
const withFeet = (s: string) =>
  s.replace(MEASURE, (_m, m: string) => `${Number(m).toLocaleString("en-US")} m / ${Math.round(Number(m) * 3.28084).toLocaleString("en-US")} ft`);

/**
 * Links inside imported text go straight to the final page: old WordPress
 * addresses are rewritten (src/lib/redirects.ts) and internal paths get the
 * trailing slash every URL here has, so no link costs a redirect.
 */
const HREF = /href="(https?:\/\/(?:www\.)?basecampadventure\.com)?(\/[^"#?]*)([^"]*)"/g;
const directLinks = (s: string) =>
  s.replace(HREF, (m, origin: string | undefined, p: string, rest: string) => {
    if (p.startsWith("/wp-content/")) return m;
    const target = resolveOldPath(p);
    if (target) return `href="${target}${rest}"`;
    if (!/\.\w+$/.test(p) && !p.endsWith("/")) return `href="${origin ?? ""}${p}/${rest}"`;
    return m;
  });

const parsedContent = new Map<string, { file: string; modified: number; value: unknown }>();

/** Reads one content file, parsed once and kept until a newer version is published. */
export function load<T>(name: string, fallback: T): T {
  const f = fileFor(name);
  if (!f) return fallback;
  const existing = parsedContent.get(name);
  if (existing?.file === f.file && existing.modified === f.modified) return existing.value as T;
  try {
    const value = JSON.parse(readFileSync(f.file, "utf8"), (_k, v) => {
      if (typeof v !== "string") return v;
      let s = v.includes('class="measurement"') ? withFeet(v) : v;
      if (s.includes('href="')) s = directLinks(s);
      return s;
    }) as T;
    parsedContent.set(name, { ...f, value });
    return value;
  } catch {
    return fallback;
  }
}

/** Per-day figures the admin adds on top of the imported itinerary (distance, walking time). */
type DayExtras = Record<string, Record<string, { distanceKm?: number; hours?: number; accommodation?: string; images?: Img[] }>>;

function withExtras(trips: Trip[], extras: DayExtras): Trip[] {
  return trips.map((t) =>
    extras[t.slug]
      ? { ...t, itinerary: t.itinerary.map((d) => ({ ...d, ...extras[t.slug][String(d.day)] })) }
      : t,
  );
}

const data = cache(() => ({
  trips: withExtras(load<Trip[]>("trips", []), load<DayExtras>("itinerary-extras", {})),
  posts: load<Post[]>("posts", []),
  pages: load<Page[]>("pages", []),
  team: load<TeamMember[]>("team", []),
  taxonomies: load<Taxonomies>("taxonomies", {
    destinations: [],
    activities: [],
    difficulty: [],
    tripTags: [],
    categories: [],
    tags: [],
  }),
  menu: load<MenuItem[]>("menu", []),
  photos: load<Record<string, Photo>>("photos", {}),
  community: load<CommunityPost[]>("community", []),
  about: load<AboutContent | null>("about", null),
  videos: load<Video[]>("videos", []),
  awards: load<Award[]>("awards", []),
  tripadvisor: load<TripadvisorFacts | null>("tripadvisor", null),
  imageCredits: load<Record<string, { title: string; author: string; license: string; licenseUrl: string | null; source: string }>>("image-credits", {}),
  tripInfo: load<Record<string, InfoOverrides>>("trip-info", {}),
  travellerPhotos: load<Record<string, (Img & { traveller: string; date?: string | null })[]>>("traveller-photos", {}),
  offers: load<Offer[]>("offers", []),
}));

export function toCard(t: Trip): TripCard {
  return {
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    days: t.days,
    destinations: t.destinations,
    activities: t.activities,
    difficulty: t.difficulty,
    price: t.price,
    maxAltitude: t.maxAltitude,
    cover: t.cover,
    rating: t.rating,
    groupSize: t.groupSize,
  };
}

export function toPostCard(p: Post): PostCard {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    published: p.published,
    cover: p.cover,
    categories: p.categories,
    readingMinutes: p.readingMinutes,
  };
}

/* ------------------------------------------------------------------ trips */

export const getTrips = () => data().trips;
export const getTripCards = () => data().trips.map(toCard);
export const getTrip = (slug: string) => data().trips.find((t) => t.slug === slug) ?? null;

export function getTripsIn(field: "destinations" | "activities", slug: string): TripCard[] {
  const tagged = data().trips.filter((t) => t[field].includes(slug));
  if (tagged.length) return tagged.map(toCard);
  // Some menu categories (Expedition in Nepal, Bhutan Trek) list their trips
  // in the WordPress menu without tagging them; use the menu's list.
  const base = field === "destinations" ? "/destinations/" : "/activities/";
  return tripSlugsUnder(`${base}${slug}/`)
    .map((s) => data().trips.find((t) => t.slug === s))
    .filter((t): t is Trip => Boolean(t))
    .map(toCard);
}

/* ------------------------------------------------------------------ menu */

export const getMenu = () => data().menu;

function findMenu(items: MenuItem[], href: string): MenuItem | null {
  for (const it of items) {
    if (it.href === href) return it;
    const hit = it.children ? findMenu(it.children, href) : null;
    if (hit) return hit;
  }
  return null;
}

/** Every trip linked anywhere under a menu entry, in menu order. */
export function tripSlugsUnder(href: string): string[] {
  const node = findMenu(data().menu, href);
  const out: string[] = [];
  const walk = (items: MenuItem[] = []) =>
    items.forEach((i) => {
      const m = i.href.match(/^\/trip\/([^/]+)\/$/);
      if (m && !out.includes(m[1])) out.push(m[1]);
      walk(i.children);
    });
  if (node) walk(node.children);
  return out;
}

/* ------------------------------------------------------------------ homepage lists */

type HomeLists = { featured: string[]; popular: string[]; luxury: string[] };
const homeLists = cache(() => load<HomeLists>("home", { featured: [], popular: [], luxury: [] }));

/** The live homepage's own trip lists, in the order the office set them. */
export function getHomeList(name: keyof HomeLists): TripCard[] {
  const trips = data().trips;
  return homeLists()[name]
    .map((s) => trips.find((t) => t.slug === s))
    .filter((t): t is Trip => Boolean(t))
    .map(toCard);
}

/**
 * One honest line about a destination or activity: the first sentence of its
 * WordPress description, or failing that the names of its first trips.
 */
export function termSummary(kind: "destinations" | "activities", slug: string) {
  const term = (kind === "destinations" ? data().taxonomies.destinations : data().taxonomies.activities).find((t) => t.slug === slug);
  const trips = getTripsIn(kind, slug);
  const text = (term?.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const first = text.match(/^(.{40,180}?[.!?])\s/)?.[1] ?? "";
  const names = trips.slice(0, 3).map((t) => t.title.replace(/\s*[-–]\s*\d+\s*Days?$/i, "")).join(" · ");
  const highest = Math.max(0, ...trips.map((t) => t.maxAltitude ?? 0));
  return { line: first || names, trips: trips.length, highest: highest || null };
}

/* ------------------------------------------------------------------ photos */

/** Hero photographs by slot (see scripts/prepare-photos.py). */
export function photo(slot: string): Photo {
  return data().photos[slot] ?? { src: "/photos/home-banner.webp", w: 1600, h: 1200, trip: null };
}

/** Trips handpicked for the homepage, in the order the office ranks them. */
/** The live homepage's "Featured Trips", in its order. */
export function getFeaturedTrips(): TripCard[] {
  return getHomeList("featured");
}

export function getRelatedTrips(trip: Trip, limit = 3): TripCard[] {
  const score = (t: Trip) =>
    t.destinations.filter((d) => trip.destinations.includes(d)).length * 3 +
    t.activities.filter((a) => trip.activities.includes(a)).length +
    (Math.abs(t.days - trip.days) <= 4 ? 1 : 0);
  return data()
    .trips.filter((t) => t.slug !== trip.slug)
    .map((t) => ({ t, s: score(t) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ t }) => toCard(t));
}

/* ------------------------------------------------------------------ about */

export type AboutContent = {
  h1: string;
  intro: string[];
  services: { title: string; href: string; photo: string; text: string | null }[];
  why: { title: string; icon: string; text: string }[];
};

/** "Trip information" for a trip: real values only, with the admin's overrides. */
export function getTripInfo(trip: Trip) {
  const region = trip.destinations[0] ? getDestination(trip.destinations[0])?.name : null;
  const activity = trip.activities[0] ? getActivity(trip.activities[0])?.name : null;
  return tripInfo(trip, { region, activity, overrides: data().tripInfo[trip.slug] });
}

export type TripadvisorFacts = { url: string; rating: number; reviews: number; ranking: string | null; breakdown: Record<string, number>; checked: string };

/** The Tripadvisor listing's figures, as last checked (admin). */
export const getTripadvisor = () => data().tripadvisor;

/** Awards, newest first. */
export const getAwards = () => [...data().awards].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

/** The company's videos: those for one trip, or the featured ones. */
export const getVideosForTrip = (slug: string) => data().videos.filter((v) => v.trips.includes(slug));
export const getFeaturedVideos = () => data().videos.filter((v) => v.featured);

/** Photos travellers sent from a trip, posted from the admin. */
export const getTravellerPhotos = (slug: string) => data().travellerPhotos[slug] ?? [];

/** The About page's own words, as written on the live site. */
export const getAbout = () => data().about;

/* -------------------------------------------------------------- community */

export const getCommunity = () => [...data().community].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

/* ----------------------------------------------------------------- offers */

/** The festival offer running today, if the admin has switched one on. */
export function getActiveOffer(now = new Date()): Offer | null {
  const day = now.toISOString().slice(0, 10);
  return data().offers.find((o) => o.active && (!o.starts || o.starts <= day) && (!o.ends || o.ends >= day)) ?? null;
}

/** Trips on offer: the festival's own list, or every trip with a reduced price. */
export function getOfferTrips(offer: Offer | null): TripCard[] {
  const cards = getTripCards();
  if (offer?.trips.length) return offer.trips.map((s) => cards.find((c) => c.slug === s)).filter((c): c is TripCard => Boolean(c));
  const saving = (c: TripCard) => (c.price?.regular ? c.price.regular - c.price.amount : 0);
  return cards.filter((c) => saving(c) > 0).sort((a, b) => saving(b) - saving(a));
}

/** Photographs from Wikimedia Commons used on the site, with their credits. */
export const getPhotoCredits = () => [
  ...Object.entries(data().photos)
    .filter(([, p]) => p.credit)
    .map(([slot, p]) => ({ slot, src: p.src, credit: p.credit! })),
  // Free-licence photos used elsewhere, e.g. on community posts until the company's own are added.
  ...Object.entries(data().imageCredits).map(([src, credit]) => ({ slot: src, src, credit })),
];

export function getAllReviews() {
  return data()
    .trips.flatMap((t) => t.reviews.map((r) => ({ ...r, trip: { slug: t.slug, title: t.title } })))
    .filter((r) => r.body.length > 60);
}

/* ------------------------------------------------------------------ posts */

export const getPosts = () => data().posts;
export const getPostCards = () => data().posts.map(toPostCard);
export const getPost = (slug: string) => data().posts.find((p) => p.slug === slug) ?? null;

export function getPostsInCategory(slug: string): PostCard[] {
  const { categories } = data().taxonomies;
  const term = categories.find((c) => c.slug === slug);
  // A parent category also lists its children's posts, as WordPress did.
  const family = new Set([slug, ...categories.filter((c) => term && c.parent === term.id).map((c) => c.slug)]);
  return data()
    .posts.filter((p) => p.categories.some((c) => family.has(c)))
    .map(toPostCard);
}

export function getRelatedPosts(post: Post, limit = 3): PostCard[] {
  return data()
    .posts.filter((p) => p.slug !== post.slug && p.categories.some((c) => post.categories.includes(c)))
    .slice(0, limit)
    .map(toPostCard);
}

/** Guides that mention a region, for the trip and destination pages. */
const REGION_CATEGORY: Record<string, string> = {
  "everest-region": "everest-trekking-guide",
  "annapurna-region": "annapurna-trekking-guide",
  "langtang-region": "langtang-trekking-guide",
  "manaslu-region": "manaslu-trekking-guide",
  "remote-area-trekking": "remote-trekking-guide",
};

export function getGuidesForRegion(region: string, limit = 3): PostCard[] {
  const cat = REGION_CATEGORY[region];
  return cat ? getPostsInCategory(cat).slice(0, limit) : [];
}

/* ------------------------------------------------------------------ pages, team, terms */

export const getPages = () => data().pages;
export const getPage = (slug: string) => data().pages.find((p) => p.slug === slug) ?? null;
export const getTeam = () => data().team;
export const getMember = (slug: string) => data().team.find((m) => m.slug === slug) ?? null;
export const getTaxonomies = () => data().taxonomies;

export function getDestination(slug: string) {
  return data().taxonomies.destinations.find((d) => d.slug === slug) ?? null;
}
export function getActivity(slug: string) {
  return data().taxonomies.activities.find((d) => d.slug === slug) ?? null;
}
export function getCategory(slug: string) {
  return data().taxonomies.categories.find((d) => d.slug === slug) ?? null;
}

/** Destinations and activities that actually have trips, for menus and filters. */
export function getLiveTerms() {
  const trips = data().trips;
  const { destinations, activities } = data().taxonomies;
  const withCount = <T extends { slug: string }>(terms: T[], field: "destinations" | "activities") =>
    terms
      .map((t) => ({ ...t, trips: trips.filter((x) => x[field].includes(t.slug)).length }))
      .filter((t) => t.trips > 0);
  // Activities that only exist as menu categories still get a page.
  const menuCount = (slug: string) => tripSlugsUnder(`/activities/${slug}/`).length;
  return {
    destinations: withCount(destinations, "destinations"),
    activities: activities
      .map((t) => {
        const tagged = trips.filter((x) => x.activities.includes(t.slug)).length;
        return { ...t, trips: tagged || menuCount(t.slug) };
      })
      .filter((t) => t.trips > 0),
  };
}

/* ---------------------------------------------------------------- reviews */

const TRIPADVISOR_URL = "https://www.tripadvisor.com/Attraction_Review-g293890-d2437309-Reviews-Base_Camp_Adventure-Kathmandu_Kathmandu_Valley_Bagmati_Zone_Central_Region.html";

/** Traveller video reviews, in the office's order; hidden ones left out. */
export const getVideoReviews = () => load<VideoReview[]>("video-reviews", []).filter((v) => !v.hidden);
export const getGoogleReviews = () => load<GoogleReviews>("google-reviews", { business: "", website: "", placeId: "", url: "", sourceUrl: "", checked: "", reviews: [] } as unknown as GoogleReviews);
export const getTrustindexReviews = () => load<TrustindexReviews>("trustindex-reviews", { business: "", url: "", rating: 0, totalReviews: 0, checked: "", reviews: [] } as unknown as TrustindexReviews);

export function getReviewSources(): ReviewSourcesData {
  return {
    videoReviews: getVideoReviews(),
    google: getGoogleReviews(),
    trustindex: getTrustindexReviews(),
    tripadvisorUrl: data().tripadvisor?.url ?? TRIPADVISOR_URL,
  };
}

/** A trip's packing list (admin → Trips → Equipment). */
export const getEquipment = (slug: string) => load<Record<string, EquipmentList>>("equipment", {})[slug] ?? null;

/* -------------------------------------------------------------- redirects */

/**
 * Redirects made in the admin (including the automatic ones when a page's
 * address changes). Checked before a page answers "not found".
 */
export function findRedirect(pathname: string): { to: string; permanent: boolean } | null {
  const list = load<{ from: string; to: string; permanent: boolean }[]>("redirects", []);
  const want = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const hit = list.find((r) => r.from === pathname || r.from === want);
  return hit ? { to: hit.to, permanent: hit.permanent } : null;
}

/** Public settings from the admin (chat widget, analytics…). */
export const getPublicSettings = () => load<Record<string, unknown>>("settings", {});
