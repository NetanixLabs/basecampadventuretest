import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "My trip · Base Camp Adventure", template: "%s · My trip · Base Camp Adventure" },
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[color-mix(in_oklab,var(--pine)_4%,var(--paper,#f6f9fa))] text-ink">{children}</div>;
}
