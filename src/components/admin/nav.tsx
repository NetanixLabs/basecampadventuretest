"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, BookOpen, CalendarCheck, FileText, Film, Image as ImageIcon, Inbox, LayoutDashboard, LogOut, Mail, MapPinned, Menu,
  Mountain, Percent, Search, Settings, Shield, Sparkles, Star, Tag, Users, Waypoints, X, Receipt, Contact, Compass, Handshake, LineChart, HardHat,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { BarChart3, BookOpen, CalendarCheck, FileText, Film, ImageIcon, Inbox, LayoutDashboard, Mail, MapPinned, Mountain, Percent, Search, Settings, Shield, Sparkles, Star, Tag, Users, Waypoints, Receipt, Contact, Compass, Handshake, LineChart, HardHat, CalendarRange } as const;
export type IconName = keyof typeof ICONS;
export type NavGroup = { label: string; items: { href: string; label: string; icon: IconName; badge?: number }[] };

export function AdminNav({ groups, user, signOut }: { groups: NavGroup[]; user: { name: string; email: string; role: string }; signOut: () => Promise<void> }) {
  const path = usePathname().replace(/^\/admin/, "") || "/";
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  const body = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-3 px-5 pt-5 pb-6" onClick={() => setOpen(false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="" width={66} height={38} className="h-9 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-dark.svg" alt="" width={66} height={38} className="hidden h-9 w-auto dark:block" />
        <span className="leading-tight">
          <span className="block text-sm font-bold">Base Camp</span>
          <span className="block text-xs text-muted">Admin</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Admin">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = ICONS[it.icon];
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      aria-current={active(it.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active(it.href) ? "bg-pine text-white shadow-sm" : "text-ink-soft hover:bg-pine/8 hover:text-pine",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge ? <span className={cn("rounded-full px-1.5 text-[11px] font-bold", active(it.href) ? "bg-white/25" : "bg-marigold text-pine-night")}>{it.badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <Link href="/account" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-pine/8">
          <span className="block truncate text-sm font-semibold">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.email} · {user.role === "editor" ? "Editor" : "Main admin"}</span>
        </Link>
        <form action={signOut}>
          <button type="submit" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft hover:bg-pine/8 hover:text-pine">
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="text-sm font-bold">Base Camp Admin</Link>
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full border border-line" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </div>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-card lg:block">{body}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card shadow-xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-4 grid size-9 place-items-center rounded-full border border-line" aria-label="Close menu">
              <X className="size-4" />
            </button>
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}
