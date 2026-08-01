import { mkdir } from "node:fs/promises";
import path from "node:path";
import { buildFilterGraph, type Segment, trimTrailingPause } from "@/lib/audio/filter-graph";
import { durationMs, ffmpeg } from "@/lib/audio/ffmpeg";
import * as storage from "@/lib/storage";

export type ClipSegment = {
  /** Clave de storage del clip mp3 devuelto por ElevenLabs. */
  audioKey: string;
  pauseAfterMs: number;
};

export type AssembleResult = { audioKey: string; durationMs: number };

/** Concatena los clips de una escena con sus pausas y normaliza el conjunto. */
export async function assembleScene(
  clips: readonly ClipSegment[],
  outputKey: string,
): Promise<AssembleResult> {
  const segments: Segment[] = clips.map((clip) => ({
    path: storage.absolute(clip.audioKey),
    pauseAfterMs: clip.pauseAfterMs,
  }));

  const graph = buildFilterGraph(trimTrailingPause(segments));
  const outputPath = storage.absolute(outputKey);
  await mkdir(path.dirname(outputPath), { recursive: true });

  await ffmpeg([
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    ...graph.inputs,
    "-filter_complex",
    graph.filterComplex,
    "-map",
    graph.outputLabel,
    "-c:a",
    "libmp3lame",
    // Por encima de los 192 kbps que pide el proveedor: concatenar y normalizar
    // obliga a decodificar y volver a codificar, y hacerlo al mismo bitrate que
    // la fuente añade pérdida de segunda generación audible en las eses.
    "-b:a",
    "256k",
    outputPath,
  ]);

  return { audioKey: outputKey, durationMs: await durationMs(outputPath) };
}
