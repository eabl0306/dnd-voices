import { cacheKeyFor, clipKey } from "@/lib/render/cache-key";
import * as storage from "@/lib/storage";
import {
  acceptsNeighbourContext,
  OUTPUT_FORMAT,
  synthesize,
  withDelivery,
} from "@/lib/tts/elevenlabs";
import type { VoiceSettings } from "@/lib/types";

export type LineToSynthesize = {
  text: string;
  /** Indicación de interpretación; sólo la usan los modelos que la entienden. */
  delivery: string | null;
  voiceId: string;
  /** Modelo de la voz de este personaje, no una constante global. */
  model: string;
  settings: VoiceSettings | null;
  languageCode: string;
  /** Texto de las líneas contiguas: da continuidad prosódica sin coste extra. */
  previousText?: string | undefined;
  nextText?: string | undefined;
};

export type SynthesizedClip = {
  cacheKey: string;
  audioKey: string;
  /** false cuando el clip salió de disco y no se facturó nada. */
  billed: boolean;
  charsBilled: number;
};

/**
 * Sintetiza una línea, o la recupera de disco si ya existe ese audio exacto.
 *
 * ElevenLabs factura por carácter: sin esta caché, corregir una sola línea
 * volvería a facturar la escena entera en cada iteración.
 *
 * `previousText`/`nextText` no entran en la clave a propósito. Influyen en la
 * prosodia, pero de forma sutil; incluirlos invalidaría el clip de cada vecino
 * al tocar una línea, y el coste no compensa la mejora.
 */
export async function synthesizeLine(line: LineToSynthesize): Promise<SynthesizedClip> {
  // El texto efectivo lleva ya la indicación de interpretación, así que entra
  // en la clave de caché sin tener que acordarse de añadirla por separado.
  const text = withDelivery(line.text, line.delivery, line.model);

  const cacheKey = cacheKeyFor({
    ttsModel: line.model,
    outputFormat: OUTPUT_FORMAT,
    voiceId: line.voiceId,
    languageCode: line.languageCode,
    text,
    settings: line.settings,
  });
  const audioKey = clipKey(cacheKey);

  if (await storage.exists(audioKey)) {
    return { cacheKey, audioKey, billed: false, charsBilled: 0 };
  }

  const neighbours = acceptsNeighbourContext(line.model);
  const audio = await synthesize({
    voiceId: line.voiceId,
    model: line.model,
    text,
    settings: line.settings,
    languageCode: line.languageCode,
    previousText: neighbours ? line.previousText : undefined,
    nextText: neighbours ? line.nextText : undefined,
  });
  await storage.write(audioKey, audio);

  return { cacheKey, audioKey, billed: true, charsBilled: text.length };
}
