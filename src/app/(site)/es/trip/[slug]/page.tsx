import { LocalizedTrip, localizedMetadata, localizedParams } from "@/components/trip/localized-trip";

export const dynamicParams = true;
export const generateStaticParams = () => localizedParams("es");
export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }) => localizedMetadata("es", (await params).slug);

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LocalizedTrip lang="es" params={params} />;
}
