import { redirect } from "next/navigation";
import { getAuth } from "@/lib/admin/session";
import { AuthShell } from "../../shell";
import { VerifyForm } from "../../forms";

export const metadata = { title: "Two-step sign-in" };

export default async function VerifyPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.mfaDone) redirect("/");
  if (!auth.user.totpEnabled) redirect("/login/setup-2fa");
  return (
    <AuthShell title="Two-step sign-in" subtitle={`Signed in as ${auth.user.email}.`}>
      <VerifyForm />
    </AuthShell>
  );
}
