import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/admin/db";
import { getTraveller } from "@/lib/server/portal";
import { portalSignOut } from "./actions";
import { NoticeBell } from "./notices";

/** Sign-in screens: photo on the left (large screens), form on the right. */
export function PortalAuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-pine-night lg:block">
        <Image src="/photos/hero-ama-dablam.webp" alt="" fill priority sizes="55vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-pine-night via-pine-night/30 to-transparent" />
        <div className="absolute inset-x-12 bottom-12 text-white">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">Base Camp Adventure</p>
          <p className="font-display mt-3 max-w-md text-3xl leading-tight font-bold">Your trip, your documents, all in one place.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="Base Camp Adventure" width={132} height={76} className="mb-8 h-14 w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-dark.svg" alt="Base Camp Adventure" width={132} height={76} className="mb-8 hidden h-14 w-auto dark:block" />
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** The signed-in frame: logo, the traveller's name, sign out. */
export async function PortalShell({ name, children }: { name: string; children: React.ReactNode }) {
  const t = await getTraveller();
  const notices = t ? await db.notification.findMany({ where: { travellerId: t.id }, orderBy: { createdAt: "desc" }, take: 15 }) : [];
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="Base Camp Adventure" width={84} height={48} className="h-10 w-auto dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-dark.svg" alt="Base Camp Adventure" width={84} height={48} className="hidden h-10 w-auto dark:block" />
            <span className="hidden text-sm font-semibold text-muted sm:inline">My trip</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden font-semibold sm:inline">{name}</span>
            {t ? <NoticeBell notices={notices.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, href: n.href, read: Boolean(n.readAt), at: n.createdAt.toISOString() }))} /> : null}
            <form action={portalSignOut}><button className="rounded-full border border-line px-4 py-1.5 font-semibold hover:border-pine hover:text-pine">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted sm:px-6">Questions? Reply to any of our emails or WhatsApp +977 985 102 9616. Your details are encrypted and deleted after your trip.</footer>
    </>
  );
}
