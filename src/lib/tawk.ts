/**
 * Tells tawk.to who the visitor is after they book or send an enquiry, so
 * the team sees name, email and reference in the chat. Switchable in
 * Admin → Settings → Features. Does nothing if the chat isn't loaded.
 */
type TawkApi = {
  setAttributes?: (attrs: Record<string, string>, cb?: (err?: unknown) => void) => void;
  addEvent?: (name: string, meta: Record<string, string>, cb?: (err?: unknown) => void) => void;
  onLoad?: () => void;
};
type W = Window & { Tawk_API?: TawkApi; __BCA_TAWK_DETAILS__?: boolean };

export function tellTawk(event: "booking" | "enquiry", info: { name?: string; email?: string; phone?: string; reference?: string; trip?: string }) {
  if (typeof window === "undefined") return;
  const w = window as W;
  if (w.__BCA_TAWK_DETAILS__ === false) return;
  const clip = (s?: string) => (s ?? "").trim().slice(0, 200);
  const attrs: Record<string, string> = {};
  if (info.name) attrs.name = clip(info.name);
  if (info.email) attrs.email = clip(info.email);
  if (info.phone) attrs.phone = clip(info.phone);
  if (info.reference) attrs.reference = clip(info.reference);
  if (info.trip) attrs["last-trip"] = clip(info.trip);
  const meta: Record<string, string> = { reference: clip(info.reference), trip: clip(info.trip) };
  const send = () => {
    try {
      w.Tawk_API?.setAttributes?.(attrs, () => undefined);
      w.Tawk_API?.addEvent?.(event === "booking" ? "booking-started" : "enquiry-sent", meta, () => undefined);
    } catch {
      /* the chat is optional */
    }
  };
  if (w.Tawk_API?.setAttributes) send();
  else if (w.Tawk_API) {
    const prev = w.Tawk_API.onLoad;
    w.Tawk_API.onLoad = () => {
      prev?.();
      send();
    };
  }
}
