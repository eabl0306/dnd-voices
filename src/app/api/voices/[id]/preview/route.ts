import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HttpError, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { cacheKeyFor, clipKey } from "@/lib/render/cache-key";
import * as storage from "@/lib/storage";
import { OUTPUT_FORMAT, synthesize } from "@/lib/tts/elevenlabs";

type Params = { params: Promise<{ id: string }> };

/**
 * Traduce el fallo del proveedor a algo accionable.
 *
 * El error crudo del SDK son treinta líneas de volcado; en la tarjeta sólo caben
 * dos, y lo que el usuario necesita saber es qué hacer al respecto.
 */
function previewFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/invalid_api_key|Invalid API key|unauthorized/i.test(raw)) {
    return "El proveedor rechaza la clave: revisa ELEVENLABS_API_KEY en tu .env y reinicia la app.";
  }
  if (/voice_not_found|not_found/i.test(raw)) {
    return "Esa voz ya no existe en tu cuenta del proveedor. Bórrala de la biblioteca o corrige su voice_id.";
  }
  if (/quota|credit|subscription/i.test(raw)) {
    return "El proveedor rechazó la petición por límites de tu plan o de créditos.";
  }
  // Sin patrón conocido, la primera línea del error suele traer el motivo.
  return `No se pudo generar la prueba: ${raw.split("\n")[0]?.slice(0, 160) ?? raw}`;
}

/** Frase de prueba fija: al ser siempre la misma, se cachea y no se re-factura. */
const SAMPLE =
  "Bienvenidos a la mesa. Esta es mi voz: escuchadla antes de repartir los papeles.";

/**
 * Audio de muestra de una voz, para el botón ▶ de la biblioteca.
 *
 * Reutiliza la caché de clips del render: probar una voz dos veces no cuesta
 * nada, y la primera prueba deja el clip listo para el resto de la sesión.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const voice = await db.voice.findFirst({ where: { id, userId: user.id } });
    if (!voice) throw new HttpError(404, "Voz no encontrada.");
    if (voice.provider !== "ELEVENLABS") {
      throw new HttpError(400, `Todavía no se puede probar una voz de ${voice.provider}.`);
    }

    const key = clipKey(
      cacheKeyFor({
        ttsModel: voice.model,
        outputFormat: OUTPUT_FORMAT,
        voiceId: voice.externalId,
        languageCode: "es",
        text: SAMPLE,
        settings: null,
      }),
    );

    if (!(await storage.exists(key))) {
      await storage.write(
        key,
        await synthesize({
          voiceId: voice.externalId,
          model: voice.model,
          text: SAMPLE,
          settings: null,
          languageCode: "es",
        }),
      );
    }

    const audio = await storage.read(key);
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: previewFailure(error) }, { status: 500 });
  }
}
