import { ActivitiesIndex } from "@/components/activities-index";
import { meta } from "@/lib/seo";

/** WordPress had this listing at its own URL; it stays live with its own canonical. */
export const metadata = meta({
  path: "/trip-types/",
  title: "Trip Types",
  description: "Trekking, peak climbing, cultural tours, rafting, day tours, Bhutan and Tibet: every kind of trip Base Camp Adventure runs.",
});

export default function TripTypes() {
  return <ActivitiesIndex path="/trip-types/" />;
}
