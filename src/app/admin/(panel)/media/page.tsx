import { PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/admin/guards";
import { site } from "@/lib/site";
import { MediaLibrary } from "./library";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  await requireUser("media");
  return (
    <>
      <PageHeader title="Media library" description="Every photo and video on the website. Upload here, or straight from any photo field." />
      <MediaLibrary siteUrl={site.url} />
    </>
  );
}
