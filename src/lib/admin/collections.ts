/**
 * What the office can edit, described once.
 *
 * Every content type is a list of fields. The admin builds its forms from
 * these descriptions, so adding a field here adds it to the editor; the
 * public site keeps reading exactly the same shapes it always has
 * (src/lib/types.ts). This file is plain data so it can be sent to the
 * browser.
 */

export type Option = { value: string; label: string };

/** Lists the editor fills from live data (all trips, all categories…). */
export type OptionSource = "trips" | "destinations" | "activities" | "categories" | "tags" | "difficulty" | "tripTags" | "team";

type Base = { name: string; label: string; help?: string; required?: boolean; wide?: boolean };

export type Field =
  | (Base & { type: "text"; placeholder?: string; max?: number; mono?: boolean })
  | (Base & { type: "textarea"; rows?: number; max?: number })
  | (Base & { type: "richtext"; minimal?: boolean })
  | (Base & { type: "number"; min?: number; max?: number; step?: number; suffix?: string })
  | (Base & { type: "toggle" })
  | (Base & { type: "date" })
  | (Base & { type: "select"; options?: Option[]; source?: OptionSource; allowEmpty?: boolean })
  | (Base & { type: "multiselect"; options?: Option[]; source?: OptionSource; ordered?: boolean })
  | (Base & { type: "image"; folder?: string })
  | (Base & { type: "gallery"; folder?: string })
  | (Base & { type: "strings"; itemLabel?: string; placeholder?: string })
  | (Base & { type: "repeater"; itemLabel: string; titleField?: string; fields: Field[]; collapsed?: boolean })
  | (Base & { type: "group"; fields: Field[] })
  | (Base & { type: "seo" })
  | (Base & { type: "json"; rows?: number });

export type Section = { title: string; description?: string; fields: Field[] };

export type CollectionDef = {
  key: string;
  label: string;
  singular: string;
  /** Snapshot file the public site reads (src/content/<file>.json). */
  file: string;
  /** For grouped files such as taxonomies.json: the key inside that file. */
  fileKey?: string;
  /** Public address of one entry; {slug} is replaced. Null when it has no page. */
  url: string | null;
  /** Which field is the slug (defaults to "slug"). */
  slugField?: string;
  titleField?: string;
  /** Shown as columns in the list, after the title. */
  columns?: { name: string; label: string; kind?: "money" | "date" | "list" | "count" | "bool" }[];
  sections: Section[];
  /** What a brand new entry starts with. */
  blank: Record<string, unknown>;
  description?: string;
};

const seoSection: Section = {
  title: "Search engines & sharing",
  description: "How this page looks in Google and when shared on WhatsApp or Facebook. Leave empty to use the title and summary.",
  fields: [{ name: "seo", label: "SEO", type: "seo" }],
};

const img = { src: "", w: 0, h: 0, alt: "" };
const emptySeo = { title: null, description: null, ogImage: null, noindex: false };

const MEALS: Option[] = ["breakfast", "lunch", "dinner"].map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }));

/* ----------------------------------------------------------------- trips */

