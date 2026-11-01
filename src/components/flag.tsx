/** A country flag (SVG from country-flag-icons), shown as a small image. */
/** Pass `decorative` when the country name is written right next to the flag. */
export function Flag({ svg, label, className, decorative }: { svg: string; label: string; className?: string; decorative?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
      alt={decorative ? "" : label}
      aria-hidden={decorative || undefined}
      title={label}
      width={21}
      height={14}
      className={className ?? "inline-block h-3.5 w-[1.3rem] shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"}
    />
  );
}
