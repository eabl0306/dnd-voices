export const SAMPLE_RATE = 44100;

export type Segment = {
  /** Ruta absoluta del clip mp3. */
  path: string;
  /** Silencio en ms insertado después del clip. */
  pauseAfterMs: number;
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
 * Umbral por debajo del cual se considera silencio.
 *
 * −45 dB y no el −60 dB de manual: v3 no deja silencio digital entre frases,
 * deja fondo a −47 dB. A −60 dB no se tocaba nada. Verificado transcribiendo la
 * voz más susurrada del reparto antes y después: a −45 dB no se pierde ninguna
 * palabra, tampoco una `s` final, que es lo que primero se cae.
 */
const FLOOR = "-45dB";

/** Arranque mudo del clip. Se deja un respiro mínimo para no cortar en seco. */
const TRIM_HEAD = `silenceremove=start_periods=1:start_silence=0.05:start_threshold=${FLOOR}`;

/**
 * Techo de los huecos *dentro* de una intervención.
 *
 * `silenceremove` conserva `stop_duration` + `stop_silence` de cada tramo y tira
 * el resto, así que este 0,70 s es el máximo que sobrevive. Antes era 0,35 s y
 * aplastaba por igual la pausa buena de un punto y la basura del proveedor: la
 * escena montada tenía una mediana de silencio de 0,26 s y sonaba atropellada.
 * A 0,70 s la pausa natural de v3 tras un punto pasa entera y sólo se recorta lo
 * que ya es tiempo muerto.
 */
const CAP_INTERNAL = `silenceremove=stop_periods=-1:stop_duration=0.70:stop_threshold=${FLOOR}`;

/**
 * Cola del clip, donde el proveedor deja hasta 1,4 s de nada.
 *
 * Va del revés porque `stop_periods=1` no recorta el final: corta en el primer
 * silencio interno y tira todo lo que venga después. Invirtiendo, la cola pasa a
 * ser la cabeza y `start_periods` sí la trata bien. Se dejan 0,08 s para que la
 * voz termine de decaer en vez de chocar contra el cero absoluto de la pausa.
 */
const TRIM_TAIL = `areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=${FLOOR},areverse`;

/** Limpieza completa de un clip: bordes fuera, pausas internas respetadas. */
const TRIM_SILENCE = [TRIM_HEAD, CAP_INTERNAL, TRIM_TAIL].join(",");

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
    push(["-i", segment.path], `${FORMAT},${TRIM_SILENCE}`);
    // El silencio generado no se recorta: es justo la pausa que queremos.
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
