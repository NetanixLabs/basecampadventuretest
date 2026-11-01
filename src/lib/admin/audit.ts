import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/admin/db";

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
        ipAddress: h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] could not record", action, entity, error);
  }
}
