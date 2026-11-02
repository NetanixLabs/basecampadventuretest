import google from "@/content/google-reviews.json";
import Link from "next/link";
import { Play } from "lucide-react";
import { getVideoReviews } from "@/lib/content";
import { site } from "@/lib/site";

/** "Write a review" links for Tripadvisor and Google, from the links set in Admin → Settings → Company. */
export function reviewLinks() {
  const ta = /-g(\d+)-d(\d+)-/.exec(site.social.tripadvisor ?? "");
  const tripadvisor = ta ? `https://www.tripadvisor.com/UserReviewEdit-g${ta[1]}-d${ta[2]}` : site.social.tripadvisor || "";
  const googleUrl = site.googleReview || (google.placeId ? `https://search.google.com/local/writereview?placeid=${google.placeId}` : "");
  return { tripadvisor, google: googleUrl };
}

function TripadvisorLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-10" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#34E0A1" />
      <g transform="translate(3.6 3.6) scale(0.7)">
        <path fill="#000" d="M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.072 1.598 6 6 0 0 0 6-5.998 5.982 5.982 0 0 0-1.957-4.432L24 6.648h-4.35a13.573 13.573 0 0 0-7.644-2.353zM12 6.255c1.531 0 3.063.303 4.504.903C13.943 8.138 12 10.43 12 13.1c0-2.671-1.942-4.962-4.504-5.942A11.72 11.72 0 0 1 12 6.256zM6.002 9.157a4.059 4.059 0 1 1 0 8.118 4.059 4.059 0 0 1 0-8.118zm11.992.002a4.057 4.057 0 1 1 .003 8.115 4.057 4.057 0 0 1-.003-8.115zm-11.992 1.93a2.128 2.128 0 0 0 0 4.256 2.128 2.128 0 0 0 0-4.256zm11.992 0a2.128 2.128 0 0 0 0 4.256 2.128 2.128 0 0 0 0-4.256z" />
      </g>
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-10" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

/** Sits under the awards in the trip sidebar (and under the reviews on phones), in the same tile row style. */
export function ReviewUs() {
  const l = reviewLinks();
  const videos = getVideoReviews().length;
  const tile = "flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white p-2 text-center shadow-sm transition-colors hover:border-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
  const label = (name: string, action: string) => (
    <span className="leading-tight">
      <span className="block text-[11px] font-bold text-[#243238]">{name}</span>
      <span className="block text-[10px] font-semibold text-[#00788a]">{action}</span>
    </span>
  );
  if (!l.tripadvisor && !l.google && !videos) return null;
  return (
    <section aria-label="Review us" className="mt-6 space-y-3">
      <h2 className="text-sm font-bold tracking-wide text-ink">Travelled with us? Review us</h2>
      <div className="mt-2 h-0.5 w-10 bg-pine" aria-hidden />
      <div className="mt-3 grid grid-cols-3 items-stretch gap-2">
        {l.tripadvisor ? (
          <a href={l.tripadvisor} target="_blank" rel="noopener noreferrer" aria-label="Write a review on Tripadvisor" className={tile}>
            <TripadvisorLogo />
            {label("Tripadvisor", "Write a review")}
          </a>
        ) : null}
        {l.google ? (
          <a href={l.google} target="_blank" rel="noopener noreferrer" aria-label="Write a review on Google" className={tile}>
            <GoogleLogo />
            {label("Google", "Write a review")}
          </a>
        ) : null}
        {videos ? (
          <Link href="/testimonials/#video-stories" aria-label="Watch video reviews from our travellers" className={`group ${tile}`}>
            <span className="grid size-10 place-items-center rounded-full bg-pine text-white transition-transform group-hover:scale-110"><Play className="size-4 translate-x-px fill-current" aria-hidden /></span>
            {label("Video reviews", "Watch now")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
