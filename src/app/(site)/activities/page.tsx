import { ActivitiesIndex } from "@/components/activities-index";
import { meta } from "@/lib/seo";

export const metadata = meta({
  path: "/activities/",
  title: "Activities: Trekking, Peak Climbing, Tours, Rafting & More",
  description: "Trekking in Nepal, peak climbing, cultural tours, river rafting, day tours, and trips to Bhutan and Tibet with Base Camp Adventure.",
});

export default function Page() {
  return <ActivitiesIndex />;
}
