import { Worker } from "bullmq";
import { assertAvailable } from "@/lib/audio/ffmpeg";
import {
  RENDER_QUEUE,
  type RenderJob,
  VOICE_QUEUE,
  type VoiceJob,
  connection,
} from "@/lib/queue";
import { renderScene } from "@/lib/render/scene";
import { provisionVoice } from "@/lib/render/voice";

async function main() {
  await assertAvailable();

  // Concurrencia 2: ElevenLabs limita peticiones concurrentes por plan y
  // subirlo sólo cambia dónde aparecen los 429.
  const renderWorker = new Worker<RenderJob>(
    RENDER_QUEUE,
    async (job) => renderScene(job.data.renderId),
    { connection, concurrency: 2 },
  );

  const voiceWorker = new Worker<VoiceJob>(
    VOICE_QUEUE,
    async (job) => provisionVoice(job.data.characterId, job.data.previousVoiceRefId),
    { connection, concurrency: 2 },
  );

  for (const [name, worker] of [
    ["render", renderWorker],
    ["voice", voiceWorker],
  ] as const) {
    worker.on("completed", (job) => console.log(`[${name}] ok ${job.id}`));
    worker.on("failed", (job, err) =>
      console.error(`[${name}] fallo ${job?.id}: ${err.message}`),
    );
  }

  console.log("worker escuchando en", RENDER_QUEUE, "y", VOICE_QUEUE);

  const shutdown = async () => {
    console.log("cerrando workers...");
    await Promise.all([renderWorker.close(), voiceWorker.close()]);
    await connection.quit();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
