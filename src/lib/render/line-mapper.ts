import { NARRATOR } from "@/lib/ai/prompts/attribution";
import type { AttributedLine } from "@/lib/ai/schemas";

export type KnownCharacter = { id: string; name: string; isNarrator: boolean };

export type MappedLine = {
  order: number;
  characterId: string | null;
  text: string;
  delivery: string | null;
  confidence: number;
  pauseAfter: number;
};

/** El narrador respira más entre bloques que un personaje en mitad de un diálogo. */
export const PAUSE_NARRATOR_MS = 500;
export const PAUSE_CHARACTER_MS = 300;

/**
 * Resuelve los nombres devueltos por Claude contra el reparto real.
 *
 * Es pura y no toca la base de datos para poder verificar los casos raros —
 * mayúsculas distintas, un hablante desconocido, una campaña sin narrador —
 * sin llamar al modelo.
 */
export function mapAttributedLines(
  lines: readonly AttributedLine[],
  characters: readonly KnownCharacter[],
): MappedLine[] {
  const narrator = characters.find((character) => character.isNarrator);
  const byName = new Map(
    characters.map((character) => [character.name.trim().toLowerCase(), character]),
  );

  return lines.map((line, order) => {
    const speaker = line.speaker.trim();
    const character =
      speaker.toUpperCase() === NARRATOR ? narrator : byName.get(speaker.toLowerCase());

    // Sin coincidencia se cae al narrador: perder el texto sería peor que
    // atribuirlo mal, y la confianza baja lo marca para revisión en la UI.
    const resolved = character ?? narrator;

    return {
      order,
      characterId: resolved?.id ?? null,
      text: line.text,
      delivery: line.delivery.trim() || null,
      confidence: character ? line.confidence : 0,
      pauseAfter: resolved?.isNarrator ? PAUSE_NARRATOR_MS : PAUSE_CHARACTER_MS,
    };
  });
}
