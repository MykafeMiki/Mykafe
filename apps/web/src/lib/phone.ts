/**
 * Prefissi internazionali e normalizzazione dei numeri di telefono.
 *
 * Condiviso tra il flusso asporto online (/ordina) e quello al banco (/banco):
 * la logica sta qui e non nei componenti, cosi' i due flussi non divergono.
 */

// Sigle ISO invece dei nomi dei paesi: l'app e' multilingua e i nomi tradotti
// andrebbero mantenuti in cinque file, mentre "PL +48" si legge uguale ovunque.
// Italia in cima perche' e' il caso normale, poi ordine alfabetico di sigla.
export const EUROPE_PREFIXES = [
  { code: "+39", label: "IT +39" },
  { code: "+376", label: "AD +376" },
  { code: "+355", label: "AL +355" },
  { code: "+43", label: "AT +43" },
  { code: "+32", label: "BE +32" },
  { code: "+359", label: "BG +359" },
  { code: "+387", label: "BA +387" },
  { code: "+375", label: "BY +375" },
  { code: "+41", label: "CH +41" },
  { code: "+357", label: "CY +357" },
  { code: "+420", label: "CZ +420" },
  { code: "+49", label: "DE +49" },
  { code: "+45", label: "DK +45" },
  { code: "+372", label: "EE +372" },
  { code: "+34", label: "ES +34" },
  { code: "+358", label: "FI +358" },
  { code: "+33", label: "FR +33" },
  { code: "+44", label: "GB +44" },
  { code: "+30", label: "GR +30" },
  { code: "+385", label: "HR +385" },
  { code: "+36", label: "HU +36" },
  { code: "+353", label: "IE +353" },
  { code: "+354", label: "IS +354" },
  { code: "+423", label: "LI +423" },
  { code: "+370", label: "LT +370" },
  { code: "+352", label: "LU +352" },
  { code: "+371", label: "LV +371" },
  { code: "+377", label: "MC +377" },
  { code: "+373", label: "MD +373" },
  { code: "+382", label: "ME +382" },
  { code: "+389", label: "MK +389" },
  { code: "+356", label: "MT +356" },
  { code: "+31", label: "NL +31" },
  { code: "+47", label: "NO +47" },
  { code: "+48", label: "PL +48" },
  { code: "+351", label: "PT +351" },
  { code: "+40", label: "RO +40" },
  { code: "+381", label: "RS +381" },
  { code: "+7", label: "RU +7" },
  { code: "+46", label: "SE +46" },
  { code: "+386", label: "SI +386" },
  { code: "+421", label: "SK +421" },
  { code: "+378", label: "SM +378" },
  { code: "+90", label: "TR +90" },
  { code: "+380", label: "UA +380" },
  { code: "+383", label: "XK +383" },
];

// Paesi extra-europei tenuti per i clienti abituali
export const OTHER_PREFIXES = [
  { code: "+1", label: "US/CA +1" },
  { code: "+20", label: "EG +20" },
  { code: "+86", label: "CN +86" },
  { code: "+212", label: "MA +212" },
  { code: "+972", label: "IL +972" },
];

// Valore sentinella della voce "Altro": non e' un prefisso, attiva il campo libero
export const CUSTOM_PREFIX = "custom";

// Prefisso preselezionato in base alla lingua scelta dal cliente
const PREFIX_BY_LOCALE: Record<string, string> = {
  it: "+39",
  en: "+44",
  fr: "+33",
  es: "+34",
  he: "+972",
};

export function defaultPrefixForLocale(locale: string): string {
  return PREFIX_BY_LOCALE[locale] ?? "+39";
}

/** Stato dei campi telefono, gestito dal componente chiamante */
export interface PhoneInputState {
  prefix: string;
  customPrefix: string;
  number: string;
  confirm: string;
}

export function emptyPhoneInput(locale: string): PhoneInputState {
  return { prefix: defaultPrefixForLocale(locale), customPrefix: "", number: "", confirm: "" };
}

/**
 * Normalizza un prefisso digitato a mano: via tutto tranne le cifre, poi "+".
 * I prefissi internazionali esistenti vanno da 1 a 4 cifre (es. +1, +39, +1876).
 */
export function normalizeCustomPrefix(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 1 || digits.length > 4) return null;
  return `+${digits}`;
}

/** Codici di errore: il chiamante li traduce, cosi' questo modulo resta senza i18n */
export type PhoneError = "prefix" | "number" | "confirmMissing" | "confirmMismatch";

/**
 * Valida e compone il numero finale nel formato "+39 3331234567".
 * Restituisce l'errore invece di lanciare, cosi' la form decide cosa mostrare.
 */
export function resolvePhone(
  input: PhoneInputState
): { ok: true; value: string } | { ok: false; error: PhoneError } {
  const prefix =
    input.prefix === CUSTOM_PREFIX ? normalizeCustomPrefix(input.customPrefix) : input.prefix;

  if (!prefix) return { ok: false, error: "prefix" };

  const typed = input.number.trim();
  let digits = typed.replace(/\D/g, "");

  // Se il cliente ha riscritto il prefisso nel campo numero va tolto, per non
  // duplicarlo. Ci si fida solo del "+" esplicito: un cellulare italiano puo'
  // iniziare per 39 (es. 3931234567) e toglierlo alla cieca lo mutilerebbe.
  const prefixDigits = prefix.replace(/\D/g, "");
  if (typed.startsWith("+") && digits.startsWith(prefixDigits)) {
    digits = digits.slice(prefixDigits.length);
  }

  // Zero iniziale scritto per abitudine (es. 0333...): non fa parte del numero
  digits = digits.replace(/^0+/, "");

  if (!digits) return { ok: false, error: "number" };

  const confirm = input.confirm.replace(/\D/g, "");
  if (!confirm || confirm.length < 3) return { ok: false, error: "confirmMissing" };
  if (!digits.startsWith(confirm)) return { ok: false, error: "confirmMismatch" };

  return { ok: true, value: `${prefix} ${digits}` };
}
