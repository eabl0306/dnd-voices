import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "@/lib/env";
import { lazyProxy } from "@/lib/lazy";
import { optional, type VoiceSettings } from "@/lib/types";

/**
 * eleven_v3 da la mejor interpretación pero es el más caro y lento.
 * eleven_multilingual_v2 es el punto dulce para partidas largas en español.
 */
// La app no lista voces del proveedor: la biblioteca vive en nuestra base, y
// así basta con una clave que pueda sintetizar y diseñar, sin `voices_read`.
export const TTS_MODEL = "eleven_multilingual_v2";

/**
 * Lo máximo que admite el plan actual, comprobado contra la API: `mp3_44100_192`
 * responde 200 y `pcm_44100` devuelve 403 por suscripción insuficiente.
 *
 * Si algún día se sube de plan, `pcm_44100` evitaría la primera compresión y
 * dejaría una sola etapa con pérdida en todo el recorrido; habría que enseñar a
 * ffmpeg a leer PCM crudo (`-f s16le -ar 44100 -ac 1`).
 */
export const OUTPUT_FORMAT = "mp3_44100_192" as const;

/**
 * Modelos que respetan `language_code`.
 *
 * Comprobado con semilla fija: `eleven_multilingual_v2` devuelve audio idéntico
 * con `es`, con `en` y sin el parámetro, así que lo ignora y sólo detecta el
 * idioma del texto. Mandárselo sería ruido, y sugeriría un control que no existe.
 */
const MODELS_WITH_LANGUAGE_ENFORCEMENT = ["eleven_turbo_v2_5", "eleven_flash_v2_5"];

export function honoursLanguageCode(model: string): boolean {
  return MODELS_WITH_LANGUAGE_ENFORCEMENT.includes(model);
}

export const eleven = lazyProxy(
  () => new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY }),
);

async function collect(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export type DesignedPreview = {
  generatedVoiceId: string;
  audioBase64: string;
  durationSecs: number;
};

/**
 * Paso 1 de Voice Design: genera previews a partir de la descripción.
 * No consume un slot de voz — eso ocurre al confirmar con `saveDesignedVoice`.
 */
export async function designVoicePreviews(args: {
  voiceDescription: string;
  previewText: string;
}): Promise<DesignedPreview[]> {
  const response = await eleven.textToVoice.design({
    voiceDescription: args.voiceDescription,
    text: args.previewText,
    outputFormat: OUTPUT_FORMAT,
  });

  return response.previews.map((preview) => ({
    generatedVoiceId: preview.generatedVoiceId,
    audioBase64: preview.audioBase64,
    durationSecs: preview.durationSecs,
  }));
}

/** Paso 2: guarda la preview elegida como voz de la cuenta (consume un slot). */
export async function saveDesignedVoice(args: {
  name: string;
  description: string;
  generatedVoiceId: string;
  labels?: Record<string, string>;
}): Promise<string> {
  const voice = await eleven.textToVoice.create({
    voiceName: args.name,
    voiceDescription: args.description,
    generatedVoiceId: args.generatedVoiceId,
    ...optional("labels", args.labels),
  });
  return voice.voiceId;
}

export type SynthesizeArgs = {
  voiceId: string;
  text: string;
  settings: VoiceSettings | null;
  languageCode?: string | undefined;
  previousText?: string | undefined;
  nextText?: string | undefined;
};

export async function synthesize(args: SynthesizeArgs): Promise<Buffer> {
  const voiceSettings = args.settings
    ? { ...args.settings, useSpeakerBoost: true }
    : undefined;

  const stream = await eleven.textToSpeech.convert(args.voiceId, {
    text: args.text,
    modelId: TTS_MODEL,
    outputFormat: OUTPUT_FORMAT,
    ...optional(
      "languageCode",
      honoursLanguageCode(TTS_MODEL) ? args.languageCode : undefined,
    ),
    ...optional("previousText", args.previousText),
    ...optional("nextText", args.nextText),
    ...optional("voiceSettings", voiceSettings),
  });

  return collect(stream);
}
