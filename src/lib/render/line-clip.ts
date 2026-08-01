import { cacheKeyFor } from "@/lib/render/cache-key";
import { OUTPUT_FORMAT } from "@/lib/tts/elevenlabs";
import { DEFAULT_TTS_MODEL, withDelivery } from "@/lib/tts/model";
import type { VoiceSettings } from "@/lib/types";

/** Lo que hace falta de una línea para saber qué audio le corresponde. */
export type ClipContext = {
  text: string;
  delivery: string | null;
  languageCode: string;
  character: {
    voiceId: string | null;
    voiceSettings: unknown;
    voiceRef: { model: string } | null;
  } | null;
};

export function asVoiceSettings(value: unknown): VoiceSettings | null {
  return value && typeof value === "object" ? (value as VoiceSettings) : null;
}

/**
 * Clave del audio que le tocaría a esta línea ahora mismo.
 *
 * Devuelve null si todavía no hay voz asignada. Comparada con la `cacheKey`
 * guardada, dice si el clip que hay en disco sigue valiendo o si el texto, la
 * voz o los ajustes han cambiado por debajo.
 */
export function currentCacheKey(line: ClipContext): string | null {
  const voiceId = line.character?.voiceId;
  if (!voiceId) return null;

  const model = line.character?.voiceRef?.model ?? DEFAULT_TTS_MODEL;

  return cacheKeyFor({
    ttsModel: model,
    outputFormat: OUTPUT_FORMAT,
    voiceId,
    languageCode: line.languageCode,
    text: withDelivery(line.text, line.delivery, model),
    settings: asVoiceSettings(line.character?.voiceSettings),
  });
}

/**
 * Si el audio guardado ya no se corresponde con la línea.
 *
 * Sin audio no hay nada desfasado: eso es «todavía no generado», que la
 * interfaz ya distingue por otro lado.
 */
export function isAudioStale(line: ClipContext & { cacheKey: string | null }): boolean {
  if (line.cacheKey === null) return false;
  const current = currentCacheKey(line);
  return current !== null && current !== line.cacheKey;
}