const trips: CollectionDef = {
  key: "trips",
  label: "Trips",
  singular: "trip",
  file: "trips",
  url: "/trip/{slug}/",
  description: "Treks, tours, climbs and expeditions. Everything on a trip page is edited here.",
  columns: [
    { name: "days", label: "Days", kind: "count" },
    { name: "price.amount", label: "Price", kind: "money" },
    { name: "destinations", label: "Region", kind: "list" },
  ],
  blank: {
    id: 0, slug: "", code: null, title: "", summary: "", seo: emptySeo, published: null, modified: null,
    days: 1, nights: 0, destinations: [], activities: [], difficulty: null, tags: [],
    price: null, groupSize: { min: 1, max: null }, maxAltitude: null, facts: [], cover: null, gallery: [], map: null,
    overview: "", toc: [], highlights: [], itinerary: [], includes: [], excludes: [], sections: [], faqs: [], rating: null, reviews: [],
    equipment: [],
  },
  sections: [
    {
      title: "Basics",
      fields: [
        { name: "title", label: "Trip name", type: "text", required: true, wide: true, placeholder: "Everest Base Camp Trek - 14 Days" },
        { name: "slug", label: "Web address", type: "text", required: true, mono: true, help: "basecampadventure.com/trip/… Changing it later keeps the old address working (an automatic redirect)." },
        { name: "code", label: "Trip code", type: "text", help: "Optional internal reference, e.g. EBC14." },
        { name: "summary", label: "Short summary", type: "textarea", rows: 3, max: 320, wide: true, help: "One or two sentences, shown on trip cards and in search results." },
      ],
    },
    {
      title: "Key facts",
      fields: [
        { name: "days", label: "Days", type: "number", min: 1, max: 90, required: true },
        { name: "nights", label: "Nights", type: "number", min: 0, max: 90 },
        { name: "maxAltitude", label: "Highest point", type: "number", min: 0, max: 9000, suffix: "m" },
        { name: "difficulty", label: "Difficulty", type: "select", source: "difficulty", allowEmpty: true },
        { name: "groupSize.min", label: "Group size from", type: "number", min: 1, max: 50 },
        { name: "groupSize.max", label: "Group size up to", type: "number", min: 1, max: 100, help: "Leave empty for no maximum." },
        { name: "destinations", label: "Regions", type: "multiselect", source: "destinations", wide: true },
        { name: "activities", label: "Activities", type: "multiselect", source: "activities", wide: true },
        { name: "tags", label: "Trip tags", type: "multiselect", source: "tripTags", wide: true },
        {
          name: "facts", label: "Fact list (top of the page)", type: "repeater", itemLabel: "fact", titleField: "label", wide: true,
          fields: [
            { name: "label", label: "Label", type: "text", placeholder: "Accommodation" },
            { name: "value", label: "Value", type: "text", placeholder: "Teahouse / lodge" },
          ],
        },
      ],
    },
    {
      title: "Price",
      description: "Prices are per person in US dollars. Bookings are always priced on the server from these numbers.",
      fields: [
        {
          name: "wetravelUrl", label: "WeTravel checkout link (optional)", type: "text", mono: true, wide: true, placeholder: "https://www.wetravel.com/trips/…",
          help: "Where the Pay button sends travellers when the WeTravel API key isn't set on the server. With the key, each booking gets its own WeTravel checkout with the exact price (including discount codes) and this link isn't needed.",
        },
        {
          name: "price", label: "Price", type: "group", wide: true,
          fields: [
            { name: "amount", label: "Price per person", type: "number", min: 0, step: 1, suffix: "USD" },
            { name: "regular", label: "Was (crossed-out) price", type: "number", min: 0, step: 1, suffix: "USD", help: "Optional. Shows a saving badge." },
            { name: "minPax", label: "Minimum travellers", type: "number", min: 1 },
            {
              name: "groupTiers", label: "Group prices", type: "repeater", itemLabel: "group price", wide: true,
              help: "Lower prices for bigger groups, e.g. 2–5 people $1,250 each.",
              fields: [
                { name: "from", label: "From (people)", type: "number", min: 1 },
                { name: "to", label: "To (people)", type: "number", min: 1, help: "Empty = and more" },
                { name: "price", label: "Price each", type: "number", min: 0, suffix: "USD" },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Photos",
      fields: [
        { name: "cover", label: "Main photo", type: "image", folder: "trips", wide: true, help: "Wide landscape photos work best (at least 1600 px wide)." },
        { name: "gallery", label: "Gallery", type: "gallery", folder: "trips", wide: true, help: "Drag to reorder. The first photos are shown in the slider." },
        { name: "map", label: "Route map", type: "image", folder: "trips", wide: true },
      ],
    },
    {
      title: "Overview",
      fields: [
        { name: "overview", label: "Overview", type: "richtext", wide: true },
        { name: "highlights", label: "Highlights", type: "strings", itemLabel: "highlight", wide: true, placeholder: "Sunrise over Everest from Kala Patthar" },
      ],
    },
    {
      title: "Day-by-day itinerary",
      fields: [
        {
          name: "itinerary", label: "Days", type: "repeater", itemLabel: "day", titleField: "title", collapsed: true, wide: true,
          fields: [
            { name: "day", label: "Day number", type: "number", min: 1 },
            { name: "title", label: "Title", type: "text", wide: true, placeholder: "Fly to Lukla and trek to Phakding" },
            { name: "altitude", label: "Overnight altitude", type: "number", suffix: "m" },
            { name: "hours", label: "Walking time", type: "number", step: 0.5, suffix: "hours" },
            { name: "distanceKm", label: "Distance", type: "number", step: 0.1, suffix: "km" },
            { name: "overnight", label: "Overnight at", type: "text", placeholder: "Phakding" },
            { name: "accommodation", label: "Stay", type: "text", placeholder: "Teahouse" },
            { name: "meals", label: "Meals", type: "multiselect", options: MEALS },
            { name: "html", label: "What happens", type: "richtext", minimal: true, wide: true },
            { name: "images", label: "Photos of this day", type: "gallery", folder: "trips", wide: true },
          ],
        },
      ],
    },
    {
      title: "Included & not included",
      fields: [
        { name: "includes", label: "Included", type: "strings", itemLabel: "item", wide: true },
        { name: "excludes", label: "Not included", type: "strings", itemLabel: "item", wide: true },
      ],
    },
    {
      title: "More sections",
      description: "Extra sections on the trip page, e.g. Best time to go, Permits, Difficulty.",
      fields: [
        {
          name: "sections", label: "Sections", type: "repeater", itemLabel: "section", titleField: "title", collapsed: true, wide: true,
          fields: [
            { name: "title", label: "Heading", type: "text", wide: true },
            { name: "html", label: "Text", type: "richtext", wide: true },
          ],
        },
        {
          name: "faqs", label: "Frequently asked questions", type: "repeater", itemLabel: "question", titleField: "q", collapsed: true, wide: true,
          help: "Shown on the page and given to Google as FAQ results.",
          fields: [
            { name: "q", label: "Question", type: "text", wide: true },
            { name: "a", label: "Answer", type: "richtext", minimal: true, wide: true },
          ],
        },
        {
          name: "equipment", label: "Packing list", type: "repeater", itemLabel: "item", titleField: "name", collapsed: true, wide: true,
          fields: [
            { name: "name", label: "Item", type: "text" },
            { name: "category", label: "Group", type: "text", placeholder: "Trail essentials" },
            { name: "description", label: "Why", type: "text", wide: true },
            { name: "image", label: "Picture (path)", type: "text", mono: true, wide: true },
          ],
        },
      ],
    },
    {
      title: "Traveller reviews",
      fields: [
        {
          name: "rating", label: "Rating summary", type: "group", wide: true,
          fields: [
            { name: "value", label: "Average stars", type: "number", min: 0, max: 5, step: 0.1 },
            { name: "count", label: "Number of reviews", type: "number", min: 0 },
          ],
        },
        {
          name: "reviews", label: "Reviews", type: "repeater", itemLabel: "review", titleField: "author", collapsed: true, wide: true,
          fields: [
            { name: "author", label: "Name", type: "text" },
            { name: "rating", label: "Stars", type: "number", min: 1, max: 5 },
            { name: "date", label: "Date", type: "date" },
            { name: "title", label: "Title", type: "text", wide: true },
            { name: "body", label: "Review", type: "textarea", rows: 4, wide: true },
          ],
        },
      ],
    },
    seoSection,
  ],
};

/* ----------------------------------------------------------------- posts */

const posts: CollectionDef = {
  key: "posts",
  label: "Blog",
  singular: "article",
  file: "posts",
  url: "/{slug}/",
  description: "Trekking guides and travel articles.",
  columns: [
    { name: "categories", label: "Category", kind: "list" },
    { name: "published", label: "Published", kind: "date" },
  ],
  blank: { id: 0, slug: "", title: "", excerpt: "", html: "", toc: [], published: null, modified: null, cover: null, categories: [], tags: [], author: "Base Camp Adventure", readingMinutes: 1, seo: emptySeo },
  sections: [
    {
      title: "Article",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, wide: true },
        { name: "slug", label: "Web address", type: "text", required: true, mono: true, help: "basecampadventure.com/… Keep it short, with the main keyword." },
        { name: "author", label: "Author", type: "text" },
        { name: "html", label: "Content", type: "richtext", wide: true },
      ],
    },
    {
      title: "Card & listing",
      fields: [
        { name: "cover", label: "Cover photo", type: "image", folder: "blog", wide: true },
        { name: "excerpt", label: "Excerpt", type: "textarea", rows: 3, max: 320, wide: true, help: "Shown on the blog page and article cards." },
        { name: "categories", label: "Categories", type: "multiselect", source: "categories", wide: true },
        { name: "tags", label: "Tags", type: "multiselect", source: "tags", wide: true },
        { name: "published", label: "Publish date", type: "date", help: "Shown on the article. Set automatically on first publish." },
      ],
    },
    seoSection,
  ],
};

/* ----------------------------------------------------------------- pages */

const pages: CollectionDef = {
  key: "pages",
  label: "Pages",
  singular: "page",
  file: "pages",
  url: "/{slug}/",
  description: "Information pages: terms, travel info, visas, FAQs…",
  blank: { id: 0, slug: "", parent: null, title: "", html: "", toc: [], excerpt: "", modified: null, cover: null, seo: emptySeo },
  sections: [
    {
      title: "Page",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, wide: true },
        { name: "slug", label: "Web address", type: "text", required: true, mono: true },
        { name: "cover", label: "Header photo", type: "image", folder: "pages", wide: true },
        { name: "excerpt", label: "Summary", type: "textarea", rows: 2, wide: true },
        { name: "html", label: "Content", type: "richtext", wide: true },
      ],
    },
    seoSection,
  ],
};

/* ------------------------------------------------------------------ team */

const team: CollectionDef = {
  key: "team",
  label: "Team",
  singular: "team member",
  file: "team",
  url: "/team/{slug}/",
  titleField: "name",
  columns: [{ name: "role", label: "Role" }],
  blank: { slug: "", name: "", role: "", photo: null, bio: "", excerpt: "" },
  sections: [
    {
      title: "Profile",
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "slug", label: "Web address", type: "text", required: true, mono: true },
        { name: "role", label: "Role", type: "text", placeholder: "Senior trekking guide" },
        { name: "photo", label: "Photo", type: "image", folder: "team", wide: true },
        { name: "excerpt", label: "One-line introduction", type: "textarea", rows: 2, wide: true },
        { name: "bio", label: "Biography", type: "richtext", wide: true },
      ],
    },
  ],
};

