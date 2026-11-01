import "server-only";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { applyCompany, type CompanySettings } from "@/lib/site";

/**
 * Keeps the server's company details in step with what the admin published
 * (settings.json in CONTENT_DIR). Cheap: re-reads only when the file changes.
 */
let seen = -1;
let current: CompanySettings = {};

export function ensureCompany(): CompanySettings {
  const file = path.join(/*turbopackIgnore: true*/ process.env.CONTENT_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".storage", "content"), "settings.json");
  let mtime = 0;
  try {
    mtime = statSync(file).mtimeMs;
  } catch {
    return current;
  }
  if (mtime !== seen) {
    seen = mtime;
    try {
      current = (JSON.parse(readFileSync(file, "utf8")) as { company?: CompanySettings }).company ?? {};
      applyCompany(current);
    } catch {
      /* keep the last good values */
    }
  }
  return current;
}

ensureCompany();
