import "server-only";
import { db } from "@/lib/admin/db";

/** Saved replies for staff, shared by the whole team. {name} becomes the traveller's first name. */
export type SavedReply = { id: string; title: string; body: string };

const STARTERS: SavedReply[] = [
  { id: "passport", title: "Clearer passport copy", body: "Namaste {name}, thank you for the passport copy. Could you please upload a clearer photo of the photo page? All four corners and the two lines at the bottom need to be readable for your permits." },
  { id: "insurance", title: "Insurance must cover helicopter rescue", body: "Namaste {name}, please make sure your travel insurance covers helicopter rescue up to the highest altitude of your trip. Could you upload the policy (PDF or photo) on your trip page?" },
  { id: "flights", title: "Flight details for pickup", body: "Namaste {name}, could you add your arrival flight number and time on your trip page (Your details → Flights)? Our driver will meet you at Kathmandu airport with a name board." },
  { id: "photo", title: "Passport photo for permits", body: "Namaste {name}, for your trekking permits we need one passport-size photo per traveller. A clear phone photo against a light wall is perfect; please upload it on your trip page." },
  { id: "thanks", title: "Thank you, all received", body: "Thank you {name}, we have received everything. We'll be in touch a week before your trip with the final details. Dhanyabad!" },
];

export async function savedReplies(): Promise<SavedReply[]> {
  const row = await db.setting.findUnique({ where: { key: "savedReplies" } });
  const v = row?.value;
  return Array.isArray(v) ? (v as SavedReply[]) : STARTERS;
}

export async function writeReplies(list: SavedReply[]) {
  const value = list.slice(0, 60).map((r) => ({ id: String(r.id).slice(0, 40), title: String(r.title).slice(0, 80), body: String(r.body).slice(0, 2000) }));
  await db.setting.upsert({ where: { key: "savedReplies" }, create: { key: "savedReplies", value, public: false }, update: { value } });
}
