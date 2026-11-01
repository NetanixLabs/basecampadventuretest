import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/admin/db";
import { clientIpFrom } from "@/lib/ip";

/** Who did what, when, from where. Never throws: an audit hiccup must not block the work. */
export async function audit(userId: string | null, action: string, entity: string, entityId?: string | null, summary?: string) {
  try {
    const h = await headers();
    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ?? null,
        summary: summary?.slice(0, 500) ?? null,
        ipAddress: clientIpFrom(h),
        userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] could not record", action, entity, error);
  }
}
