import Link from "next/link";
import { Alert } from "@/components/admin/ui";
import { checkToken } from "@/lib/server/portal";
import { PortalAuthShell } from "../shell";
import { PortalSetPassword } from "../forms";

export const metadata = { title: "Choose your password" };

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const row = await checkToken(t);
  return (
    <PortalAuthShell title={row ? `Welcome, ${row.traveller.name.split(" ")[0]}` : "This link has expired"} subtitle={row ? "Choose a password for your trip page." : undefined}>
      {row ? (
        <PortalSetPassword token={t} />
      ) : (
        <div className="space-y-4">
          <Alert tone="amber">Links work once and only for a limited time. Reply to our email and we&apos;ll send a new one, or reset your password if you set one before.</Alert>
          <Link href="/forgot/" className="block text-center text-sm font-semibold text-pine hover:underline">Reset my password</Link>
        </div>
      )}
    </PortalAuthShell>
  );
}
