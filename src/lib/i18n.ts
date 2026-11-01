import { getFeatures } from "@/lib/content";
import { LANGS, type Lang } from "@/lib/features";
import { abs } from "@/lib/seo";
import type { Trip, TripTranslation } from "@/lib/types";

/**
 * Translated trip pages (/de/trip/…, /fr/trip/…, /es/trip/…). A language
 * page exists only when the language is switched on (Settings → Features)
 * AND that trip's translation is published with real content. Everything
 * else on the page (prices, photos, altitude chart) comes from the English trip.
 */
export { LANGS, type Lang };
export const LANG_KEYS = Object.keys(LANGS) as Lang[];
export const isLang = (s: string): s is Lang => (LANG_KEYS as string[]).includes(s);

export function translation(trip: Trip, lang: Lang): TripTranslation | null {
  if (!getFeatures().languages[lang]) return null;
  const t = trip.translations?.[lang];
  if (!t || !t.published || !t.title?.trim() || !t.summary?.trim() || !(t.overview?.trim() || t.itinerary?.length)) return null;
  return t;
}

export const tripPath = (slug: string, lang?: Lang | "en") => (lang && lang !== "en" ? `/${lang}/trip/${slug}/` : `/trip/${slug}/`);

/** The languages a trip is available in (English always first). */
export const tripLangs = (trip: Trip): ("en" | Lang)[] => ["en", ...LANG_KEYS.filter((l) => translation(trip, l))];

/** hreflang alternates for every version of a trip, plus x-default (English). */
export function tripAlternates(trip: Trip) {
  const langs = tripLangs(trip);
  if (langs.length < 2) return undefined;
  return { ...Object.fromEntries(langs.map((l) => [l, abs(tripPath(trip.slug, l))])), "x-default": abs(tripPath(trip.slug)) };
}

export const LANG_NAMES: Record<"en" | Lang, string> = { en: "English", ...LANGS };

/** The words on a translated trip page. */
export const UI: Record<Lang, Record<string, string>> = {
  de: {
    trips: "Unsere Reisen", days: "Tage", from: "ab", perPerson: "pro Person", maxAltitude: "Höchster Punkt", difficulty: "Schwierigkeit", group: "Gruppengröße",
    overview: "Überblick", highlights: "Höhepunkte", itinerary: "Reiseverlauf", day: "Tag", altitude: "Höhenprofil", included: "Im Preis enthalten", excluded: "Nicht enthalten",
    faqs: "Häufige Fragen", book: "Jetzt buchen", ask: "Frage stellen", whatsapp: "Per WhatsApp fragen", reviews: "Bewertungen", englishNote: "Buchung und Zahlung erfolgen auf Englisch über unseren sicheren Partner WeTravel.",
    alsoIn: "Diese Reise auf", plan: "Reise planen", overnight: "Übernachtung", photos: "Fotos",
    whatsappText: "Namaste Base Camp Adventure, ich interessiere mich für die Reise",
  },
  fr: {
    trips: "Nos voyages", days: "jours", from: "à partir de", perPerson: "par personne", maxAltitude: "Altitude max.", difficulty: "Difficulté", group: "Taille du groupe",
    overview: "Aperçu", highlights: "Points forts", itinerary: "Programme", day: "Jour", altitude: "Profil d'altitude", included: "Inclus dans le prix", excluded: "Non inclus",
    faqs: "Questions fréquentes", book: "Réserver", ask: "Poser une question", whatsapp: "Écrire sur WhatsApp", reviews: "Avis", englishNote: "La réservation et le paiement se font en anglais via notre partenaire sécurisé WeTravel.",
    alsoIn: "Ce voyage en", plan: "Planifier", overnight: "Nuit", photos: "Photos",
    whatsappText: "Namaste Base Camp Adventure, je suis intéressé(e) par le voyage",
  },
  es: {
    trips: "Nuestros viajes", days: "días", from: "desde", perPerson: "por persona", maxAltitude: "Altitud máx.", difficulty: "Dificultad", group: "Tamaño del grupo",
    overview: "Resumen", highlights: "Lo más destacado", itinerary: "Itinerario", day: "Día", altitude: "Perfil de altitud", included: "Incluido en el precio", excluded: "No incluido",
    faqs: "Preguntas frecuentes", book: "Reservar", ask: "Hacer una pregunta", whatsapp: "Preguntar por WhatsApp", reviews: "Opiniones", englishNote: "La reserva y el pago se realizan en inglés a través de nuestro socio seguro WeTravel.",
    alsoIn: "Este viaje en", plan: "Planificar", overnight: "Alojamiento", photos: "Fotos",
    whatsappText: "Namaste Base Camp Adventure, me interesa el viaje",
  },
};

export const CHART_WORDS: Record<Lang, { highest: string; day: string; tap: string }> = {
  de: { highest: "Höchster Punkt", day: "Tag", tap: "Tippen Sie auf einen Tag, um die Übernachtung zu sehen." },
  fr: { highest: "Point culminant", day: "jour", tap: "Touchez un jour pour voir où vous dormez." },
  es: { highest: "Punto más alto", day: "día", tap: "Toca un día para ver dónde duermes." },
};

export const DIFFICULTY: Record<Lang, Record<string, string>> = {
  de: { easy: "Leicht", moderate: "Mittel", challenging: "Anspruchsvoll", strenuous: "Sehr anspruchsvoll", difficult: "Schwierig" },
  fr: { easy: "Facile", moderate: "Modérée", challenging: "Exigeante", strenuous: "Très exigeante", difficult: "Difficile" },
  es: { easy: "Fácil", moderate: "Moderada", challenging: "Exigente", strenuous: "Muy exigente", difficult: "Difícil" },
};
