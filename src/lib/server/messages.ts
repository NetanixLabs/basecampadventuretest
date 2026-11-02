import "server-only";
import { db } from "@/lib/admin/db";
import { decrypt, encrypt } from "@/lib/admin/crypto";
import { MAX_FILE, readFileData, sniff, writePrivate } from "@/lib/server/portal";

/**
 * Messages between a traveller and the office. The text is encrypted with
 * AES-256-GCM before it reaches the database and attachments are encrypted
 * in the private folder, so a database copy or backup reveals nothing. Emails
 * only say that a message is waiting, never what it says.
 */
const PREFIX = "enc1:";
export const MAX_TEXT = 4000;

export const seal = (text: string) => PREFIX + encrypt(text);

export function unseal(body: string): string {
  if (!body.startsWith(PREFIX)) return body;
  try {
    return decrypt(body.slice(PREFIX.length));
  } catch {
    return "[This message could not be decrypted]";
  }
}

export type ChatMessage = {
  id: string;
  fromOffice: boolean;
  authorName: string;
  body: string;
  at: string;
  readAt: string | null;
  file: { name: string; mime: string; size: number } | null;
};

/** Clean text: no control characters, no HTML, sensible length. */
export function cleanText(input: unknown) {
  return String(input ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/<[^>]*>/g, "").trim().slice(0, MAX_TEXT);
}

export async function thread(bookingId: string): Promise<ChatMessage[]> {
  const rows = await db.portalMessage.findMany({ where: { bookingId }, orderBy: { createdAt: "asc" }, take: 500 });
  // Older plain-text messages are encrypted the first time they are read.
  const plain = rows.filter((r) => !r.body.startsWith(PREFIX));
  for (const r of plain) await db.portalMessage.update({ where: { id: r.id }, data: { body: seal(r.body) } });
  return rows.map((r) => ({
    id: r.id,
    fromOffice: r.fromOffice,
    authorName: r.authorName,
    body: unseal(r.body),
    at: r.createdAt.toISOString(),
    readAt: r.readAt?.toISOString() ?? null,
    file: r.fileKey && r.fileName ? { name: r.fileName, mime: r.fileMime ?? "application/octet-stream", size: r.fileSize ?? 0 } : null,
  }));
}

/** Marks what the other side sent as read by this side. */
export async function markRead(bookingId: string, reader: "office" | "traveller") {
  await db.portalMessage.updateMany({ where: { bookingId, fromOffice: reader === "traveller", readAt: null }, data: { readAt: new Date() } });
}

export async function unreadFor(bookingId: string, reader: "office" | "traveller") {
  return db.portalMessage.count({ where: { bookingId, fromOffice: reader === "traveller", readAt: null } });
}

export async function postMessage(input: { bookingId: string; fromOffice: boolean; authorName: string; text: string; file?: File | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const text = cleanText(input.text);
  const f = input.file && input.file.size > 0 ? input.file : null;
  if (!text && !f) return { ok: false, error: "Write a message or attach a file." };
  let file: { fileKey: string; fileName: string; fileMime: string; fileSize: number } | null = null;
  if (f) {
    if (f.size > MAX_FILE) return { ok: false, error: "Files can be up to 10 MB." };
    const buf = Buffer.from(await f.arrayBuffer());
    const type = sniff(buf);
    if (!type) return { ok: false, error: "Only PDF, JPG, PNG, WEBP or HEIC files." };
    const base = f.name.replace(/\.[^.]*$/, "").replace(/[^\w\s.-]/g, "").trim().slice(0, 80) || "file";
    file = { fileKey: await writePrivate(buf), fileName: `${base}.${type.ext}`, fileMime: type.mime, fileSize: buf.length };
  }
  await db.portalMessage.create({ data: { bookingId: input.bookingId, fromOffice: input.fromOffice, authorName: input.authorName.slice(0, 80), body: seal(text), ...(file ?? {}) } });
  return { ok: true };
}

/** Decrypted attachment, for the routes that have already checked who is asking. */
export async function attachment(id: string) {
  const m = await db.portalMessage.findUnique({ where: { id } });
  if (!m?.fileKey) return null;
  return { bookingId: m.bookingId, name: m.fileName ?? "file", mime: m.fileMime ?? "application/octet-stream", data: await readFileData(m.fileKey) };
}

export function fileHeaders(name: string, mime: string, inline = false) {
  return {
    "Content-Type": mime,
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/["\\\r\n]/g, "")}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
  };
}
