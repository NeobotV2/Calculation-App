import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge kennt die semantischen Design-Tokens aus `index.css` nicht von
 * selbst. Ohne diese Erweiterung würde z. B. `text-label` als Textfarbe gelten
 * und `cn("text-label", "text-muted-foreground")` die Schriftgröße verwerfen.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["overline", "label", "h1", "h2", "h3", "kpi", "money", "display"],
      shadow: ["surface", "raised", "overlay"],
    },
    classGroups: {
      z: [{ z: ["sticky", "nav", "overlay", "toast", "skip"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Negative Zahlen mit typografischem Minus (U+2212) wie `formatMoney`;
 * ein auf null gerundeter Wert verliert das Vorzeichen („-0,0" → „0,0").
 */
export function withMinusSign(formatted: string): string {
  if (!formatted.startsWith("-")) return formatted;
  const abs = formatted.slice(1);
  return /[1-9]/.test(abs) ? `\u2212${abs}` : abs;
}

/** Lange Komposita der Oberfläche mit Trennstelle (Präfix, Rest). */
const SOFT_HYPHEN_BREAKS: ReadonlyArray<readonly [string, string]> = [
  ["Unterhalts", "reinigung"],
  ["Hausmeister", "service"],
  ["Verhandlungs", "spielraum"],
  ["Wohnungs", "wirtschaft"],
  ["Nach", "kalkulation"],
  ["Wirtschaft", "lichkeit"],
  ["Deckungs", "beitrag"],
  ["Verrechnungs", "satz"],
  ["Jahres", "mittel"],
  ["Gesundheits", "wesen"],
];

/**
 * Setzt weiche Trennstellen (U+00AD) in bekannte lange Wörter: Ohne deutsches
 * Silbentrennungswörterbuch bricht `hyphens: auto` sonst mitten im Wort ohne
 * Bindestrich („Hausmeisterservi|ce"). Nur für sichtbaren Text, nicht für
 * Vergleiche oder zugängliche Namen.
 */
export function softHyphenate(text: string): string {
  let out = text;
  for (const [head, tail] of SOFT_HYPHEN_BREAKS) {
    out = out.replace(new RegExp(`(${head})(${tail})`, "gi"), "$1\u00AD$2");
  }
  return out;
}

export function formatCurrency(amount: number): string {
  return withMinusSign(
    amount.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
}

export function formatNumber(amount: number, decimals: number = 2): string {
  return withMinusSign(
    amount.toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );
}

/**
 * German-formatted monetary number WITHOUT the currency symbol
 * (e.g. 22.5 → "22,50"). Use when the "€" suffix is rendered separately.
 * Canonical replacement for the per-page `fmtEuro` helpers.
 */
export function formatEuro(amount: number): string {
  return formatNumber(amount, 2);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Liest eine vom Nutzer eingegebene Dezimalzahl (deutsch oder technisch):
 * "1.234,5" → 1234.5 · "12,5" → 12.5 · "1234.5" → 1234.5 · "-3" → -3.
 * Leere oder ungültige Eingaben ergeben `undefined`.
 *
 * Regeln:
 * - Leerzeichen (auch geschützte) und ein führendes „+" werden ignoriert,
 *   ein Unicode-Minus (U+2212) gilt als Minus.
 * - Kommen „," und „." vor, ist das zuletzt stehende Zeichen das
 *   Dezimaltrennzeichen, das andere die Tausendergruppierung.
 * - Nur „,": Dezimaltrennzeichen (mehrfach → ungültig).
 * - Nur „.": deutsche Tausendergruppierung, wenn jede Gruppe nach einem Punkt
 *   genau 3 Ziffern hat und vorne 1–3 Ziffern ohne führende Null stehen
 *   („1.200" → 1200, „1.234.567"); sonst ist ein einzelner Punkt das
 *   Dezimaltrennzeichen („1234.5", „0.5", „1.25").
 * - `thousandsDot: false` (Felder mit 3+ Nachkommastellen, z. B. Länge in m
 *   vom Laser-Messgerät): ein einzelner Punkt ist immer Dezimaltrennzeichen
 *   („4.375" → 4,375).
 */
export function parseDecimal(input: string, options: { thousandsDot?: boolean } = {}): number | undefined {
  const thousandsDot = options.thousandsDot ?? true;
  if (typeof input !== "string") return undefined;
  let s = input.replace(/[\s  ]/g, "").replace(/−/g, "-");
  if (s.startsWith("+")) s = s.slice(1);
  if (s === "" || s === "-") return undefined;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const groupSep = decimalSep === "," ? "." : ",";
    const [intPart, fracPart, ...rest] = s.split(decimalSep);
    if (rest.length > 0 || fracPart === undefined) return undefined;
    if (!/^-?\d{1,3}([.,]\d{3})*$/.test(intPart) || intPart.includes(decimalSep)) return undefined;
    normalized = `${intPart.split(groupSep).join("")}.${fracPart}`;
  } else if (lastComma >= 0) {
    const parts = s.split(",");
    if (parts.length !== 2) return undefined;
    normalized = `${parts[0]}.${parts[1]}`;
  } else if (lastDot >= 0) {
    const parts = s.split(".");
    if (parts.length > 2) {
      if (!/^-?\d{1,3}(\.\d{3})+$/.test(s)) return undefined;
      normalized = parts.join("");
    } else {
      normalized = thousandsDot && /^-?[1-9]\d{0,2}\.\d{3}$/.test(s) ? parts.join("") : s;
    }
  } else {
    normalized = s;
  }

  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}