/* ------------------------------------------------------------- taxonomies */

const term = (key: string, label: string, singular: string, url: string | null, description?: string, withPage = false): CollectionDef => ({
  key,
  label,
  singular,
  file: "taxonomies",
  fileKey: key,
  url,
  titleField: "name",
  description,
  columns: [{ name: "count", label: "Used by", kind: "count" }],
  blank: { id: 0, slug: "", name: "", count: 0, parent: null, description: "", seo: emptySeo, kind: key },
  sections: [
    {
      title: singular[0].toUpperCase() + singular.slice(1),
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "slug", label: "Web address", type: "text", required: true, mono: true },
        ...(withPage ? [{ name: "description", label: "Introduction", type: "richtext", wide: true } as Field] : []),
      ],
    },
    ...(withPage ? [seoSection] : []),
  ],
});

const destinations = term("destinations", "Destinations", "destination", "/destinations/{slug}/", "Regions such as Everest, Annapurna, Bhutan and Tibet.", true);
const activities = term("activities", "Activities", "activity", "/activities/{slug}/", "Trekking, tours, peak climbing, rafting…", true);
const categories = term("categories", "Blog categories", "category", "/category/{slug}/", undefined, true);
const tags = term("tags", "Blog tags", "tag", null);
const difficulty = term("difficulty", "Difficulty levels", "difficulty level", null);
const tripTags = term("tripTags", "Trip tags", "trip tag", null);

