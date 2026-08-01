import { hash } from "@/lib/storage";
import type { VoiceSettings } from "@/lib/types";

export type CacheKeyInput = {
  ttsModel: string;
  /** Formato pedido al proveedor: cambiarlo cambia el audio, no sólo el envase. */
  outputFormat: string;
  voiceId: string;
  languageCode: string;
  text: string;
  settings: VoiceSettings | null;
};

/**
 * La clave de caché tiene que cubrir todo lo que cambia el audio resultante.
 *
 * Se serializa campo a campo en vez de con JSON.stringify porque el orden de
 * claves de un objeto que viene de Prisma no está garantizado, y un orden
 * distinto produciría claves distintas para exactamente el mismo audio.
 *
 * El formato entra en la clave: sin él, subir la calidad del proveedor seguiría
 * sirviendo de disco los clips viejos, y la escena quedaría con dos calidades
 * mezcladas sin que nada lo delatara.
 */
export function cacheKeyFor(input: CacheKeyInput): string {
  const s = input.settings;
  return hash(
    input.ttsModel,
    input.outputFormat,
    input.voiceId,
    input.languageCode,
    input.text,
    s?.stability,
    s?.similarityBoost,
    s?.style,
    s?.speed,
  );
}

export function clipKey(cacheKey: string): string {
  return `clips/${cacheKey}.mp3`;
}
