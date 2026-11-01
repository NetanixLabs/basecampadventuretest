import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { templateDef } from "@/lib/admin/email/templates";
import { requireUser } from "@/lib/admin/guards";
import { TemplateEditor } from "./editor";

export const metadata = { title: "Edit email" };

export default async function EditEmail({ params }: { params: Promise<{ key: string }> }) {
  await requireUser("email");
  const { key } = await params;
  const def = templateDef(key);
  if (!def) notFound();
  const s = await db.emailTemplate.findUnique({ where: { key } });
  return (
    <>
      <PageHeader title={def.name} description={`Sent to the ${def.to}.`} back={{ href: "/emails", label: "Email templates" }} />
      <TemplateEditor keyName={key} vars={def.vars} initial={{ subject: s?.subject ?? def.subject, heading: s?.heading ?? def.heading, body: s?.body ?? def.body, button: s?.button ?? def.button ?? "", enabled: s?.enabled ?? !def.off }} edited={Boolean(s)} />
    </>
  );
}
