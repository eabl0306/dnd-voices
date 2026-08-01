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
export const OUTPUT_FORMAT = "mp3_44100_128" as const;

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
    ...optional("languageCode", args.languageCode),
    ...optional("previousText", args.previousText),
    ...optional("nextText", args.nextText),
    ...optional("voiceSettings", voiceSettings),
  });

  return collect(stream);
}
