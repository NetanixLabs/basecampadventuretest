import { AuthShell } from "../shell";
import { ForgotForm } from "../forms";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      <ForgotForm />
    </AuthShell>
  );
}
