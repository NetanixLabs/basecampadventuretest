import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { meta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = meta({
  path: "/privacy-policy/",
  title: "Privacy Policy",
  description: "How Base Camp Adventure uses the details you share through our enquiry, trip request, booking and newsletter forms, and how to ask us to change or delete them.",
});

const UPDATED = "11 October 2026";

/**
 * The privacy policy, describing what this website actually does with
 * personal details. (The old site's page had no text.) To be reviewed by
 * the company before launch.
 */
export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        title="Privacy"
        accent="Policy"
        eyebrow="Base Camp Adventure"
        intro="What we do with the details you share with us, and the choices you have."
        photo="/photos/page-contact.webp"
        crumbs={[{ name: "Privacy Policy", path: "/privacy-policy/" }]}
      />
      <article className="mx-auto max-w-[72ch] px-4 py-14 sm:px-6 sm:py-20">
        <div className="prose-trail">
          <p>
            <em>Last updated: {UPDATED}</em>
          </p>

          <h2 id="who-we-are">Who we are</h2>
          <p>
            {site.legalName}, {site.address.street}, {site.address.city}, Nepal (P.O. Box {site.address.poBox.replace(/\D/g, "")}). Government Reg. No. {site.registration[0].value}. You can reach us at{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a> or {site.phone}.
          </p>

          <h2 id="what-we-collect">What we collect</h2>
          <ul>
            <li>
              <strong>Enquiries and trip requests:</strong> your name, email address and, if you give them, your phone or WhatsApp number, country, travel dates, group size and the trip details you tell us.
            </li>
            <li>
              <strong>Bookings and online payments:</strong> the traveller and trip details needed to book. Card payments are taken by WeTravel on their own secure pages; we do not see or store your card number.
            </li>
            <li>
              <strong>Newsletter:</strong> your email address, if you sign up.
            </li>
            <li>
              <strong>Live chat:</strong> messages you send through the chat window, run by tawk.to.
            </li>
            <li>
              <strong>Website use:</strong> Google Analytics records how the site is used (pages visited, device and approximate location) with cookies, to help us improve it.
            </li>
          </ul>

          <h2 id="how-we-use-it">How we use it</h2>
          <ul>
            <li>To answer your questions and plan, book and run your trip.</li>
            <li>To send our newsletter with trip ideas and festival offers, only if you signed up. Every email has a link to unsubscribe.</li>
            <li>To keep the records that accounting and tourism regulations in Nepal require.</li>
          </ul>
          <p>We do not sell your personal details.</p>

          <h2 id="who-we-share-it-with">Who we share it with</h2>
          <p>
            Only those who need it to arrange your trip (for example the guides, hotels and airlines on your itinerary), and the services that run parts of this website: WeTravel (bookings and payments), tawk.to (live chat) and Google (analytics).
          </p>

          <h2 id="how-long-we-keep-it">How long we keep it</h2>
          <p>As long as we need it to arrange your trip and to meet our legal and accounting obligations. Newsletter addresses are kept until you unsubscribe.</p>

          <h2 id="your-choices">Your choices</h2>
          <p>
            You can ask us what we hold about you, ask us to correct it, or ask us to delete it, by writing to <a href={`mailto:${site.email}`}>{site.email}</a>. You can turn off cookies in your browser settings; the site still works without them.
          </p>

          <h2 id="changes">Changes</h2>
          <p>
            If this policy changes, the new version will be posted on this page with its date. Questions? <Link href="/contact-us/">Contact us</Link>.
          </p>
        </div>
      </article>
    </>
  );
}
