import { BadgeCheck } from "lucide-react";

/** Verified-review seal at the end of reviewer rows: icon only, explained on hover and to screen readers. */
export function ReviewVerified() {
  return (
    <span className="ml-auto inline-flex shrink-0" title="Verified review: this traveller booked and travelled with us">
      <BadgeCheck className="size-5 fill-[#1d9bf0] text-white dark:text-pine-night" strokeWidth={2.25} aria-hidden />
      <span className="sr-only">Verified review</span>
    </span>
  );
}
