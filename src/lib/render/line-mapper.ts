import { NARRATOR } from "@/lib/ai/prompts/attribution";
import type { AttributedLine } from "@/lib/ai/schemas";
import { type PauseContext, pauseAfterFor } from "@/lib/render/pauses";

export type KnownCharacter = { id: string; name: string; isNarrator: boolean };

export type MappedLine = {
  order: number;
  characterId: string | null;
  text: string;
  delivery: string | null;
  confidence: number;
  pauseAfter: number;
};

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

  // Se resuelve todo el reparto antes de calcular pausas: la pausa de una línea
  // depende de quién habla en la siguiente, no sólo de quién habla en ella.
  const resolved = lines.map((line) => {
    const speaker = line.speaker.trim();
    const match =
      speaker.toUpperCase() === NARRATOR ? narrator : byName.get(speaker.toLowerCase());

    // Sin coincidencia se cae al narrador: perder el texto sería peor que
    // atribuirlo mal, y la confianza baja lo marca para revisión en la UI.
    return { line, match, character: match ?? narrator };
  });

  const contextOf = (entry: (typeof resolved)[number]): PauseContext => ({
    characterId: entry.character?.id ?? null,
    isNarrator: entry.character?.isNarrator ?? false,
    text: entry.line.text,
  });

  return resolved.map((entry, order) => {
    const next = resolved[order + 1];

    return {
      order,
      characterId: entry.character?.id ?? null,
      text: entry.line.text,
      delivery: entry.line.delivery.trim() || null,
      confidence: entry.match ? entry.line.confidence : 0,
      pauseAfter: pauseAfterFor(contextOf(entry), next && contextOf(next)),
    };
  });
}
