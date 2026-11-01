import { redirect } from "next/navigation";
import { getTraveller } from "@/lib/server/portal";
import { PortalAuthShell } from "../shell";
import { PortalLogin } from "../forms";

export const metadata = { title: "Sign in" };

export default async function PortalLoginPage() {
  if (await getTraveller()) redirect("/");
  return (
    <PortalAuthShell title="Sign in to your trip page" subtitle="For travellers with a confirmed Base Camp Adventure booking.">
      <PortalLogin />
    </PortalAuthShell>
  );
}
