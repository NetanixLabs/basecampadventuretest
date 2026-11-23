import { PageHeader } from "@/components/admin/ui";
import { can, requireUser } from "@/lib/admin/guards";
import { site } from "@/lib/site";
import { MediaLibrary } from "./library";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const { user } = await requireUser("media");
  return (
    <>
      <PageHeader title="Media library" description="Every photo and video on the website." info="Upload here or straight from any photo field. Photos are turned the right way up, stripped of camera and GPS data, resized to at most 2560 px and saved as high-quality WebP. Visitors get the right size for their screen automatically. A file can only be deleted when nothing on the website uses it. Open a photo to see every page that uses it, or to replace it on all of them at once." />
      <MediaLibrary siteUrl={site.url} canPublish={can(user, "publish")} />
    </>
  );
}
