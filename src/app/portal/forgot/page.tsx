import { PortalAuthShell } from "../shell";
import { PortalForgot } from "../forms";

export const metadata = { title: "Forgot password" };

export default function PortalForgotPage() {
  return (
    <PortalAuthShell title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      <PortalForgot />
    </PortalAuthShell>
  );
}
