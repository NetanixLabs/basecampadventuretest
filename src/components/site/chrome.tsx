import { ProseLightbox } from "@/components/prose-lightbox";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { Integrations } from "@/components/site/integrations";
import { WhatsappFab } from "@/components/site/whatsapp-fab";
import { ShortlistBar } from "@/components/shortlist";
import { getFeatures, getPublicSettings } from "@/lib/content";
import { organizationLd, websiteLd } from "@/lib/seo";
import { site } from "@/lib/site";

/** Everything around a public page: header, footer, chat, analytics. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  // IDs saved in Admin → Settings win over the server's environment variables.
  const s = getPublicSettings() as { tawkProperty?: string; tawkWidget?: string; ga4?: string };
  const ids = {
    tawkProperty: s.tawkProperty || site.integrations.tawkProperty,
    tawkWidget: s.tawkWidget || site.integrations.tawkWidget || "default",
    ga4: s.ga4 || site.integrations.ga4,
    tawkDetails: getFeatures().tawk.details,
  };
  const p = getFeatures().payments;
  const c = getFeatures().currency;
  const fx = c.enabled ? { EUR: Number(c.eur), GBP: Number(c.gbp), AUD: Number(c.aud) } : null;
  const pay = { methods: [...(p.wetravel ? ["wetravel"] : []), ...(p.hbl ? ["hbl"] : [])], preferred: p.preferred };
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `window.__BCA_PAY__=${JSON.stringify(pay)}${fx ? `;window.__BCA_FX__=${JSON.stringify(fx)}` : ""}` }} />
      <a href="#main" className="bg-marigold text-pine-night sr-only z-[100] rounded-full px-5 py-3 font-bold focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <WhatsappFab />
      <ShortlistBar />
      <Integrations {...ids} />
      <SmoothScroll />
      <ProseLightbox />
      <JsonLd data={[organizationLd(), websiteLd()]} />
    </>
  );
}
