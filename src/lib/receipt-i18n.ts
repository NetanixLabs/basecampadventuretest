/**
 * Receipt, bill and credit note wording in English, German, French and
 * Spanish, with the amount written out in words in each language.
 */
export type DocLang = "en" | "de" | "fr" | "es";
export const DOC_LANGS: DocLang[] = ["en", "de", "fr", "es"];
export const asDocLang = (s: unknown): DocLang => (DOC_LANGS.includes(s as DocLang) ? (s as DocLang) : "en");
export const LOCALE: Record<DocLang, string> = { en: "en-GB", de: "de-DE", fr: "fr-FR", es: "es-ES" };

/** What a document is called, for the admin and the verification page (English). */
export const KIND_NAME: Record<string, string> = { receipt: "Receipt", bill: "Bill", credit: "Credit note" };

const T = {
  receiptTitle: ["PAYMENT RECEIPT", "ZAHLUNGSBELEG", "REÇU DE PAIEMENT", "RECIBO DE PAGO"],
  billTitle: ["BILL", "RECHNUNG", "FACTURE", "FACTURA"],
  creditTitle: ["CREDIT NOTE", "GUTSCHRIFT", "AVOIR", "NOTA DE CRÉDITO"],
  receiptSub: ["Official payment receipt", "Offizieller Zahlungsbeleg", "Reçu de paiement officiel", "Recibo de pago oficial"],
  billSub: ["Bill for services", "Rechnung für Leistungen", "Facture de services", "Factura por servicios"],
  creditSub: ["Refund of a payment", "Erstattung einer Zahlung", "Remboursement d'un paiement", "Reembolso de un pago"],
  receiptNo: ["Receipt no.", "Beleg-Nr.", "N° de reçu", "N.º de recibo"],
  billNo: ["Bill no.", "Rechnungs-Nr.", "N° de facture", "N.º de factura"],
  creditNo: ["Credit note no.", "Gutschrift-Nr.", "N° d'avoir", "N.º de nota"],
  date: ["Date", "Datum", "Date", "Fecha"],
  paidOn: ["Paid on", "Bezahlt am", "Payé le", "Pagado el"],
  refundedOn: ["Refunded on", "Erstattet am", "Remboursé le", "Reembolsado el"],
  status: ["Status", "Status", "Statut", "Estado"],
  awaiting: ["Awaiting payment", "Zahlung ausstehend", "En attente", "Pendiente de pago"],
  receivedFrom: ["RECEIVED FROM", "ERHALTEN VON", "REÇU DE", "RECIBIDO DE"],
  billedTo: ["BILLED TO", "RECHNUNG AN", "FACTURÉ À", "FACTURADO A"],
  refundedTo: ["REFUNDED TO", "ERSTATTET AN", "REMBOURSÉ À", "REEMBOLSADO A"],
  method: ["PAYMENT METHOD", "ZAHLUNGSART", "MODE DE PAIEMENT", "MÉTODO DE PAGO"],
  refundMethod: ["REFUNDED VIA", "ERSTATTET ÜBER", "REMBOURSÉ PAR", "REEMBOLSADO POR"],
  description: ["DESCRIPTION", "BESCHREIBUNG", "DESCRIPTION", "DESCRIPCIÓN"],
  qty: ["QTY", "MENGE", "QTÉ", "CANT."],
  unit: ["UNIT", "EINZELPREIS", "PRIX UNIT.", "PRECIO UNIT."],
  amount: ["AMOUNT", "BETRAG", "MONTANT", "IMPORTE"],
  subtotal: ["Subtotal", "Zwischensumme", "Sous-total", "Subtotal"],
  vat: ["VAT", "MwSt.", "TVA", "IVA"],
  includesVat: ["Includes VAT", "Inkl. MwSt.", "Dont TVA", "IVA incluido"],
  amountReceived: ["Amount received", "Erhaltener Betrag", "Montant reçu", "Importe recibido"],
  amountDue: ["Amount due", "Fälliger Betrag", "Montant dû", "Importe a pagar"],
  amountRefunded: ["Amount refunded", "Erstatteter Betrag", "Montant remboursé", "Importe reembolsado"],
  inWords: ["AMOUNT IN WORDS", "BETRAG IN WORTEN", "MONTANT EN LETTRES", "IMPORTE EN LETRAS"],
  bookingBalance: ["BOOKING BALANCE", "BUCHUNGSSALDO", "SOLDE DE LA RÉSERVATION", "SALDO DE LA RESERVA"],
  tripPrice: ["Trip price", "Reisepreis", "Prix du voyage", "Precio del viaje"],
  discount: ["Discount", "Rabatt", "Remise", "Descuento"],
  code: ["code", "Code", "code", "código"],
  totalAfterDiscount: ["Trip total after discount", "Reisepreis nach Rabatt", "Total après remise", "Total tras descuento"],
  tripTotal: ["Trip total", "Reisepreis gesamt", "Total du voyage", "Total del viaje"],
  paidBefore: ["Paid before (advance)", "Bereits bezahlt (Anzahlung)", "Déjà payé (acompte)", "Pagado antes (anticipo)"],
  thisPayment: ["This payment", "Diese Zahlung", "Ce paiement", "Este pago"],
  paidSoFar: ["Total paid so far", "Bisher bezahlt", "Total payé à ce jour", "Total pagado hasta ahora"],
  balanceDue: ["Balance due", "Restbetrag", "Solde à payer", "Saldo pendiente"],
  paid: ["PAID", "BEZAHLT", "PAYÉ", "PAGADO"],
  advanceReceived: ["Advance received", "Anzahlung erhalten", "Acompte reçu", "Anticipo recibido"],
  received: ["Received", "Erhalten", "Reçu", "Recibido"],
  paymentDue: ["PAYMENT DUE", "ZAHLUNG FÄLLIG", "PAIEMENT DÛ", "PAGO PENDIENTE"],
  refunded: ["REFUNDED", "ERSTATTET", "REMBOURSÉ", "REEMBOLSADO"],
  cancelled: ["CANCELLED", "STORNIERT", "ANNULÉ", "ANULADO"],
  notValid: ["Not valid for payment", "Nicht gültig", "Non valable", "No válido"],
  reason: ["Reason", "Grund", "Motif", "Motivo"],
  notes: ["NOTES", "ANMERKUNGEN", "REMARQUES", "NOTAS"],
  bank: ["BANK DETAILS", "BANKVERBINDUNG", "COORDONNÉES BANCAIRES", "DATOS BANCARIOS"],
  verify: ["VERIFY THIS DOCUMENT", "DOKUMENT PRÜFEN", "VÉRIFIER CE DOCUMENT", "VERIFICAR ESTE DOCUMENTO"],
  verifyText: [
    "Scan the QR code, or go to {site}/verify and enter the document number and this code.",
    "QR-Code scannen oder {site}/verify öffnen und die Dokumentnummer und diesen Code eingeben.",
    "Scannez le QR code ou allez sur {site}/verify et saisissez le numéro du document et ce code.",
    "Escanee el código QR o visite {site}/verify e introduzca el número del documento y este código.",
  ],
  verifyCode: ["VERIFICATION CODE", "PRÜFCODE", "CODE DE VÉRIFICATION", "CÓDIGO DE VERIFICACIÓN"],
  fingerprint: ["SECURITY FINGERPRINT", "SICHERHEITSMERKMAL", "EMPREINTE DE SÉCURITÉ", "HUELLA DE SEGURIDAD"],
  mismatch: ["MISMATCH: DO NOT ACCEPT", "UNGÜLTIG: NICHT AKZEPTIEREN", "INVALIDE : NE PAS ACCEPTER", "NO COINCIDE: NO ACEPTAR"],
  signatory: ["Authorised signatory", "Zeichnungsberechtigt", "Signataire autorisé", "Firma autorizada"],
  issuedBy: ["Issued by", "Ausgestellt von", "Émis par", "Emitido por"],
  against: ["Against receipt {n}", "Zu Beleg {n}", "Relatif au reçu {n}", "Relativa al recibo {n}"],
  // Lines written on automatic receipts.
  tripLine: ["{trip}, starting {date}, {pax} (booking {ref})", "{trip}, ab {date}, {pax} (Buchung {ref})", "{trip}, départ le {date}, {pax} (réservation {ref})", "{trip}, salida el {date}, {pax} (reserva {ref})"],
  traveller: ["traveller", "Reisende/r", "voyageur", "viajero"],
  travellers: ["travellers", "Reisende", "voyageurs", "viajeros"],
  viaWetravel: ["Card via WeTravel", "Karte über WeTravel", "Carte via WeTravel", "Tarjeta vía WeTravel"],
  viaHbl: ["Card via Himalayan Bank", "Karte über Himalayan Bank", "Carte via Himalayan Bank", "Tarjeta vía Himalayan Bank"],
  atOffice: ["Paid at the office", "Im Büro bezahlt", "Payé au bureau", "Pagado en la oficina"],
} satisfies Record<string, [string, string, string, string]>;

