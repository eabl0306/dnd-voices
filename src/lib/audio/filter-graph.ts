export const SAMPLE_RATE = 44100;

export type Segment = {
  /** Ruta absoluta del clip mp3. */
  path: string;
  /** Silencio en ms insertado después del clip. */
  pauseAfterMs: number;
  /** Fundido de salida manual en ms. 0 = el clip termina tal cual llegó. */
  fadeOutMs: number;
};

/** Valores que devuelve la pasada de medición de loudnorm. */
export type LoudnessMeasurement = {
  inputI: string;
  inputTp: string;
  inputLra: string;
  inputThresh: string;
  targetOffset: string;
};

export type FilterGraph = {
  /** Argumentos `-i` en el orden en que ffmpeg los numera. */
  inputs: string[];
  /** Valor de `-filter_complex`. */
  filterComplex: string;
  /** Etiqueta de salida a la que apuntar con `-map`. */
  outputLabel: string;
};

const FORMAT = `aformat=sample_fmts=fltp:sample_rates=${SAMPLE_RATE}:channel_layouts=mono`;

/**
 * Los clips se montan tal cual llegan del proveedor: sin recortar silencios y
 * sin fundidos automáticos.
 *
 * Hubo tres iteraciones de limpieza automática (recorte a 0,35 s, recorte sólo
 * de bordes, desvanecido global de 40 ms) y en la prueba A/B contra el montaje
 * crudo el crudo ganó siempre: cada regla global arreglaba unos clips y
 * estropeaba otros. El control fino queda en manos del DM, por línea:
 * `pauseAfter` para el silencio y `fadeOutMs` para el decaimiento.
 *
 * El fundido va del revés —`afade=t=in` sobre el audio invertido— porque así es
 * un fundido de salida sin tener que saber cuánto dura el clip.
 */
function fadeOut(ms: number): string {
  return `areverse,afade=t=in:d=${(ms / 1000).toFixed(3)},areverse`;
}

const TARGET = "I=-16:TP=-1.5:LRA=11";

/**
 * loudnorm en dos pasadas.
 *
 * En una sola pasada es un normalizador *dinámico*: sobre material flojo, como
 * una intervención susurrada, sube y baja la ganancia cada pocos milisegundos y
 * el resultado se oye entrecortado. Con los valores ya medidos y `linear=true`
 * aplica una única ganancia constante, que además respeta el contraste entre un
 * susurro y un grito.
 */
function loudnorm(measurement: LoudnessMeasurement | undefined): string {
  if (!measurement) return `loudnorm=${TARGET}:print_format=json`;
  return [
    `loudnorm=${TARGET}`,
    `measured_I=${measurement.inputI}`,
    `measured_TP=${measurement.inputTp}`,
    `measured_LRA=${measurement.inputLra}`,
    `measured_thresh=${measurement.inputThresh}`,
    `offset=${measurement.targetOffset}`,
    "linear=true",
  ].join(":");
}

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
 * Sin `measurement` devuelve el grafo de la pasada de medición; con él, el de
 * la pasada que escribe el audio definitivo.
 */
export function buildFilterGraph(
  segments: readonly Segment[],
  measurement?: LoudnessMeasurement,
): FilterGraph {
  if (segments.length === 0) {
    throw new Error("No hay clips que montar: la escena está vacía.");
  }

  const inputs: string[] = [];
  const filters: string[] = [];
  const labels: string[] = [];
  let index = 0;

  const push = (args: string[], chain: string) => {
    inputs.push(...args);
    filters.push(`[${index}:a]${chain}[a${index}]`);
    labels.push(`[a${index}]`);
    index++;
  };

  for (const segment of segments) {
    const chain =
      segment.fadeOutMs > 0 ? `${FORMAT},${fadeOut(segment.fadeOutMs)}` : FORMAT;
    push(["-i", segment.path], chain);
    if (segment.pauseAfterMs > 0) push(silence(segment.pauseAfterMs), FORMAT);
  }

  return {
    inputs,
    // El aresample final no sobra: loudnorm trabaja internamente a 192 kHz y
    // arrastra su salida, con lo que libmp3lame acababa remuestreando a 48 kHz.
    filterComplex: [
      ...filters,
      `${labels.join("")}concat=n=${labels.length}:v=0:a=1[joined]`,
      // El aformat final fija el layout de la salida: sin él, la pasada de
      // medición no negocia con el muxer null y ffmpeg aborta.
      `[joined]${loudnorm(measurement)},aresample=${SAMPLE_RATE},${FORMAT}[out]`,
    ].join(";"),
    outputLabel: "[out]",
  };
}

/**
 * Extrae la medición del JSON que loudnorm imprime en stderr.
 *
 * Devuelve undefined si no aparece: la mezcla se hará con una sola pasada, peor
 * pero funcional, en vez de romper el render entero.
 */
export function parseLoudnessMeasurement(
  stderr: string,
): LoudnessMeasurement | undefined {
  const match = /\{[^{}]*"input_i"[\s\S]*?\}/.exec(stderr);
  if (!match) return undefined;

  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!parsed || typeof parsed !== "object") return undefined;
    const values = parsed as Record<string, unknown>;
    const read = (key: string) =>
      typeof values[key] === "string" ? (values[key] as string) : undefined;

    const inputI = read("input_i");
    const inputTp = read("input_tp");
    const inputLra = read("input_lra");
    const inputThresh = read("input_thresh");
    const targetOffset = read("target_offset");
    if (!inputI || !inputTp || !inputLra || !inputThresh || !targetOffset) return undefined;

    return { inputI, inputTp, inputLra, inputThresh, targetOffset };
  } catch {
    return undefined;
  }
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
