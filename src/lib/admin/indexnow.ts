import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/admin/db";
import { writeSettings } from "@/lib/admin/publish";
import { site } from "@/lib/site";

/**
 * IndexNow: tells Bing (which also feeds ChatGPT search and Copilot), Yandex,
 * Seznam and Naver the moment a page is published, changed, hidden or
 * deleted, instead of waiting for their crawlers. Google discovers changes
 * through the sitemap. Never blocks publishing: a failed ping is only logged.
 */
export async function ensureIndexNowKey(): Promise<string> {
  const row = await db.setting.findUnique({ where: { key: "indexnowKey" } });
  if (row && typeof row.value === "string") return row.value;
  const k = randomBytes(16).toString("hex");
  await db.setting.upsert({ where: { key: "indexnowKey" }, create: { key: "indexnowKey", value: k, public: true }, update: { value: k } });
  await writeSettings(); // publishes the key file at /indexnow-key.txt
  return k;
}

export function pingIndexNow(paths: string[]) {
  const live = process.env.NODE_ENV === "production" && /^https:\/\/(www\.)?basecampadventure\.com$/.test(site.url);
  if (!live || !paths.length) return;
  void (async () => {
    try {
      const k = await ensureIndexNowKey();
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: new URL(site.url).host, key: k, keyLocation: `${site.url}/indexnow-key.txt`, urlList: [...new Set(paths)].map((p) => `${site.url}${p}`) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok && res.status !== 202) console.warn("[indexnow]", res.status, await res.text().catch(() => ""));
    } catch (e) {
      console.warn("[indexnow] ping failed", e instanceof Error ? e.message : e);
    }
  })();
}
