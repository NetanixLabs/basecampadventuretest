import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { Denied, assertUser, can } from "@/lib/admin/guards";
import { getBrand, saveBrand } from "@/lib/server/receipt-brand";
import { inkOnly } from "@/lib/server/ink";
import { readFileData, removePrivate, writePrivate } from "@/lib/server/portal";

export const dynamic = "force-dynamic";

/** Upload the signature or the company stamp (kept encrypted, never public). */
export async function POST(req: Request) {
  try {
    const { user } = await assertUser("settings");
    if (Number(req.headers.get("content-length") ?? 0) > 4_000_000) return NextResponse.json({ error: "Images can be up to 3 MB." }, { status: 413 });
    const form = await req.formData();
    const kind = form.get("kind");
    const file = form.get("file");
    if ((kind !== "signature" && kind !== "stamp") || !(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
    let png: Buffer;
    try {
      // Re-encoded (drops anything hidden in the file). A phone photo on paper has the
      // paper removed so only the ink is kept; a transparent PNG is used as it is.
      png = await inkOnly(Buffer.from(await file.arrayBuffer()), { darken: kind === "stamp" ? 0.1 : 0.4 });
    } catch {
      return NextResponse.json({ error: "That file isn't a usable image. Use PNG (best, with a transparent background) or JPG." }, { status: 400 });
    }
    const brand = await getBrand();
    const old = kind === "signature" ? brand.signatureKey : brand.stampKey;
    const key = await writePrivate(png);
    await saveBrand({ ...brand, [kind === "signature" ? "signatureKey" : "stampKey"]: key });
    if (old) await removePrivate(old);
    await audit(user.id, `receipts.${kind}`, "settings", null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Denied ? e.message : "Upload failed." }, { status: e instanceof Denied ? 403 : 500 });
  }
}

/** Preview in the admin only. */
export async function GET(req: Request) {
  try {
    const { user } = await assertUser();
    if (!can(user, "settings") && !can(user, "receipts")) throw new Denied("No access.");
    const kind = new URL(req.url).searchParams.get("kind");
    const brand = await getBrand();
    const key = kind === "signature" ? brand.signatureKey : kind === "stamp" ? brand.stampKey : null;
    if (!key) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(new Uint8Array(await readFileData(key)), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

/** Remove the signature or stamp. */
export async function DELETE(req: Request) {
  try {
    const { user } = await assertUser("settings");
    const kind = new URL(req.url).searchParams.get("kind");
    if (kind !== "signature" && kind !== "stamp") return new NextResponse("Bad request", { status: 400 });
    const brand = await getBrand();
    const key = kind === "signature" ? brand.signatureKey : brand.stampKey;
    await saveBrand({ ...brand, [kind === "signature" ? "signatureKey" : "stampKey"]: null });
    if (key) await removePrivate(key);
    await audit(user.id, `receipts.${kind}.remove`, "settings", null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Denied ? e.message : "Failed." }, { status: e instanceof Denied ? 403 : 500 });
  }
}
