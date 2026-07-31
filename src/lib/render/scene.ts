import { assembleScene, type ClipSegment } from "@/lib/audio/assemble";
import { durationMs } from "@/lib/audio/ffmpeg";
import { db } from "@/lib/db";
import { messageOf } from "@/lib/render/parse";
import { synthesizeLine } from "@/lib/render/synthesize-line";
import * as storage from "@/lib/storage";
import type { VoiceSettings } from "@/lib/types";

type RenderableLine = {
  id: string;
  text: string;
  pauseAfter: number;
  character: { name: string; voiceId: string | null; voiceSettings: unknown } | null;
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
function assertRenderable(lines: readonly RenderableLine[]): void {
  if (lines.length === 0) {
    throw new Error("La escena no tiene líneas: analiza el texto antes de renderizar.");
  }
  const missing = lines.find((line) => !line.character?.voiceId);
  if (missing) {
    const who = missing.character?.name ?? "una línea sin personaje asignado";
    throw new Error(
      `Falta la voz de ${who}. Asigna voces a todo el reparto antes de renderizar.`,
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
      voiceId: character.voiceId!,
      settings: asSettings(character.voiceSettings),
      languageCode,
      previousText: lines[index - 1]?.text,
      nextText: lines[index + 1]?.text,
    });

    if (clip.billed) charsBilled += clip.charsBilled;
    else cacheHits += 1;

    clips.push({ audioKey: clip.audioKey, pauseAfterMs: line.pauseAfter });

    await db.line.update({
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
          lines: { orderBy: { order: "asc" }, include: { character: true } },
        },
      },
    },
  });

  const { scene } = render;
  assertRenderable(scene.lines);

  await db.render.update({
    where: { id: renderId },
    data: { status: "RUNNING", progress: 0, cacheHits: 0, charsBilled: 0, error: null },
  });
  await db.scene.update({ where: { id: scene.id }, data: { status: "RENDERING" } });

  try {
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
