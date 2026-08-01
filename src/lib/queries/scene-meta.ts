import { LOW_CONFIDENCE } from "@/lib/dto";

export type LineForReview = { characterId: string | null; confidence: number };

/**
 * Intervenciones que el DM tiene que revisar a mano.
 *
 * El mismo umbral que usa la interfaz para pintar la fila en ámbar: si los dos
 * criterios divergieran, la barra lateral anunciaría un número de pendientes
 * que no coincide con lo que se ve en el guion.
 */
export function countPendingReview(lines: readonly LineForReview[]): number {
  return lines.filter(
    (line) => line.characterId === null || line.confidence < LOW_CONFIDENCE,
  ).length;
}

/** Primeras palabras del texto crudo, para la columna de la tabla de escenas. */
export function excerptOf(rawText: string, maxLength = 90): string {
  const flat = rawText.replace(/\s+/g, " ").trim();
  if (!flat) return "Sin texto todavía";
  if (flat.length <= maxLength) return flat;
  // Corta por palabra: partir a mitad de una es más difícil de leer de un vistazo.
  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
