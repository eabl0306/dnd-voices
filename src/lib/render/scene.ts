import { assembleScene, type ClipSegment } from "@/lib/audio/assemble";
import { durationMs } from "@/lib/audio/ffmpeg";
import { db } from "@/lib/db";
import { messageOf } from "@/lib/render/parse";
import { synthesizeLine } from "@/lib/render/synthesize-line";
import { DEFAULT_TTS_MODEL } from "@/lib/tts/model";
import * as storage from "@/lib/storage";
import type { VoiceSettings } from "@/lib/types";

export type RenderableLine = {
  id: string;
  text: string;
  delivery: string | null;
  pauseAfter: number;
  fadeOutMs: number;
  character: {
    name: string;
    voiceId: string | null;
    voiceSettings: unknown;
    /** El modelo vive en la voz, no en una constante: cada una puede llevar el suyo. */
    voiceRef: { model: string } | null;
  } | null;
};

export type RenderSummary = {
  audioKey: string;
  cacheHits: number;
  charsBilled: number;
  total: number;
};

function asSettings(value: unknown): VoiceSettings | null {
  return value && typeof value === "object" ? (value as VoiceSettings) : null;
}

/**
 * Un fallo a mitad del render deja caracteres ya facturados, así que las
 * precondiciones se comprueban todas antes de la primera llamada a ElevenLabs.
 */
export function assertRenderable(lines: readonly RenderableLine[]): void {
  if (lines.length === 0) {
    throw new Error("La escena no tiene líneas: analiza el texto antes de renderizar.");
  }

  // Dos fallos distintos con dos arreglos distintos: sin hablante se corrige en
  // el guion; sin voz, en el reparto. Un solo mensaje mandaría a media escena
  // al sitio equivocado.
  const unassigned = lines.filter((line) => line.character === null).length;
  if (unassigned > 0) {
    throw new Error(
      `${unassigned} ${unassigned === 1 ? "intervención sigue" : "intervenciones siguen"} sin personaje. Asígnalas en el guion antes de renderizar.`,
    );
  }

  const voiceless = lines.find((line) => !line.character?.voiceId);
  if (voiceless?.character) {
    throw new Error(
      `${voiceless.character.name} todavía no tiene voz asignada. Asígnasela antes de renderizar.`,
    );
  }
}

async function synthesizeAll(
  renderId: string,
  lines: readonly RenderableLine[],
  languageCode: string,
): Promise<{ clips: ClipSegment[]; cacheHits: number; charsBilled: number }> {
  const clips: ClipSegment[] = [];
  let cacheHits = 0;
  let charsBilled = 0;

  for (const [index, line] of lines.entries()) {
    // assertRenderable ya garantizó que existen; el `!` es sobre eso.
    const character = line.character!;

    const clip = await synthesizeLine({
      text: line.text,
      delivery: line.delivery,
      voiceId: character.voiceId!,
      model: character.voiceRef?.model ?? DEFAULT_TTS_MODEL,
      settings: asSettings(character.voiceSettings),
      languageCode,
      previousText: lines[index - 1]?.text,
      nextText: lines[index + 1]?.text,
    });

    if (clip.billed) charsBilled += clip.charsBilled;
    else cacheHits += 1;

    clips.push({
      audioKey: clip.audioKey,
      pauseAfterMs: line.pauseAfter,
      fadeOutMs: line.fadeOutMs,
    });

    // updateMany y no update: si la línea se borró mientras el render corría,
    // update lanzaría P2025 y tiraría el render entero con el TTS ya facturado.
    // La ruta de borrado lo impide con un 409, pero esto es la red de seguridad.
    await db.line.updateMany({
      where: { id: line.id },
      data: {
        cacheKey: clip.cacheKey,
        audioPath: clip.audioKey,
        durationMs: await durationMs(storage.absolute(clip.audioKey)),
      },
    });

    await db.render.update({
      where: { id: renderId },
      data: {
        // El 90 % deja margen para el montaje, que no es instantáneo.
        progress: Math.round(((index + 1) / lines.length) * 90),
        cacheHits,
        charsBilled,
      },
    });
  }

  return { clips, cacheHits, charsBilled };
}

/** Sintetiza cada línea de la escena y monta el audio final. */
export async function renderScene(renderId: string): Promise<RenderSummary> {
  const render = await db.render.findUniqueOrThrow({
    where: { id: renderId },
    include: {
      scene: {
        include: {
          campaign: true,
          lines: {
            orderBy: { order: "asc" },
            include: { character: { include: { voiceRef: { select: { model: true } } } } },
          },
        },
      },
    },
  });

  const { scene } = render;

  try {
    // Dentro del try: si la precondición falla fuera, el render se queda en
    // QUEUED para siempre y la ruta devuelve ese mismo registro al reintentar,
    // así que «Generar audio» dejaría de hacer nada sin decir por qué.
    assertRenderable(scene.lines);

    await db.render.update({
      where: { id: renderId },
      data: {
        status: "RUNNING",
        progress: 0,
        cacheHits: 0,
        charsBilled: 0,
        totalLines: scene.lines.length,
        error: null,
      },
    });
    await db.scene.update({ where: { id: scene.id }, data: { status: "RENDERING" } });

    const { clips, cacheHits, charsBilled } = await synthesizeAll(
      renderId,
      scene.lines,
      scene.campaign.language,
    );

    const output = await assembleScene(clips, `renders/${scene.id}/${renderId}.mp3`);

    await db.render.update({
      where: { id: renderId },
      data: {
        status: "DONE",
        progress: 100,
        audioPath: output.audioKey,
        durationMs: output.durationMs,
      },
    });
    await db.scene.update({ where: { id: scene.id }, data: { status: "RENDERED" } });

    return { audioKey: output.audioKey, cacheHits, charsBilled, total: scene.lines.length };
  } catch (error) {
    const message = messageOf(error);
    await db.render.update({ where: { id: renderId }, data: { status: "FAILED", error: message } });
    await db.scene.update({ where: { id: scene.id }, data: { status: "FAILED", error: message } });
    throw error;
  }
}
