import { ProseLightbox } from "@/components/prose-lightbox";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { Integrations } from "@/components/site/integrations";
import { WhatsappFab } from "@/components/site/whatsapp-fab";
import { organizationLd, websiteLd } from "@/lib/seo";

/** Everything around a public page: header, footer, chat, analytics. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="bg-marigold text-pine-night sr-only z-[100] rounded-full px-5 py-3 font-bold focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <WhatsappFab />
      <Integrations />
      <SmoothScroll />
      <ProseLightbox />
      <JsonLd data={[organizationLd(), websiteLd()]} />
    </>
  );
}
