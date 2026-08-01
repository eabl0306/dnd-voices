export const SAMPLE_RATE = 44100;

export type Segment = {
  /** Ruta absoluta del clip mp3. */
  path: string;
  /** Silencio en ms insertado después del clip. */
  pauseAfterMs: number;
};

export type FilterGraph = {
  /** Argumentos `-i` en el orden en que ffmpeg los numera. */
  inputs: string[];
  /** Valor de `-filter_complex`. */
  filterComplex: string;
  /** Etiqueta de salida a la que apuntar con `-map`. */
  outputLabel: string;
};

const format = (index: number) =>
  `[${index}:a]aformat=sample_fmts=fltp:sample_rates=${SAMPLE_RATE}:channel_layouts=mono[a${index}]`;

const silence = (ms: number) => [
  "-f",
  "lavfi",
  "-t",
  (ms / 1000).toFixed(3),
  "-i",
  `anullsrc=r=${SAMPLE_RATE}:cl=mono`,
];

/**
 * Construye el grafo de filtros que concatena los clips con sus pausas y
 * normaliza el conjunto.
 *
 * Es una función pura para poder verificar el grafo sin invocar a ffmpeg: un
 * error de índice aquí produce audio silencioso o desordenado, no un fallo.
 *
 * La normalización va al final y no clip a clip a propósito: cada voz llega a
 * un volumen distinto de ElevenLabs, y normalizar por separado aplanaría justo
 * el contraste entre un susurro y un grito que hace que la escena funcione.
 */
export function buildFilterGraph(segments: readonly Segment[]): FilterGraph {
  if (segments.length === 0) {
    throw new Error("No hay clips que montar: la escena está vacía.");
  }

  const inputs: string[] = [];
  const filters: string[] = [];
  const labels: string[] = [];
  let index = 0;

  const push = (args: string[]) => {
    inputs.push(...args);
    filters.push(format(index));
    labels.push(`[a${index}]`);
    index++;
  };

  for (const segment of segments) {
    push(["-i", segment.path]);
    if (segment.pauseAfterMs > 0) push(silence(segment.pauseAfterMs));
  }

  return {
    inputs,
    // loudnorm a -16 LUFS: el estándar de podcast, cómodo con auriculares en mesa.
    //
    // El aresample final no sobra: loudnorm trabaja internamente a 192 kHz y
    // arrastra su salida, con lo que libmp3lame acababa remuestreando a 48 kHz.
    // Volver a 44,1 evita un remuestreo de ratio no entero sobre la fuente.
    filterComplex: [
      ...filters,
      `${labels.join("")}concat=n=${labels.length}:v=0:a=1[joined]`,
      `[joined]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=${SAMPLE_RATE}[out]`,
    ].join(";"),
    outputLabel: "[out]",
  };
}

/**
 * La última pausa sobra: dejaría silencio colgando al final del archivo.
 * Devuelve una copia; el llamante no espera que se le mute la entrada.
 */
export function trimTrailingPause(segments: readonly Segment[]): Segment[] {
  return segments.map((segment, index) =>
    index === segments.length - 1 ? { ...segment, pauseAfterMs: 0 } : { ...segment },
  );
}
