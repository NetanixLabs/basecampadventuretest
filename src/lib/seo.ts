import type { Metadata } from "next";
import { site } from "@/lib/site";
import googleListing from "@/content/google-reviews.json";
import type { Img, Post, Seo, Trip } from "@/lib/types";

export const abs = (path: string) => (path.startsWith("http") ? path : `${site.url}${path.startsWith("/") ? "" : "/"}${path}`);

/** Yoast titles carry " - Base Camp Adventure"; the root template adds it back. */
/** The page's own title, without the company name or WordPress's automatic " Archives". */
export function bareTitle(title: string | null | undefined) {
  return (title ?? "")
    .replace(/\s*[-|–]\s*Base Camp Adventure\s*$/i, "")
    .replace(/\s+Archives$/i, "")
    .trim();
}

/** The exact <title> a page gets: the company name is added when it fits. */
export function fullTitle(seoTitle: string | null | undefined, title: string) {
  const t = bareTitle(seoTitle) || title;
  const branded = `${t} | ${site.name}`;
  // Google shows about 60 characters; add the brand only when it still fits.
  return branded.length <= 62 ? branded : t;
}

/** Search results show about 160 characters: cut longer text at a word, with an ellipsis. */
function clip(text: string, max = 160) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[\s,;:.–-]+$/, "")}…`;
}

/**
 * Page metadata. Imported Yoast values win, so titles and descriptions that
 * rank today are carried over word for word.
 */
export function meta({
  path,
  title,
  description,
  seo,
  image,
  type = "website",
  published,
  modified,
  lead,
  price,
}: {
  path: string;
  title: string;
  description?: string | null;
  seo?: Seo | null;
  image?: Img | string | null;
  type?: "website" | "article";
  published?: string | null;
  modified?: string | null;
  /** Put first in the description, e.g. "14 days from US$1,249 · 5.0★ (6 reviews)." */
  lead?: string | null;
  /** Price for Open Graph product tags (Facebook, WhatsApp and Pinterest previews). */
  price?: number | null;
}): Metadata {
  const finalTitle = bareTitle(seo?.title) || title;
  // (fullTitle() below gives the same result; kept in one place for the admin's SEO check.)
  const base = seo?.description || description || site.description;
  const finalDescription = clip(lead ? `${lead} ${base}` : base);
  const imgSrc = typeof image === "string" ? image : image?.src;
  const og = imgSrc ?? "/photos/home-banner.webp";
  return {
    title: { absolute: fullTitle(seo?.title, title) },
    description: finalDescription,
    alternates: { canonical: abs(path) },
    robots: seo?.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      url: abs(path),
      siteName: site.name,
      title: finalTitle,
      description: finalDescription,
      images: [{ url: abs(og) }],
      ...(type === "article" ? { publishedTime: published ?? undefined, modifiedTime: modified ?? undefined } : {}),
    },
    twitter: { card: "summary_large_image", title: finalTitle, description: finalDescription, images: [abs(og)] },
    ...(price ? { other: { "product:price:amount": String(price), "product:price:currency": "USD" } } : {}),
  };
}

/* ------------------------------------------------------------------ JSON-LD */

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "LocalBusiness"],
    "@id": `${site.url}/#organization`,
    name: site.name,
    legalName: site.legalName,
    url: `${site.url}/`,
    logo: abs("/brand/logo-512.png"),
    image: abs("/photos/home-banner.webp"),
    description: site.description,
    foundingDate: String(site.founded),
    telephone: site.phone,
    email: site.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    // Social profiles plus the Google Maps listing, so search engines connect the site to the business profile and its reviews.
    sameAs: [...Object.values(site.social), googleListing.placeId ? `https://www.google.com/maps/place/?q=place_id:${googleListing.placeId}` : null].filter((u): u is string => Boolean(u)),
    areaServed: ["Nepal", "Bhutan", "Tibet"],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: `${site.url}/`,
    name: site.name,
    publisher: { "@id": `${site.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.url}/trip/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

/** "14 days from US$1,249 · 5.0★ (6 reviews)." — leads the trip's search snippet. */
export function tripLead(trip: Pick<Trip, "days" | "price" | "rating">) {
  const parts = [`${trip.days} ${trip.days === 1 ? "day" : "days"}${trip.price ? ` from US$${trip.price.amount.toLocaleString("en-US")}` : ""}`];
  if (trip.rating?.count) parts.push(`${trip.rating.value.toFixed(1)}★ (${trip.rating.count} ${trip.rating.count === 1 ? "review" : "reviews"})`);
  return `${parts.join(" · ")}.`;
}

/** The trip's price as a schema.org Offer: today's price, the regular price struck through. */
export function tripOffer(trip: Pick<Trip, "slug" | "price">) {
  if (!trip.price) return undefined;
  const url = abs(`/trip/${trip.slug}/`);
  const validUntil = `${new Date().getFullYear() + 1}-12-31`;
  const p = trip.price;
  return {
    "@type": "Offer",
    url,
    price: p.amount,
    priceCurrency: "USD",
    priceValidUntil: validUntil,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": `${site.url}/#organization` },
    priceSpecification: [
      { "@type": "UnitPriceSpecification", price: p.amount, priceCurrency: "USD" },
      ...(p.regular && p.regular > p.amount
        ? [{ "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: p.regular, priceCurrency: "USD" }]
        : []),
    ],
  };
}

/** "Peter D-Cornwall, United Kingdom" → "Peter D". */
const reviewer = (author: string) => (author.match(/^(.+?)-[A-Z][^-]*,/)?.[1] ?? author.split(",")[0]).trim();
const isoDate = (d: string | null) => {
  const t = d ? Date.parse(d) : NaN;
  return Number.isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10);
};

