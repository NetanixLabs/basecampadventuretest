import { GalleryGrid, type GalleryPhoto } from "@/components/gallery-grid";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { getLiveTerms, getPhotoCredits, getTrips, photo } from "@/lib/content";
import { abs, imageLd, meta } from "@/lib/seo";

export const metadata = meta({
  path: "/gallery/",
  title: "Photo Gallery",
  description: "Photographs from Base Camp Adventure treks and tours across Everest, Annapurna, Langtang, Manaslu, Mustang, Bhutan and Tibet.",
});

export default function GalleryPage() {
  const { destinations } = getLiveTerms();
  const names = Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
  const seen = new Set<string>();
  const photos: GalleryPhoto[] = [];
  for (const t of getTrips()) {
    for (const im of [t.cover, ...t.gallery]) {
      // Only photographs sharp enough to fill a column, and each one once.
      if (!im || im.w < 900 || seen.has(im.src)) continue;
      seen.add(im.src);
      photos.push({ src: im.src, w: im.w, h: im.h, alt: im.alt, trip: t.slug, tripTitle: t.title, region: t.destinations[0] ?? "nepal" });
    }
  }
  const regions = destinations
    .map((d) => ({ slug: d.slug, name: names[d.slug], count: photos.filter((p) => p.region === d.slug).length }))
    .filter((r) => r.count > 0);
  const hero = photo("page-gallery");
  const credits = getPhotoCredits();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: "Base Camp Adventure photo gallery",
          url: abs("/gallery/"),
          associatedMedia: photos.slice(0, 60).map((p) => imageLd(p)),
        }}
      />
      <PageHero title="Photo" accent="Gallery" eyebrow={`${photos.length} photographs`} photo={hero.src} crumbs={[{ name: "Gallery", path: "/gallery/" }]} />
      <section className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-20">
        <GalleryGrid photos={photos} regions={regions} />
      </section>

      {credits.length ? (
        <div id="photo-credits" className="mx-auto max-w-site scroll-mt-28 px-4 pb-10 sm:px-6 lg:px-6">
          <details className="group text-xs text-muted">
            <summary className="cursor-pointer list-none hover:text-ink">Photo credits</summary>
            <p className="mt-3 max-w-3xl leading-relaxed">
              Some banner photographs are from Wikimedia Commons, used under Creative Commons licences with our watermark added:{" "}
              {credits.map((c, i) => (
                <span key={c.slot}>
                  <a href={c.credit.source} target="_blank" rel="noopener noreferrer" className="hover:text-pine underline-offset-2 hover:underline">
                    {c.credit.title}
                  </a>{" "}
                  by {c.credit.author} (
                  {c.credit.licenseUrl ? (
                    <a href={c.credit.licenseUrl} target="_blank" rel="license noopener noreferrer" className="hover:text-pine">
                      {c.credit.license}
                    </a>
                  ) : (
                    c.credit.license
                  )}
                  ){i < credits.length - 1 ? "; " : "."}
                </span>
              ))}
            </p>
          </details>
        </div>
      ) : null}
    </>
  );
}
