import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  buildFilterGraph,
  type LoudnessMeasurement,
  parseLoudnessMeasurement,
  type Segment,
  trimTrailingPause,
} from "@/lib/audio/filter-graph";
import { durationMs, ffmpeg, ffmpegReport } from "@/lib/audio/ffmpeg";
import * as storage from "@/lib/storage";

export type ClipSegment = {
  /** Clave de storage del clip mp3 devuelto por ElevenLabs. */
  audioKey: string;
  pauseAfterMs: number;
};

export type AssembleResult = { audioKey: string; durationMs: number };

/** Recorre la mezcla sin escribirla, sólo para que loudnorm la mida. */
async function measure(segments: readonly Segment[]): Promise<LoudnessMeasurement | undefined> {
  const graph = buildFilterGraph(segments);
  const report = await ffmpegReport([
    "-hide_banner",
    "-nostats",
    ...graph.inputs,
    "-filter_complex",
    graph.filterComplex,
    "-map",
    graph.outputLabel,
    "-f",
    "null",
    "-",
  ]);
  return parseLoudnessMeasurement(report);
}

/**
 * Concatena los clips de una escena con sus pausas y normaliza el conjunto.
 *
 * Son dos pasadas de ffmpeg: la primera mide la sonoridad y la segunda aplica
 * una ganancia constante. En una sola pasada loudnorm normaliza de forma
 * dinámica y una intervención susurrada sale entrecortada, porque le sube y le
 * baja la ganancia cada pocos milisegundos.
 */
export async function assembleScene(
  clips: readonly ClipSegment[],
  outputKey: string,
): Promise<AssembleResult> {
  const segments: Segment[] = clips.map((clip) => ({
    path: storage.absolute(clip.audioKey),
    pauseAfterMs: clip.pauseAfterMs,
  }));

  const trimmed = trimTrailingPause(segments);
  // Si la medición falla, se monta con una sola pasada: peor, pero mejor que
  // quedarse sin audio.
  const graph = buildFilterGraph(trimmed, await measure(trimmed));

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