/* ---------------------------------------------------------------- offers */

const offers: CollectionDef = {
  key: "offers",
  label: "Offers",
  singular: "offer",
  file: "offers",
  url: null,
  description: "Festival and seasonal offers shown on the website. Discount codes for bookings are under Customers → Discount codes.",
  columns: [
    { name: "percent", label: "%", kind: "count" },
    { name: "starts", label: "From", kind: "date" },
    { name: "ends", label: "Until", kind: "date" },
    { name: "active", label: "On", kind: "bool" },
  ],
  blank: { slug: "", title: "", festival: "", summary: "", code: null, percent: null, starts: null, ends: null, trips: [], active: false },
  sections: [
    {
      title: "Offer",
      fields: [
        { name: "title", label: "Headline", type: "text", required: true, wide: true, placeholder: "Dashain special: 10% off Everest treks" },
        { name: "slug", label: "Reference", type: "text", required: true, mono: true },
        { name: "festival", label: "Festival / season", type: "text", placeholder: "Dashain" },
        { name: "summary", label: "Text", type: "textarea", rows: 3, wide: true },
        { name: "percent", label: "Discount", type: "number", min: 0, max: 100, suffix: "%" },
        { name: "code", label: "Discount code to show", type: "text", mono: true, help: "Create the code itself under Discount codes." },
        { name: "starts", label: "Starts", type: "date" },
        { name: "ends", label: "Ends", type: "date" },
        { name: "active", label: "Switched on", type: "toggle" },
        { name: "trips", label: "Trips on offer", type: "multiselect", source: "trips", ordered: true, wide: true, help: "Empty = every trip with a reduced price." },
      ],
    },
  ],
};

