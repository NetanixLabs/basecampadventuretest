"use client";

import { useEffect } from "react";

/** Tells the admin which address was missing and which page linked to it (see /api/not-found). */
export function MissingBeacon() {
  useEffect(() => {
    try {
      if (navigator.webdriver || /^(admin|my)\./.test(location.hostname)) return;
      const body = JSON.stringify({ path: location.pathname, ref: document.referrer });
      if (!navigator.sendBeacon?.("/api/not-found/", new Blob([body], { type: "application/json" }))) void fetch("/api/not-found/", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
      /* reporting is optional */
    }
  }, []);
  return null;
}
