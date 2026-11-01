import Image from "next/image";

/** The calm, branded frame around every sign-in screen. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-pine-night lg:block">
        <Image src="/photos/hero-ama-dablam.webp" alt="" fill priority sizes="55vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-pine-night via-pine-night/30 to-transparent" />
        <div className="absolute inset-x-12 bottom-12 text-white">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">Base Camp Adventure</p>
          <p className="font-display mt-3 max-w-md text-3xl leading-tight font-bold">Everything on the website, managed from one calm place.</p>
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
