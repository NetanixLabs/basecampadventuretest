import Link from "next/link";
import { AuthShell } from "../shell";
import { ResetForm } from "../forms";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" subtitle="This signs you out on every other device.">
      {token ? <ResetForm token={token} /> : <p className="text-sm">This link is incomplete. <Link className="font-semibold text-pine" href="/forgot">Ask for a new one</Link>.</p>}
    </AuthShell>
  );
}
