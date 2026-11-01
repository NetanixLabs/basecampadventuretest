import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { site } from "@/lib/site";
import { configStatus } from "@/lib/admin/config";
import { CompanyForm } from "./company";
import { KeysForm } from "./keys";
import { SettingsForm } from "./form";

export const metadata = { title: "Settings" };


export default async function Settings() {
  await requireUser("settings");
  const rows = await db.setting.findMany({ where: { key: { in: ["tawkProperty", "tawkWidget", "ga4", "company"] } } });
  const saved = (rows.find((r) => r.key === "company")?.value ?? {}) as Record<string, string>;
  const company = {
    contactPerson: saved.contactPerson ?? site.contactPerson,
    phone: saved.phone ?? site.phone,
    mobile: saved.mobile ?? site.mobile,
    whatsapp: saved.whatsapp ?? site.whatsapp,
    email: saved.email ?? site.email,
    street: saved.street ?? site.address.street,
    city: saved.city ?? site.address.city,
    poBox: saved.poBox ?? site.address.poBox,
    facebook: saved.facebook ?? site.social.facebook,
    instagram: saved.instagram ?? site.social.instagram,
    x: saved.x ?? site.social.x,
    tripadvisor: saved.tripadvisor ?? site.social.tripadvisor,
  };
  const v = (k: string, fallback: string) => String(rows.find((r) => r.key === k)?.value ?? fallback);
  return (
    <>
      <PageHeader title="Settings" description="Website integrations and how the system is connected." />
      <CompanyForm initial={company} />
      <div className="mt-6"><KeysForm status={await configStatus()} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SettingsForm initial={{ tawkProperty: v("tawkProperty", process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? ""), tawkWidget: v("tawkWidget", process.env.NEXT_PUBLIC_TAWK_WIDGET_ID ?? "default"), ga4: v("ga4", process.env.NEXT_PUBLIC_GA4_ID ?? "") }} />

      </div>
    </>
  );
}
