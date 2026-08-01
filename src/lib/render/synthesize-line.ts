import { cacheKeyFor, clipKey } from "@/lib/render/cache-key";
import * as storage from "@/lib/storage";
import { OUTPUT_FORMAT, TTS_MODEL, synthesize } from "@/lib/tts/elevenlabs";
import type { VoiceSettings } from "@/lib/types";

export type LineToSynthesize = {
  text: string;
  voiceId: string;
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
  const cacheKey = cacheKeyFor({
    ttsModel: TTS_MODEL,
    outputFormat: OUTPUT_FORMAT,
    voiceId: line.voiceId,
    languageCode: line.languageCode,
    text: line.text,
    settings: line.settings,
  });
  const audioKey = clipKey(cacheKey);

  if (await storage.exists(audioKey)) {
    return { cacheKey, audioKey, billed: false, charsBilled: 0 };
  }

  const audio = await synthesize({
    voiceId: line.voiceId,
    text: line.text,
    settings: line.settings,
    languageCode: line.languageCode,
    previousText: line.previousText,
    nextText: line.nextText,
  });
  await storage.write(audioKey, audio);

  return { cacheKey, audioKey, billed: true, charsBilled: line.text.length };
}
