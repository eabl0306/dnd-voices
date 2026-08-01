import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import { lazyProxy } from "@/lib/lazy";

export const RENDER_QUEUE = "scene-render";
export const VOICE_QUEUE = "voice-provision";

export type RenderJob = { renderId: string };
export type VoiceJob = {
  characterId: string;
  /**
   * Voz que tenía antes del cambio. Va en el trabajo porque quien encola ya ha
   * escrito la nueva en el personaje, y sin esto el worker no puede saber cuál
   * se ha quedado sin dueño.
   */
  previousVoiceRefId?: string | null;
};

/**
 * ioredis abre el socket al construirse, así que la conexión y las colas van
 * detrás de un proxy perezoso: durante `next build` no hay ningún Redis al
 * que conectarse y el build fallaría con ECONNREFUSED.
 *
 * `maxRetriesPerRequest: null` lo exige BullMQ para los workers; compartir una
 * sola conexión evita abrir un socket por cola.
 */
export const connection = lazyProxy(
  () => new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }),
);

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 3600, count: 200 },
  removeOnFail: { age: 86_400 },
};

export const renderQueue = lazyProxy(
  () => new Queue<RenderJob>(RENDER_QUEUE, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
);

export const voiceQueue = lazyProxy(
  () => new Queue<VoiceJob>(VOICE_QUEUE, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
);
