import "server-only";
import { db } from "@/lib/admin/db";
import { adminConfigured } from "@/lib/admin/env";
import { withFeatureDefaults, type Features } from "@/lib/features";

/** Current switches straight from the database (for server jobs and the admin). */
export async function features(): Promise<Features> {
  if (!adminConfigured()) return withFeatureDefaults(null);
  const row = await db.setting.findUnique({ where: { key: "features" } }).catch(() => null);
  return withFeatureDefaults(row?.value);
}
