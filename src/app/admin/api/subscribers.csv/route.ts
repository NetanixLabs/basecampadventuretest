import { db } from "@/lib/admin/db";
import { assertUser } from "@/lib/admin/guards";

/** Subscriber list as a spreadsheet (CSV). */
export async function GET() {
  try {
    await assertUser("sales");
  } catch {
    return new Response("Sign in again.", { status: 401 });
  }
  const rows = await db.subscriber.findMany({ orderBy: { createdAt: "asc" } });
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = ["email,status,source,joined", ...rows.map((r) => [r.email, r.status, r.source ?? "", r.createdAt.toISOString()].map((x) => q(/^[=+\-@]/.test(x) ? `'${x}` : x)).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