/* ------------------------------------------------------- videos & reviews */

const videos: CollectionDef = {
  key: "videos",
  label: "YouTube videos",
  singular: "video",
  file: "videos",
  url: null,
  slugField: "id",
  columns: [{ name: "featured", label: "Homepage", kind: "bool" }],
  blank: { id: "", title: "", description: null, uploadDate: null, duration: null, trips: [], featured: false },
  sections: [
    {
      title: "Video",
      fields: [
        { name: "id", label: "YouTube video ID", type: "text", required: true, mono: true, help: "The part after watch?v= in the YouTube link." },
        { name: "title", label: "Title", type: "text", required: true, wide: true },
        { name: "description", label: "Description", type: "textarea", rows: 3, wide: true },
        { name: "uploadDate", label: "Upload date", type: "date" },
        { name: "duration", label: "Length", type: "text", placeholder: "PT3M12S", help: "For Google: PT3M12S means 3 minutes 12 seconds." },
        { name: "featured", label: "Show on the homepage", type: "toggle" },
        { name: "trips", label: "Show on these trips", type: "multiselect", source: "trips", wide: true },
      ],
    },
  ],
};

const videoReviews: CollectionDef = {
  key: "videoReviews",
  label: "Video reviews",
  singular: "video review",
  file: "video-reviews",
  url: null,
  slugField: "id",
  description: "Portrait videos from travellers, shown in the homepage carousel and on the reviews page.",
  columns: [{ name: "hidden", label: "Hidden", kind: "bool" }],
  blank: { id: "", title: "", src: "", poster: "", hidden: false },
  sections: [
    {
      title: "Video review",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, wide: true, placeholder: "Sarah from Australia on Everest Base Camp" },
        { name: "id", label: "Reference", type: "text", required: true, mono: true },
        { name: "src", label: "Video file (MP4)", type: "text", mono: true, wide: true, help: "Upload in the Media library (videos), then paste its address here." },
        { name: "poster", label: "Still image shown before playing", type: "text", mono: true, wide: true },
        { name: "hidden", label: "Hide from the website", type: "toggle" },
      ],
    },
  ],
};

