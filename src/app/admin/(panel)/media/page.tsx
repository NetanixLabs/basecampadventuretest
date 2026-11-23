import { PageHeader } from "@/components/admin/ui";
import { can, requireUser } from "@/lib/admin/guards";
import { site } from "@/lib/site";
import { MediaLibrary } from "./library";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const { user } = await requireUser("media");
  return (
    <>
      <PageHeader title="Media library" description="Every photo and video on the website." info="Uploads are rotated, stripped of camera/GPS data, resized to max 2560 px and saved as WebP. Files in use can't be deleted. Open a photo to see where it's used or replace it everywhere." />
      <MediaLibrary siteUrl={site.url} canPublish={can(user, "publish")} />
    </>
  );
}
