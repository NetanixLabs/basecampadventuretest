import charts from "@/content/trek-chart-images.json";

type Props = { html: string; className?: string };

/** Keep the original chart artwork: original pixels, as lossless WebP where the browser supports it. */
export function TripProse({ html, className = "" }: Props) {
  const originals = charts as Record<string, { src: string; width: number; height: number }>;
  const content = html.replace(/<img\b[^>]*>/gi, (image) => {
    const source = image.match(/\bsrc="([^"]+)"/)?.[1];
    const chart = source ? originals[source] : undefined;
    if (!chart) return image;
    const img = image
      .replace(/\bsrc="[^"]+"/, `src="${chart.src}"`)
      .replace(/\s(class|loading|decoding|width|height)="[^"]*"/g, "")
      .replace(/\s*\/?\s*>$/, ` width="${chart.width}" height="${chart.height}" loading="lazy" decoding="async" class="trip-original-chart"/>`);
    // Same pixels as the PNG (lossless WebP), about a third smaller; the PNG stays as the fallback.
    return chart.src.endsWith(".png") ? `<picture><source type="image/webp" srcset="${chart.src.replace(/\.png$/, ".webp")}"/>${img}</picture>` : img;
  });
  return <div className={`prose-trail ${className}`} dangerouslySetInnerHTML={{ __html: content }} />;
}
