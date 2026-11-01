import photos from "@/content/place-photos.json";
import type { PlacePhoto } from "@/lib/place-photos";
import { meta } from "@/lib/seo";

export const metadata = meta({ path: "/image-attributions/", title: "Photo credits", description: "Sources and licenses for itinerary destination photographs." });

export default function PhotoCreditsPage() {
  return <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><h1 className="font-display text-4xl">Photo credits</h1><p className="mt-4 text-sm text-muted">Itinerary place photographs are resized and cropped for previews. Original photographs, authors, and licenses are linked below.</p><div className="mt-10 space-y-8">{Object.entries(photos as Record<string, PlacePhoto>).map(([key, photo]) => <section key={key}><h2 className="text-xl font-semibold">{photo.name}</h2><ul className="mt-3 space-y-2 text-sm">{[photo, ...(photo.images ?? [])].map((image) => <li key={image.src}><a href={image.source} target="_blank" rel="noopener noreferrer" className="text-pine underline">{image.author} — original photograph</a>{" · "}<a href={image.licenseUrl || image.source} target="_blank" rel="noopener noreferrer" className="underline">{image.license}</a></li>)}</ul></section>)}</div></main>;
}