/** A photograph as schema.org ImageObject, credited to Base Camp Adventure. */
export function imageLd(img: Img) {
  return {
    "@type": "ImageObject",
    contentUrl: abs(img.src),
    url: abs(img.src),
    width: img.w,
    height: img.h,
    caption: img.alt || undefined,
    creator: { "@type": "Organization", name: site.name, url: `${site.url}/` },
    creditText: site.name,
    copyrightNotice: `© ${site.legalName}`,
    copyrightHolder: { "@id": `${site.url}/#organization` },
  };
}

export function tripLd(trip: Trip) {
  const url = abs(`/trip/${trip.slug}/`);
  const images = [trip.cover, ...trip.gallery].filter(Boolean).slice(0, 6).map((i) => abs((i as Img).src));
  const offer = tripOffer(trip);
  const reviews = trip.reviews.slice(0, 6).map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: reviewer(r.author) },
    datePublished: isoDate(r.date),
    name: r.title ?? undefined,
    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    reviewBody: r.body,
  }));
  const rating = trip.rating
    ? { "@type": "AggregateRating", ratingValue: trip.rating.value, reviewCount: trip.rating.count, bestRating: 5, worstRating: 1 }
    : undefined;

  return [
    // The page itself, with its dates, so search engines and AI answers can see the information is current.
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: trip.title,
      ...(trip.published ? { datePublished: isoDate(trip.published) } : {}),
      ...(trip.modified || trip.published ? { dateModified: isoDate(trip.modified ?? trip.published) } : {}),
      inLanguage: "en",
      isPartOf: { "@id": `${site.url}/#website` },
      about: { "@id": `${url}#trip` },
      ...(images[0] ? { primaryImageOfPage: { "@type": "ImageObject", url: images[0] } } : {}),
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      "@id": `${url}#trip`,
      name: trip.title,
      description: trip.summary,
      url,
      image: images,
      touristType: trip.activities.includes("nepal-peak-climbing") ? "Mountaineers" : "Trekkers",
      provider: { "@id": `${site.url}/#organization` },
      itinerary: trip.itinerary.length
        ? {
            "@type": "ItemList",
            numberOfItems: trip.itinerary.length,
            itemListElement: trip.itinerary.map((d) => ({
              "@type": "ListItem",
              position: d.day,
              item: { "@type": "TouristAttraction", name: d.title },
            })),
          }
        : undefined,
      offers: offer,
    },
    // Product (price and stars in search results) only when there is a price
    // or a review to show; Google rejects a Product with neither.
    ...(offer || rating || reviews.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": `${url}#product`,
            name: trip.title,
            description: trip.summary,
            image: images,
            sku: trip.code ?? String(trip.id),
            url,
            category: "Travel > Tours > Trekking",
            brand: { "@type": "Brand", name: site.name },
            offers: offer,
            aggregateRating: rating,
            review: reviews.length ? reviews : undefined,
          },
        ]
      : []),
    ...(trip.faqs.length ? [faqLd(trip.faqs)] : []),
    {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      "@id": `${url}#gallery`,
      name: `${trip.title} photos`,
      url: `${url}#gallery`,
      associatedMedia: [trip.cover, ...trip.gallery]
        .filter((x, i, a): x is Img => Boolean(x) && a.findIndex((y) => y?.src === x?.src) === i)
        .slice(0, 30)
        .map((im) => imageLd(im)),
    },
  ];
}

/** VideoObject, so the videos can appear in Google's video results. */
export function videoLd(v: { id: string; title: string; description: string | null; uploadDate: string | null; duration: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.title,
    description: v.description || v.title,
    thumbnailUrl: [`https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`],
    uploadDate: v.uploadDate ?? undefined,
    duration: v.duration ?? undefined,
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`,
    contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
    publisher: { "@id": `${site.url}/#organization` },
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() },
    })),
  };
}

export function articleLd(post: Post) {
  const url = abs(`/${post.slug}/`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.seo.description ?? post.excerpt,
    image: post.cover ? [abs(post.cover.src)] : undefined,
    datePublished: post.published,
    dateModified: post.modified ?? post.published,
    author: { "@type": "Person", name: post.author, url: abs("/our-team/") },
    publisher: { "@id": `${site.url}/#organization` },
    mainEntityOfPage: url,
    wordCount: post.html.replace(/<[^>]+>/g, " ").split(/\s+/).length,
  };
}

export function itemListLd(name: string, paths: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: paths.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(p) })),
  };
}
