import { redirect } from "next/navigation";
import { getAuth } from "@/lib/admin/session";
import { AuthShell } from "../shell";
import { LoginForm } from "../forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const auth = await getAuth();
  if (auth?.mfaDone) redirect("/");
  const { reset } = await searchParams;
  return (
    <AuthShell title="Sign in to the admin" subtitle="For the Base Camp Adventure team.">
      <LoginForm notice={reset ? "Password changed. Sign in with your new password." : undefined} />
    </AuthShell>
  );
}
