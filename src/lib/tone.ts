/**
 * Los estados nunca se comunican sólo con color: siempre color + glifo + palabra.
 * Este módulo fija las tres cosas juntas para que no puedan divergir.
 */
export type Tone = "neutral" | "accent" | "warn" | "ok" | "err";

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-text3",
  accent: "text-accent",
  warn: "text-warn",
  ok: "text-ok",
  err: "text-err",
};

export const TONE_SOFT_BG: Record<Tone, string> = {
  neutral: "bg-transparent",
  accent: "bg-accent-soft",
  warn: "bg-warn-soft",
  ok: "bg-ok-soft",
  err: "bg-err-soft",
};

/** Glifos tipográficos; no hay librería de iconos ni emoji en todo el proyecto. */
export const GLYPH = {
  generated: "✓",
  pool: "≡",
  library: "★",
  assigning: "↻",
  failed: "!",
  review: "?",
  play: "▶",
  pause: "❚❚",
  close: "✕",
  add: "+",
  arrow: "→",
  swap: "⇄",
  chevron: "▾",
  down: "↓",
  dot: "·",
} as const;

/**
 * Color por personaje: hue estable derivado del id.
 *
 * Se deriva y no se guarda para que un personaje conserve su color sin
 * migración ni columna extra. La paleta está acotada a tonos que se distinguen
 * entre sí sobre los dos temas.
 */
const HUES = [25, 268, 150, 320, 95, 200, 345, 60, 240, 130, 290, 15];

export function characterHue(id: string): number {
  let sum = 0;
  for (let index = 0; index < id.length; index++) {
    sum = (sum * 31 + id.charCodeAt(index)) >>> 0;
  }
  return HUES[sum % HUES.length] ?? HUES[0] ?? 25;
}

export function characterColor(id: string): string {
  return `oklch(0.66 0.13 ${characterHue(id)})`;
}

/** Mismo hue, translúcido: fondo de los monogramas de campaña. */
export function campaignTint(id: string): string {
  return `oklch(0.66 0.13 ${characterHue(id)} / 0.28)`;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "··";
  if (words.length === 1) return (words[0] ?? "").slice(0, 2).toUpperCase();
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}
