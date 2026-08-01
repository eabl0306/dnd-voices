import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "@/lib/env";
import { lazyProxy } from "@/lib/lazy";
import { optional, type VoiceSettings } from "@/lib/types";

// La app no lista voces del proveedor: la biblioteca vive en nuestra base, y
// así basta con una clave que pueda sintetizar y diseñar, sin `voices_read`.

/**
 * Modelo por defecto de una voz nueva.
 *
 * v3 es el más expresivo y el único que entiende indicaciones de interpretación
 * en el texto. Cada voz puede llevar el suyo: el narrador, que lee la mayor
 * parte del texto, puede salir más barato con multilingual_v2.
 */
export const DEFAULT_TTS_MODEL = "eleven_v3";

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

/**
 * Modelos que aceptan `previous_text` / `next_text` para dar continuidad
 * prosódica entre líneas contiguas.
 *
 * Comprobado contra la API: v3 responde 400 `unsupported_model` si se le
 * mandan, así que enviarlos rompería el render entero en vez de degradarlo.
 */
export function acceptsNeighbourContext(model: string): boolean {
  return !model.startsWith("eleven_v3");
}

/**
 * Modelos que entienden indicaciones de interpretación entre corchetes.
 *
 * Comprobado transcribiendo la salida: con `[susurrando]` delante, la
 * transcripción es idéntica a la del texto pelado —la etiqueta no se lee en voz
 * alta— pero la duración pasa de 3,47 s a 4,28 s. La entiende también en
 * español, así que sirve el `delivery` que ya extrae Claude sin traducirlo.
 */
export function supportsAudioTags(model: string): boolean {
  return model.startsWith("eleven_v3");
}

/** Antepone la indicación de interpretación si el modelo sabe leerla. */
export function withDelivery(text: string, delivery: string | null, model: string): string {
  if (!delivery || !supportsAudioTags(model)) return text;
  return `[${delivery}] ${text}`;
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

/**
 * Borra una voz de la cuenta del proveedor.
 *
 * Rediseñar la voz de un personaje crea una nueva y deja la anterior ocupando
 * un slot del plan, que está limitado. Sin esto, cada «Cambiar voz» sobre una
 * voz generada cuesta un slot para siempre.
 */
export async function deleteVoice(externalId: string): Promise<void> {
  await eleven.voices.delete(externalId);
}

export type SynthesizeArgs = {
  voiceId: string;
  /** Modelo de esta voz en concreto, no una constante global. */
  model: string;
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
  const neighbours = acceptsNeighbourContext(args.model);

  const stream = await eleven.textToSpeech.convert(args.voiceId, {
    text: args.text,
    modelId: args.model,
    outputFormat: OUTPUT_FORMAT,
    ...optional(
      "languageCode",
      honoursLanguageCode(args.model) ? args.languageCode : undefined,
    ),
    ...optional("previousText", neighbours ? args.previousText : undefined),
    ...optional("nextText", neighbours ? args.nextText : undefined),
    ...optional("voiceSettings", voiceSettings),
  });

  return collect(stream);
}
