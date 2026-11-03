import { PageHeader } from "@/components/admin/ui";
import { configStatus } from "@/lib/admin/config";
import { features } from "@/lib/admin/features";
import { requireUser } from "@/lib/admin/guards";
import { FeaturesForm } from "./form";
import { BulkWatermark } from "./watermark";
import { watermarkStatus } from "./watermark-actions";

export const metadata = { title: "Features" };

export default async function FeaturesPage() {
  await requireUser("settings");
  const s = await configStatus();
  return (
    <>
      <PageHeader title="Features" description="Switch features on or off and set how they work." back={{ href: "/settings", label: "Settings" }} info="Every switch takes effect immediately. Turning a feature off hides it cleanly: its links disappear and its pages answer 'not found', so nothing looks broken." />
      <FeaturesForm initial={await features()} whatsappKeys={{ meta: Boolean(s.WHATSAPP_TOKEN?.set), callmebot: Boolean(s.CALLMEBOT_KEYS?.set) }} />
      <div className="mt-6"><BulkWatermark initial={await watermarkStatus()} /></div>
    </>
  );
}
