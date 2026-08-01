import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HttpError, handler, accessibleLine, requireUser } from "@/lib/api";
import { audioFileResponse } from "@/lib/api-audio";
import { db } from "@/lib/db";
import { durationMs } from "@/lib/audio/ffmpeg";
import { asVoiceSettings } from "@/lib/render/line-clip";
import { synthesizeLine } from "@/lib/render/synthesize-line";
import * as storage from "@/lib/storage";
import { DEFAULT_TTS_MODEL } from "@/lib/tts/model";

type Params = { params: Promise<{ id: string }> };

/** Nombre de descarga sin acentos ni espacios, que viaja mal en una cabecera. */
function downloadName(order: number, speaker: string | undefined): string {
  const slug = (speaker ?? "narracion")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${String(order + 1).padStart(3, "0")}-${slug || "narracion"}.mp3`;
}

/** Sirve el clip de una sola intervención, para escucharla o descargarla suelta. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await accessibleLine(id, user.id);

    const line = await db.line.findUniqueOrThrow({
      where: { id },
      select: { order: true, audioPath: true, character: { select: { name: true } } },
    });

    if (!line.audioPath) {
      throw new HttpError(
        409,
        "Esta intervención todavía no tiene audio: genera la escena primero.",
      );
    }

    // A diferencia del render, esta URL cambia de contenido: si se reasigna la
    // voz o se corrige el texto, el mismo id sirve otro clip. Sin caché.
    return await audioFileResponse(request, line.audioPath, {
      filename: downloadName(line.order, line.character?.name),
      cacheControl: "private, no-store",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "No se pudo servir el audio." }, { status: 500 });
  }
}

/**
 * Regenera el clip de esta intervención sola.
 *
 * Permite oír un cambio de texto al momento sin montar la escena entera, que
 * son decenas de segundos de ffmpeg. Lo que sintetiza aquí queda en la caché,
 * así que el render posterior lo reutiliza y no se factura dos veces.
 */
export function POST(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await accessibleLine(id, user.id);

    const line = await db.line.findUniqueOrThrow({
      where: { id },
      include: {
        scene: { include: { campaign: { select: { language: true } } } },
        character: { include: { voiceRef: { select: { model: true } } } },
      },
    });

    const rendering = await db.render.count({
      where: { sceneId: line.sceneId, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (rendering > 0) {
      throw new HttpError(409, "Hay un render en marcha: espera a que termine.");
    }

    if (!line.character) {
      throw new HttpError(400, "Asigna un personaje a esta intervención antes de generarla.");
    }
    if (!line.character.voiceId) {
      throw new HttpError(400, `${line.character.name} todavía no tiene voz asignada.`);
    }

    const clip = await synthesizeLine({
      text: line.text,
      delivery: line.delivery,
      voiceId: line.character.voiceId,
      model: line.character.voiceRef?.model ?? DEFAULT_TTS_MODEL,
      settings: asVoiceSettings(line.character.voiceSettings),
      languageCode: line.scene.campaign.language,
    });

    await db.line.update({
      where: { id },
      data: {
        cacheKey: clip.cacheKey,
        audioPath: clip.audioKey,
        durationMs: await durationMs(storage.absolute(clip.audioKey)),
      },
    });

    return { charsBilled: clip.charsBilled, fromCache: !clip.billed };
  });
}