const awards: CollectionDef = {
  key: "awards",
  label: "Awards",
  singular: "award",
  file: "awards",
  url: null,
  columns: [{ name: "year", label: "Year", kind: "count" }],
  blank: { slug: "", title: "", issuer: "", year: null, image: null, href: null },
  sections: [
    {
      title: "Award",
      fields: [
        { name: "title", label: "Award", type: "text", required: true, wide: true, placeholder: "Travellers' Choice" },
        { name: "slug", label: "Reference", type: "text", required: true, mono: true },
        { name: "issuer", label: "Given by", type: "text", placeholder: "Tripadvisor" },
        { name: "year", label: "Year", type: "number", min: 2000, max: 2100 },
        { name: "image", label: "Badge image (path)", type: "text", mono: true, wide: true },
        { name: "href", label: "Link", type: "text", wide: true },
      ],
    },
  ],
};

const community: CollectionDef = {
  key: "community",
  label: "Community work",
  singular: "story",
  file: "community",
  url: "/community/",
  columns: [{ name: "kind", label: "Type" }, { name: "date", label: "Date", kind: "date" }],
  blank: { slug: "", title: "", kind: "Community", place: "", date: null, summary: "", html: "", photos: [], partners: [] },
  sections: [
    {
      title: "Story",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, wide: true },
        { name: "slug", label: "Reference", type: "text", required: true, mono: true },
        { name: "kind", label: "Type", type: "select", options: ["Relief", "Sponsorship", "Community", "Environment"].map((v) => ({ value: v, label: v })) },
        { name: "place", label: "Place", type: "text" },
        { name: "date", label: "Date", type: "date" },
        { name: "summary", label: "Summary", type: "textarea", rows: 2, wide: true },
        { name: "html", label: "Story", type: "richtext", wide: true },
        { name: "photos", label: "Photos", type: "gallery", folder: "community", wide: true },
        { name: "partners", label: "Partners", type: "strings", itemLabel: "partner", wide: true },
      ],
    },
  ],
};

export const COLLECTIONS: CollectionDef[] = [trips, posts, pages, team, destinations, activities, categories, tags, difficulty, tripTags, offers, videos, videoReviews, awards, community];

export const collection = (key: string) => COLLECTIONS.find((c) => c.key === key) ?? null;

export const TAXONOMY_KEYS = ["destinations", "activities", "difficulty", "tripTags", "categories", "tags"] as const;

/* ------------------------------------------------------- single documents */

/** One-off documents: homepage lists, menu, About page… */
export type SingletonDef = { key: string; label: string; description: string; file: string; sections: Section[] };

const menuItem = (depth: number): Field[] => [
  { name: "label", label: "Label", type: "text" },
  { name: "href", label: "Link", type: "text", mono: true, placeholder: "/trip/everest-base-camp-trek/" },
  ...(depth < 2 ? [{ name: "children", label: "Sub-menu", type: "repeater", itemLabel: "link", titleField: "label", collapsed: true, wide: true, fields: menuItem(depth + 1) } as Field] : []),
];

