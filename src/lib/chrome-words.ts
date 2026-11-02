/**
 * The words around a translated trip page (menu, footer, photo slider) in
 * German, French and Spanish. Keyed by the English text; anything missing
 * stays in English. Safe in the browser.
 */
export type ChromeLang = "de" | "fr" | "es";

export const langOfPath = (path: string | null | undefined): ChromeLang | null => {
  const m = /^\/(de|fr|es)\//.exec(path ?? "");
  return m ? (m[1] as ChromeLang) : null;
};

const W: Record<ChromeLang, Record<string, string>> = {
  de: {
    "Our trips": "Unsere Reisen", Destinations: "Reiseziele", "Visa Info": "Visum", Journal: "Magazin", "Our Affiliation": "Mitgliedschaften", "About us": "Über uns", Contact: "Kontakt",
    "Nepal Trekking": "Trekking in Nepal", "Nepal Tours": "Nepal-Rundreisen", "Helicopter Tours": "Helikopterflüge", "Day Tours": "Tagestouren", "Peak Climbing / Expeditions": "Gipfeltouren / Expeditionen",
    Nepal: "Nepal", Tibet: "Tibet", Bhutan: "Bhutan", "Nepal Visa": "Visum Nepal", "Tibet Visa": "Visum Tibet", "Bhutan Visa": "Visum Bhutan",
    "Fees, documents & application steps": "Gebühren, Unterlagen und Antrag", trips: "Reisen", tours: "Touren", "Available Now": "Jetzt erreichbar", "Call 24/7": "24/7 anrufen", Email: "E-Mail",
    "Your time. Your interests. Your trip.": "Ihre Zeit. Ihre Interessen. Ihre Reise.", "Let's make": "Lassen Sie uns", "a plan.": "planen.",
    "Choose an itinerary or talk to our local team about a journey built around you.": "Wählen Sie eine Route oder sprechen Sie mit unserem Team vor Ort über eine Reise, die zu Ihnen passt.",
    "Plan your trip": "Reise planen", Newsletter: "Newsletter", "Trip ideas and festival offers, by email.": "Reiseideen und Festival-Angebote per E-Mail.",
    "Popular treks": "Beliebte Treks", Company: "Unternehmen", "Get in touch": "Kontakt", "We Accept": "Wir akzeptieren", "Our affiliations": "Mitgliedschaften",
    "Our story": "Unsere Geschichte", "Our Team": "Unser Team", "Why Travel With Us?": "Warum mit uns reisen?", "Community & social work": "Soziales Engagement", "Photo Gallery": "Fotogalerie",
    "Legal Documents": "Rechtliche Dokumente", "Terms and Conditions": "Reisebedingungen", "Online Payment": "Online-Zahlung",
    "Photo credits": "Bildnachweise", "Privacy Policy": "Datenschutz", Terms: "AGB", "Contact Us": "Kontakt", "Back to top": "Nach oben", "All rights reserved.": "Alle Rechte vorbehalten.",
    "[Available 24/7]": "[24/7 erreichbar]", "View {n} photos": "{n} Fotos ansehen", "Previous photo": "Vorheriges Foto", "Next photo": "Nächstes Foto",
    "Your email address": "Ihre E-Mail-Adresse",
    "Email address": "E-Mail-Adresse",
    "Sign up": "Anmelden",
    "You're on the list. Dhanyabad!": "Sie sind angemeldet. Dhanyabad!",
    "Founded in 2009 by an experienced local guide, Base Camp Adventure has been creating authentic and enriching travel experiences throughout Nepal.": "2009 von einem erfahrenen einheimischen Bergführer gegründet, gestaltet Base Camp Adventure authentische und bereichernde Reisen in ganz Nepal.",
  },
  fr: {
    "Our trips": "Nos voyages", Destinations: "Destinations", "Visa Info": "Visas", Journal: "Magazine", "Our Affiliation": "Nos affiliations", "About us": "À propos", Contact: "Contact",
    "Nepal Trekking": "Trekking au Népal", "Nepal Tours": "Circuits au Népal", "Helicopter Tours": "Vols en hélicoptère", "Day Tours": "Excursions d'une journée", "Peak Climbing / Expeditions": "Ascensions / Expéditions",
    Nepal: "Népal", Tibet: "Tibet", Bhutan: "Bhoutan", "Nepal Visa": "Visa Népal", "Tibet Visa": "Visa Tibet", "Bhutan Visa": "Visa Bhoutan",
    "Fees, documents & application steps": "Frais, documents et démarches", trips: "voyages", tours: "circuits", "Available Now": "Disponible", "Call 24/7": "Appeler 24h/24", Email: "E-mail",
    "Your time. Your interests. Your trip.": "Votre temps. Vos envies. Votre voyage.", "Let's make": "Construisons", "a plan.": "votre projet.",
    "Choose an itinerary or talk to our local team about a journey built around you.": "Choisissez un itinéraire ou parlez à notre équipe locale d'un voyage fait pour vous.",
    "Plan your trip": "Préparer mon voyage", Newsletter: "Newsletter", "Trip ideas and festival offers, by email.": "Idées de voyage et offres de festival, par e-mail.",
    "Popular treks": "Treks populaires", Company: "Entreprise", "Get in touch": "Nous contacter", "We Accept": "Paiements acceptés", "Our affiliations": "Nos affiliations",
    "Our story": "Notre histoire", "Our Team": "Notre équipe", "Why Travel With Us?": "Pourquoi voyager avec nous ?", "Community & social work": "Engagement solidaire", "Photo Gallery": "Galerie photos",
    "Legal Documents": "Documents légaux", "Terms and Conditions": "Conditions générales", "Online Payment": "Paiement en ligne",
    "Photo credits": "Crédits photos", "Privacy Policy": "Confidentialité", Terms: "Conditions", "Contact Us": "Contact", "Back to top": "Haut de page", "All rights reserved.": "Tous droits réservés.",
    "[Available 24/7]": "[24h/24, 7j/7]", "View {n} photos": "Voir les {n} photos", "Previous photo": "Photo précédente", "Next photo": "Photo suivante",
    "Your email address": "Votre adresse e-mail",
    "Email address": "Adresse e-mail",
    "Sign up": "S'inscrire",
    "You're on the list. Dhanyabad!": "Vous êtes inscrit. Dhanyabad !",
    "Founded in 2009 by an experienced local guide, Base Camp Adventure has been creating authentic and enriching travel experiences throughout Nepal.": "Fondée en 2009 par un guide local expérimenté, Base Camp Adventure crée des voyages authentiques et enrichissants dans tout le Népal.",
  },
  es: {
    "Our trips": "Nuestros viajes", Destinations: "Destinos", "Visa Info": "Visados", Journal: "Blog", "Our Affiliation": "Afiliaciones", "About us": "Sobre nosotros", Contact: "Contacto",
    "Nepal Trekking": "Trekking en Nepal", "Nepal Tours": "Circuitos por Nepal", "Helicopter Tours": "Vuelos en helicóptero", "Day Tours": "Excursiones de un día", "Peak Climbing / Expeditions": "Ascensiones / Expediciones",
    Nepal: "Nepal", Tibet: "Tíbet", Bhutan: "Bután", "Nepal Visa": "Visado de Nepal", "Tibet Visa": "Visado del Tíbet", "Bhutan Visa": "Visado de Bután",
    "Fees, documents & application steps": "Tasas, documentos y trámites", trips: "viajes", tours: "circuitos", "Available Now": "Disponible", "Call 24/7": "Llamar 24/7", Email: "Correo",
    "Your time. Your interests. Your trip.": "Tu tiempo. Tus intereses. Tu viaje.", "Let's make": "Hagamos", "a plan.": "un plan.",
    "Choose an itinerary or talk to our local team about a journey built around you.": "Elige un itinerario o habla con nuestro equipo local sobre un viaje a tu medida.",
    "Plan your trip": "Planifica tu viaje", Newsletter: "Boletín", "Trip ideas and festival offers, by email.": "Ideas de viaje y ofertas de festivales, por correo.",
    "Popular treks": "Treks populares", Company: "Empresa", "Get in touch": "Contacto", "We Accept": "Aceptamos", "Our affiliations": "Afiliaciones",
    "Our story": "Nuestra historia", "Our Team": "Nuestro equipo", "Why Travel With Us?": "¿Por qué viajar con nosotros?", "Community & social work": "Compromiso social", "Photo Gallery": "Galería de fotos",
    "Legal Documents": "Documentos legales", "Terms and Conditions": "Términos y condiciones", "Online Payment": "Pago en línea",
    "Photo credits": "Créditos de fotos", "Privacy Policy": "Privacidad", Terms: "Condiciones", "Contact Us": "Contacto", "Back to top": "Volver arriba", "All rights reserved.": "Todos los derechos reservados.",
    "[Available 24/7]": "[Disponible 24/7]", "View {n} photos": "Ver {n} fotos", "Previous photo": "Foto anterior", "Next photo": "Foto siguiente",
    "Your email address": "Tu correo electrónico",
    "Email address": "Correo electrónico",
    "Sign up": "Suscribirme",
    "You're on the list. Dhanyabad!": "Ya estás suscrito. ¡Dhanyabad!",
    "Founded in 2009 by an experienced local guide, Base Camp Adventure has been creating authentic and enriching travel experiences throughout Nepal.": "Fundada en 2009 por un guía local experimentado, Base Camp Adventure crea viajes auténticos y enriquecedores por todo Nepal.",
  },
};

export function word(lang: ChromeLang | null, en: string, vars?: Record<string, string | number>): string {
  let s = lang ? W[lang][en] ?? en : en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Region names in the menu ("Everest Region" etc. come from the admin). */
export function regionWord(lang: ChromeLang | null, name: string) {
  if (!lang) return name;
  return W[lang][name] ?? name;
}
