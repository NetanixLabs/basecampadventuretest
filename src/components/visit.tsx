"use client";

import { useEffect } from "react";
import { classify } from "@/lib/sources";

/**
 * Counts one visit per browser session and remembers where it came from
 * (Google, Instagram…) in a session cookie, so a booking made later in the
 * same visit is credited to the right channel. Nothing personal is stored.
 */
export function Visit() {
  useEffect(() => {
    try {
      if (navigator.webdriver || /(^|;\s*)bca_src=/.test(document.cookie)) return;
      const source = classify(document.referrer, new URLSearchParams(location.search), location.hostname);
      document.cookie = `bca_src=${encodeURIComponent(source)}; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      const body = JSON.stringify({ source });
      if (!navigator.sendBeacon?.("/api/visit/", new Blob([body], { type: "application/json" }))) void fetch("/api/visit/", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
      /* counting is optional */
    }
  }, []);
  return null;
}
