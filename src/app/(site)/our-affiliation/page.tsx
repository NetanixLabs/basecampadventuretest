import { Accreditations } from "@/components/accreditations";
import { Accent, SectionHeading } from "@/components/section-heading";
import { meta } from "@/lib/seo";

export const metadata = meta({
  path: "/our-affiliation/",
  title: "Our Affiliation",
  description: "Base Camp Adventure’s licences, memberships and partners in Nepal.",
});

export default function AffiliationPage() {
  return (
    <div className="min-h-[65vh] pt-28 pb-16 lg:pt-36">
      <div className="mx-auto max-w-site px-4 pb-10 sm:px-6">
        <SectionHeading eyebrow="Licensed & trusted" lines={["Our", <Accent key="affiliation">affiliation.</Accent>]} />
      </div>
      <Accreditations large />
    </div>
  );
}
