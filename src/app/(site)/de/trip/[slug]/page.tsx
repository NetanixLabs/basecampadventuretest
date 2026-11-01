import { LocalizedTrip, localizedMetadata, localizedParams } from "@/components/trip/localized-trip";

export const dynamicParams = true;
export const generateStaticParams = () => localizedParams("de");
export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }) => localizedMetadata("de", (await params).slug);

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LocalizedTrip lang="de" params={params} />;
}