export type DocKey = keyof typeof T;
const IDX: Record<DocLang, number> = { en: 0, de: 1, fr: 2, es: 3 };
export const t = (lang: DocLang, key: DocKey, vars: Record<string, string | number> = {}) => T[key][IDX[lang]].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

/** Money as written in that language (plain spaces, so every PDF font has the glyphs). */
export function fmtMoney(n: number, cur: string, lang: DocLang = "en") {
  const sym = cur === "USD" ? "US$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : cur === "NPR" ? "Rs" : cur;
  const num = n.toLocaleString(LOCALE[lang] === "en-GB" ? "en-US" : LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, " ");
  if (lang === "en") return `${sym}${cur === "NPR" || sym.length > 3 ? " " : ""}${num}`;
  return `${num} ${sym}`;
}
export const fmtDate = (d: Date, lang: DocLang = "en") => d.toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" });

// ---- Amounts in words ----

const EN_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const EN_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function en(n: number): string {
  if (n < 20) return EN_ONES[n];
  if (n < 100) return `${EN_TENS[Math.floor(n / 10)]}${n % 10 ? `-${EN_ONES[n % 10]}` : ""}`;
  if (n < 1000) return `${EN_ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${en(n % 100)}` : ""}`;
  for (const [size, name] of [[1_000_000_000, "Billion"], [1_000_000, "Million"], [1_000, "Thousand"]] as const) if (n >= size) return `${en(Math.floor(n / size))} ${name}${n % size ? ` ${en(n % size)}` : ""}`;
  return String(n);
}

const DE_ONES = ["", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const DE_TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];
/** German numbers are written as one word below a million ("zweitausenddreihundertzwanzig"). */
function de(n: number): string {
  if (n === 0) return "null";
  const below100 = (x: number) => (x < 20 ? DE_ONES[x] : `${x % 10 ? `${x % 10 === 1 ? "ein" : DE_ONES[x % 10]}und` : ""}${DE_TENS[Math.floor(x / 10)]}`);
  const below1000 = (x: number) => `${x >= 100 ? `${x >= 200 ? DE_ONES[Math.floor(x / 100)] : "ein"}hundert` : ""}${x % 100 ? below100(x % 100) : ""}`;
  if (n < 1000) return below1000(n);
  if (n < 1_000_000) {
    const th = Math.floor(n / 1000);
    return `${th === 1 ? "ein" : below1000(th)}tausend${n % 1000 ? below1000(n % 1000) : ""}`;
  }
  const m = Math.floor(n / 1_000_000);
  return `${m === 1 ? "eine Million" : `${de(m)} Millionen`}${n % 1_000_000 ? ` ${de(n % 1_000_000)}` : ""}`;
}

const FR_ONES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const FR_TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];
/** French, with the traditional rules (soixante-dix, quatre-vingts, et un). `final`: no other number follows. */
function fr(n: number, final = true): string {
  if (n < 20) return FR_ONES[n];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return `${FR_TENS[t]}${u === 1 ? " et un" : u ? `-${FR_ONES[u]}` : ""}`;
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${FR_ONES[n - 60]}`;
  if (n < 100) return n === 80 ? (final ? "quatre-vingts" : "quatre-vingt") : `quatre-vingt-${FR_ONES[n - 80]}`;
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const head = h === 1 ? "cent" : `${FR_ONES[h]} cent${!r && final ? "s" : ""}`;
    return r ? `${head} ${fr(r, final)}` : head;
  }
  if (n < 1_000_000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    const head = th === 1 ? "mille" : `${fr(th, false)} mille`;
    return r ? `${head} ${fr(r, final)}` : head;
  }
  const m = Math.floor(n / 1_000_000);
  const r = n % 1_000_000;
  return `${m === 1 ? "un million" : `${fr(m, false)} millions`}${r ? ` ${fr(r, final)}` : ""}`;
}