export const SINGLETONS: SingletonDef[] = [
  {
    key: "home",
    label: "Homepage trip lists",
    description: "Which trips appear in each homepage row, in order.",
    file: "home",
    sections: [
      {
        title: "Homepage rows",
        fields: [
          { name: "featured", label: "Featured trips", type: "multiselect", source: "trips", ordered: true, wide: true },
          { name: "popular", label: "Popular trips", type: "multiselect", source: "trips", ordered: true, wide: true },
          { name: "luxury", label: "Luxury trips", type: "multiselect", source: "trips", ordered: true, wide: true },
        ],
      },
    ],
  },
  {
    key: "menu",
    label: "Main menu",
    description: "The navigation at the top of every page.",
    file: "menu",
    sections: [{ title: "Menu", fields: [{ name: "items", label: "Menu items", type: "repeater", itemLabel: "menu item", titleField: "label", collapsed: true, wide: true, fields: menuItem(0) }] }],
  },
  {
    key: "about",
    label: "About us page",
    description: "The words on the About us page.",
    file: "about",
    sections: [
      {
        title: "About us",
        fields: [
          { name: "h1", label: "Main heading", type: "text", wide: true },
          { name: "intro", label: "Introduction paragraphs", type: "strings", itemLabel: "paragraph", wide: true },
          {
            name: "services", label: "What we offer", type: "repeater", itemLabel: "service", titleField: "title", collapsed: true, wide: true,
            fields: [
              { name: "title", label: "Title", type: "text" },
              { name: "href", label: "Link", type: "text", mono: true },
              { name: "photo", label: "Photo (path)", type: "text", mono: true, wide: true },
              { name: "text", label: "Text", type: "textarea", rows: 3, wide: true },
            ],
          },
          {
            name: "why", label: "Why travel with us", type: "repeater", itemLabel: "reason", titleField: "title", collapsed: true, wide: true,
            fields: [
              { name: "title", label: "Title", type: "text" },
              { name: "icon", label: "Icon name", type: "text", mono: true },
              { name: "text", label: "Text", type: "textarea", rows: 3, wide: true },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "tripadvisor",
    label: "Tripadvisor figures",
    description: "The rating and review count shown with the Tripadvisor badge.",
    file: "tripadvisor",
    sections: [
      {
        title: "Tripadvisor",
        fields: [
          { name: "url", label: "Listing link", type: "text", wide: true },
          { name: "rating", label: "Rating", type: "number", min: 0, max: 5, step: 0.5 },
          { name: "reviews", label: "Number of reviews", type: "number", min: 0 },
          { name: "ranking", label: "Ranking line", type: "text", wide: true, placeholder: "#182 of 2,645 Outdoor Activities in Kathmandu" },
          { name: "checked", label: "Last checked", type: "date" },
        ],
      },
    ],
  },
  {
    key: "google-reviews",
    label: "Google reviews",
    description: "Reviews shown in the Google tab.",
    file: "google-reviews",
    sections: [
      {
        title: "Google reviews",
        fields: [
          { name: "url", label: "Google Maps link", type: "text", wide: true },
          {
            name: "reviews", label: "Reviews", type: "repeater", itemLabel: "review", titleField: "name", collapsed: true, wide: true,
            fields: [
              { name: "name", label: "Name", type: "text" },
              { name: "rating", label: "Stars", type: "number", min: 1, max: 5 },
              { name: "published", label: "Date", type: "date" },
              { name: "excerpt", label: "Review", type: "textarea", rows: 4, wide: true },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "trustindex-reviews",
    label: "Trustindex reviews",
    description: "Reviews shown in the Trustindex tab.",
    file: "trustindex-reviews",
    sections: [
      {
        title: "Trustindex reviews",
        fields: [
          { name: "url", label: "Trustindex link", type: "text", wide: true },
          { name: "rating", label: "Rating", type: "number", min: 0, max: 5, step: 0.1 },
          { name: "totalReviews", label: "Total reviews", type: "number", min: 0 },
          {
            name: "reviews", label: "Reviews", type: "repeater", itemLabel: "review", titleField: "name", collapsed: true, wide: true,
            fields: [
              { name: "name", label: "Name", type: "text" },
              { name: "rating", label: "Stars", type: "number", min: 1, max: 5 },
              { name: "published", label: "Date", type: "date" },
              { name: "title", label: "Title", type: "text", wide: true },
              { name: "body", label: "Review", type: "textarea", rows: 4, wide: true },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "photos",
    label: "Hero photos",
    description: "The big photographs at the top of the homepage and section pages.",
    file: "photos",
    sections: [{ title: "Photos", fields: [{ name: "photos", label: "Photos by place on the site", type: "json", rows: 24, wide: true, help: "Advanced: each entry is a slot name and its photo." }] }],
  },
];

export const singleton = (key: string) => SINGLETONS.find((s) => s.key === key) ?? null;

/** Singletons whose file is an array or a bare object are wrapped in one field for editing. */
export const SINGLETON_WRAP: Record<string, string> = { menu: "items", photos: "photos" };

export { img as emptyImage, emptySeo };
