"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Third-party scripts, each switched on by its ID alone (set in the admin's
 * Settings later; environment variables for now). Both wait until the page is
 * idle, so neither can slow the first paint or hurt Core Web Vitals.
 */
export type IntegrationIds = { tawkProperty: string; tawkWidget: string; ga4: string; tawkDetails?: boolean };

type TawkWindow = Window & { Tawk_API?: Record<string, unknown>; Tawk_LoadStart?: Date };

export function Integrations({ tawkProperty, tawkWidget, ga4, tawkDetails = true }: IntegrationIds) {
  useEffect(() => {
    (window as Window & { __BCA_TAWK_DETAILS__?: boolean }).__BCA_TAWK_DETAILS__ = tawkDetails;
  }, [tawkDetails]);
  const path = usePathname();
  // Trip pages have a booking bar along the bottom on phones: the chat bubble sits above it.
  const aboveBar = path.startsWith("/trip/") && path.split("/").filter(Boolean).length === 2;

  useEffect(() => {
    if (!tawkProperty) return;
    const w = window as TawkWindow;
    w.Tawk_API = w.Tawk_API ?? {};
    w.Tawk_API.customStyle = {
      zIndex: 45,
      visibility: {
        desktop: { position: "br", xOffset: 24, yOffset: 24 },
        mobile: { position: "br", xOffset: 12, yOffset: aboveBar ? 92 : 16 },
      },
    };
    const load = () => {
      if (document.getElementById("tawk-script")) return;
      w.Tawk_LoadStart = new Date();
      const s = document.createElement("script");
      s.id = "tawk-script";
      s.async = true;
      s.src = `https://embed.tawk.to/${tawkProperty}/${tawkWidget}`;
      s.charset = "UTF-8";
      s.setAttribute("crossorigin", "*");
      document.body.appendChild(s);
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const t = idle ? idle(load, { timeout: 6000 }) : window.setTimeout(load, 4000);
    return () => {
      if (!idle) window.clearTimeout(t as number);
    };
  }, [tawkProperty, tawkWidget, aboveBar]);

  if (!ga4) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="lazyOnload" />
      <Script id="ga4" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
