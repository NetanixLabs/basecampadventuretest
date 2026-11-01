import { redirect } from "next/navigation";
import { getAuth } from "@/lib/admin/session";
import { AuthShell } from "../../shell";
import { SetupForm } from "../../forms";

export const metadata = { title: "Set up two-step sign-in" };

export default async function SetupPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.user.totpEnabled) redirect(auth.mfaDone ? "/" : "/login/verify");
  return (
    <AuthShell title="Protect your account" subtitle="Every admin account uses two-step sign-in: your password plus a code from your phone. It takes one minute.">
      <SetupForm />
    </AuthShell>
  );
}
