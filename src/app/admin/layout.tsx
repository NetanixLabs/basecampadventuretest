import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin · Base Camp Adventure", template: "%s · Base Camp Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[color-mix(in_oklab,var(--pine)_4%,var(--paper,#f6f9fa))] text-ink">{children}</div>;
}