const ES_ONES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const ES_TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const ES_HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
/** Spanish; "uno" becomes "un"/"veintiún" before "mil", "millones" and the currency. */
function es(n: number): string {
  const below100 = (x: number) => (x < 30 ? ES_ONES[x] : `${ES_TENS[Math.floor(x / 10)]}${x % 10 ? ` y ${ES_ONES[x % 10]}` : ""}`);
  const below1000 = (x: number) => (x === 100 ? "cien" : `${x >= 100 ? ES_HUNDREDS[Math.floor(x / 100)] : ""}${x >= 100 && x % 100 ? " " : ""}${x % 100 ? below100(x % 100) : ""}`);
  const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
  if (n === 0) return "cero";
  if (n < 1000) return below1000(n);
  if (n < 1_000_000) {
    const th = Math.floor(n / 1000);
    return `${th === 1 ? "mil" : `${apocope(below1000(th))} mil`}${n % 1000 ? ` ${below1000(n % 1000)}` : ""}`;
  }
  const m = Math.floor(n / 1_000_000);
  return `${m === 1 ? "un millón" : `${apocope(es(m))} millones`}${n % 1_000_000 ? ` ${es(n % 1_000_000)}` : ""}`;
}

const CUR: Record<DocLang, Record<string, [string, string]>> = {
  en: { USD: ["US Dollars", "Cents"], EUR: ["Euros", "Cents"], GBP: ["Pounds Sterling", "Pence"], AUD: ["Australian Dollars", "Cents"], NPR: ["Nepalese Rupees", "Paisa"], INR: ["Indian Rupees", "Paise"], CNY: ["Chinese Yuan", "Fen"] },
  de: { USD: ["US-Dollar", "Cent"], EUR: ["Euro", "Cent"], GBP: ["Pfund Sterling", "Pence"], AUD: ["Australische Dollar", "Cent"], NPR: ["Nepalesische Rupien", "Paisa"], INR: ["Indische Rupien", "Paise"], CNY: ["Yuan", "Fen"] },
  fr: { USD: ["dollars américains", "cents"], EUR: ["euros", "centimes"], GBP: ["livres sterling", "pence"], AUD: ["dollars australiens", "cents"], NPR: ["roupies népalaises", "paisa"], INR: ["roupies indiennes", "paise"], CNY: ["yuans", "fen"] },
  es: { USD: ["dólares estadounidenses", "centavos"], EUR: ["euros", "céntimos"], GBP: ["libras esterlinas", "peniques"], AUD: ["dólares australianos", "centavos"], NPR: ["rupias nepalesas", "paisas"], INR: ["rupias indias", "paisas"], CNY: ["yuanes", "fen"] },
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "US Dollars Two Thousand Three Hundred Twenty and Fifty Cents Only", in the document's language. */
export function amountInWords(amount: number, currency: string, lang: DocLang = "en") {
  const c = Math.round(Math.abs(amount) * 100);
  const major = Math.floor(c / 100);
  const minor = c % 100;
  const [big, small] = CUR[lang][currency] ?? [currency, lang === "en" ? "Cents" : "cent"];
  if (lang === "en") return `${big} ${major ? en(major) : "Zero"}${minor ? ` and ${en(minor)} ${small}` : ""} Only`;
  if (lang === "de") return `${cap(de(major))} ${big}${minor ? ` und ${de(minor)} ${small}` : ""}`;
  if (lang === "fr") return `${cap(fr(major))} ${big}${minor ? ` et ${fr(minor)} ${small}` : ""}`;
  const esMajor = major === 1 ? "un" : es(major).replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
  return `${cap(esMajor)} ${big}${minor ? ` con ${es(minor).replace(/veintiuno$/, "veintiún").replace(/uno$/, "un")} ${small}` : ""}`;
}
