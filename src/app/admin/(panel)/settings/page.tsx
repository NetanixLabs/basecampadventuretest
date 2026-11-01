import { Card, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { SettingsForm } from "./form";

export const metadata = { title: "Settings" };

const ok = (b: boolean) => (b ? <span className="font-semibold text-emerald-700">Connected</span> : <span className="font-semibold text-amber-700">Not set up</span>);

export default async function Settings() {
  await requireUser("settings");
  const rows = await db.setting.findMany({ where: { key: { in: ["tawkProperty", "tawkWidget", "ga4"] } } });
  const v = (k: string, fallback: string) => String(rows.find((r) => r.key === k)?.value ?? fallback);
  return (
    <>
      <PageHeader title="Settings" description="Website integrations and how the system is connected." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsForm initial={{ tawkProperty: v("tawkProperty", process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? ""), tawkWidget: v("tawkWidget", process.env.NEXT_PUBLIC_TAWK_WIDGET_ID ?? "default"), ga4: v("ga4", process.env.NEXT_PUBLIC_GA4_ID ?? "") }} />
        <Card title="Connections" description="These are set on the server for security (in its .env file), not here.">
          <dl className="grid grid-cols-[1fr_auto] gap-y-3 text-sm">
            <dt>WeTravel payments ({process.env.WETRAVEL_ENV === "production" ? "live" : "sandbox"})</dt><dd>{ok(Boolean(process.env.WETRAVEL_API_KEY))}</dd>
            <dt>WeTravel payment notifications (webhook)</dt><dd>{ok(Boolean(process.env.WETRAVEL_WEBHOOK_SECRET))}</dd>
            <dt>Email sending (SMTP)</dt><dd>{ok(Boolean(process.env.SMTP_HOST))}</dd>
            <dt>Office alerts go to</dt><dd className="font-mono text-xs">{process.env.OFFICE_EMAIL ?? "info@basecampadventure.com"}</dd>
            <dt>Two-step sign-in required</dt><dd>{ok(process.env.REQUIRE_TOTP !== "false")}</dd>
          </dl>
          <p className="mt-4 text-xs text-muted">WeTravel webhook address: <code className="font-mono">https://basecampadventure.com/api/webhooks/wetravel</code> (events: payment.created, payment.updated, transaction.updated).</p>
        </Card>
      </div>
    </>
  );
}
