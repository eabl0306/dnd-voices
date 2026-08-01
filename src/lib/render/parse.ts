import { attributeSpeakers } from "@/lib/ai/attribution";
import { db } from "@/lib/db";
import { type KnownCharacter, mapAttributedLines } from "@/lib/render/line-mapper";
import { pauseAfterFor } from "@/lib/render/pauses";
import { appendedText, reconcileLines } from "@/lib/render/reconcile";
import type { RosterEntry } from "@/lib/types";

export type ParseResult = {
  /** Intervenciones que tiene la escena al terminar. */
  lineCount: number;
  /** Intervenciones nuevas: las únicas que habrá que sintetizar. */
  added: number;
  /** Intervenciones que se conservan con su audio y sus ajustes. */
  kept: number;
  /** Intervenciones que ya no están en el texto. */
  removed: number;
  unknownSpeakers: string[];
};

/**
 * Cuánto del guion anterior se le enseña a Claude al analizar sólo la cola.
 *
 * Suficiente para saber quién hablaba y de qué, sin pagar por reenviar la
 * escena entera en cada ampliación.
 */
const CONTEXT_CHARS = 1500;

type SceneForParse = {
  id: string;
  rawText: string;
  parsedText: string;
  campaign: { name: string; setting: string; characters: (KnownCharacter & RosterEntry)[] };
  lines: { id: string; text: string; characterId: string | null }[];
};

function attribute(scene: SceneForParse, text: string, precedingText: string | undefined) {
  return attributeSpeakers({
    campaignName: scene.campaign.name,
    setting: scene.campaign.setting,
    roster: scene.campaign.characters,
    rawText: text,
    precedingText,
  });
}

function isNarrator(scene: SceneForParse, characterId: string | null): boolean {
  if (characterId === null) return false;
  return scene.campaign.characters.some(
    (character) => character.id === characterId && character.isNarrator,
  );
}

/**
 * El texto sólo ha crecido: se analiza la cola y se añade al final.
 *
 * Es el caso normal cuando la partida avanza, y el único en el que se puede
 * garantizar que no se toca ni una línea de lo que ya había.
 */
async function appendTail(scene: SceneForParse, tail: string): Promise<ParseResult> {
  const { result } = await attribute(scene, tail, scene.parsedText.slice(-CONTEXT_CHARS));

  const mapped = mapAttributedLines(result.lines, scene.campaign.characters);
  const base = scene.lines.length;
  const first = mapped[0];
  const last = scene.lines[base - 1];

  // La pausa de la última línea anterior se calculó cuando era el final de la
  // escena. Ahora tiene continuación, y ese relevo hay que marcarlo.
  const seam =
    first && last
      ? [
          db.line.update({
            where: { id: last.id },
            data: {
              pauseAfter: pauseAfterFor(
                {
                  characterId: last.characterId,
                  isNarrator: isNarrator(scene, last.characterId),
                  text: last.text,
                },
                {
                  characterId: first.characterId,
                  isNarrator: isNarrator(scene, first.characterId),
                  text: first.text,
                },
              ),
            },
          }),
        ]
      : [];

  await db.$transaction([
    ...seam,
    db.line.createMany({
      data: mapped.map((line, index) => ({
        ...line,
        order: base + index,
        sceneId: scene.id,
      })),
    }),
  ]);

  return {
    lineCount: base + mapped.length,
    added: mapped.length,
    kept: base,
    removed: 0,
    unknownSpeakers: result.unknownSpeakers,
  };
}

/**
 * Se ha tocado algo de lo ya analizado: hay que rehacer el guion entero.
 *
 * Aun así no se borra a ciegas. Lo que sale con el mismo texto se empareja con
 * lo que ya había y conserva su audio, su personaje y sus ajustes; sólo se crea
 * lo que de verdad es nuevo.
 */
async function reparseAll(scene: SceneForParse): Promise<ParseResult> {
  const { result } = await attribute(scene, scene.rawText, undefined);
  const mapped = mapAttributedLines(result.lines, scene.campaign.characters);
  const { keep, create, removeIds } = reconcileLines(scene.lines, mapped);

  await db.$transaction([
    db.line.deleteMany({ where: { id: { in: removeIds } } }),
    // Las posiciones se aparcan en negativo antes de reasignarlas: `order` es
    // único por escena, y mover una línea al sitio que otra aún ocupa chocaría
    // con el índice a mitad de la transacción.
    ...keep.map(({ id }, index) =>
      db.line.update({ where: { id }, data: { order: -1 - index } }),
    ),
    ...keep.map(({ id, order }) => db.line.update({ where: { id }, data: { order } })),
    db.line.createMany({ data: create.map((line) => ({ ...line, sceneId: scene.id })) }),
  ]);

  return {
    lineCount: mapped.length,
    added: create.length,
    kept: keep.length,
    removed: removeIds.length,
    unknownSpeakers: result.unknownSpeakers,
  };
}

/**
 * Pasa el texto crudo de una escena por Claude y persiste el resultado como
 * líneas editables.
 *
 * Reanalizar no es destructivo: ampliar el texto sólo analiza y añade la parte
 * nueva, y cuando hay que rehacerlo entero, lo que no ha cambiado conserva el
 * audio ya sintetizado en vez de volver a facturarse.
 */
export async function parseScene(sceneId: string): Promise<ParseResult> {
  const scene = await db.scene.findUniqueOrThrow({
    where: { id: sceneId },
    include: {
      campaign: { include: { characters: true } },
      lines: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, characterId: true },
      },
    },
  });

  if (!scene.rawText.trim()) {
    throw new Error("La escena no tiene texto que analizar.");
  }

  const tail = scene.lines.length > 0 ? appendedText(scene.parsedText, scene.rawText) : null;

  // Ni una línea nueva que analizar: reanalizar lo mismo costaría una llamada a
  // Claude para acabar exactamente donde estábamos.
  if (tail !== null && !tail.trim()) {
    return {
      lineCount: scene.lines.length,
      added: 0,
      kept: scene.lines.length,
      removed: 0,
      unknownSpeakers: [],
    };
  }

  await db.scene.update({
    where: { id: sceneId },
    data: { status: "PARSING", error: null },
  });

  try {
    const result = tail === null ? await reparseAll(scene) : await appendTail(scene, tail);

    await db.scene.update({
      where: { id: sceneId },
      data: { status: "PARSED", parsedText: scene.rawText },
    });

    return result;
  } catch (error) {
    await db.scene.update({
      where: { id: sceneId },
      data: { status: "FAILED", error: messageOf(error) },
    });
    throw error;
  }
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
