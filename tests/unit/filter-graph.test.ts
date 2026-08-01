import { describe, expect, it } from "vitest";
import {
  buildFilterGraph,
  type LoudnessMeasurement,
  parseLoudnessMeasurement,
  SAMPLE_RATE,
  type Segment,
  trimTrailingPause,
} from "@/lib/audio/filter-graph";

const clip = (path: string, pauseAfterMs = 0): Segment => ({ path, pauseAfterMs });

/** Los `-i` van intercalados con sus flags; sólo interesan los valores. */
function inputValues(inputs: readonly string[]): string[] {
  return inputs.filter((_, index) => inputs[index - 1] === "-i");
}

describe("buildFilterGraph", () => {
  it("rechaza una escena sin clips", () => {
    expect(() => buildFilterGraph([])).toThrow(/vacía/);
  });

  it("mantiene el orden de los clips", () => {
    const graph = buildFilterGraph([clip("/a.mp3"), clip("/b.mp3"), clip("/c.mp3")]);
    expect(inputValues(graph.inputs)).toEqual(["/a.mp3", "/b.mp3", "/c.mp3"]);
  });

  it("inserta una entrada de silencio por cada pausa", () => {
    const graph = buildFilterGraph([clip("/a.mp3", 300), clip("/b.mp3")]);
    const values = inputValues(graph.inputs);
    expect(values).toEqual(["/a.mp3", `anullsrc=r=${SAMPLE_RATE}:cl=mono`, "/b.mp3"]);
  });

  it("omite el silencio cuando la pausa es cero", () => {
    const graph = buildFilterGraph([clip("/a.mp3", 0), clip("/b.mp3", 0)]);
    expect(graph.filterComplex).not.toContain("anullsrc");
    expect(graph.filterComplex).toContain("concat=n=2");
  });

  it("convierte la pausa de ms a segundos con tres decimales", () => {
    const graph = buildFilterGraph([clip("/a.mp3", 350)]);
    expect(graph.inputs).toContain("0.350");
  });

  it("numera cada filtro con el índice real de su entrada", () => {
    // Un desfase aquí mezclaría el audio de un clip con el silencio de otro:
    // el resultado sería un mp3 válido pero desordenado, sin error de ffmpeg.
    const graph = buildFilterGraph([clip("/a.mp3", 200), clip("/b.mp3", 200)]);
    for (let index = 0; index < 4; index++) {
      expect(graph.filterComplex).toContain(`[${index}:a]aformat=`);
      expect(graph.filterComplex).toContain(`[a${index}]`);
    }
    expect(graph.filterComplex).toContain("concat=n=4");
  });

  it("concatena tantas etiquetas como entradas declara", () => {
    const graph = buildFilterGraph([clip("/a.mp3", 100), clip("/b.mp3"), clip("/c.mp3", 100)]);
    const declared = inputValues(graph.inputs).length;
    expect(graph.filterComplex).toContain(`concat=n=${declared}`);
  });

  it("normaliza una sola vez y al final de la cadena", () => {
    const graph = buildFilterGraph([clip("/a.mp3"), clip("/b.mp3")]);
    expect(graph.filterComplex.match(/loudnorm/g)).toHaveLength(1);
    expect(graph.filterComplex.endsWith("[out]")).toBe(true);
    expect(graph.outputLabel).toBe("[out]");
  });

  it("recorta los silencios largos de cada clip, pero no las pausas generadas", () => {
    // El proveedor deja hasta 1,4 s de silencio al final de un clip; la pausa
    // que insertamos nosotros es justo la que queremos conservar.
    const graph = buildFilterGraph([clip("/a.mp3", 300)]);
    const chains = graph.filterComplex.split(";");
    expect(chains[0]).toContain("silenceremove");
    expect(chains[1]).not.toContain("silenceremove");
  });

  it("limpia los bordes del clip sin aplastar sus pausas internas", () => {
    // Recortar todos los silencios por igual dejaba la escena sin aire tras un
    // punto: la mediana de silencio del montaje caía a 0,26 s.
    const [chain = ""] = buildFilterGraph([clip("/a.mp3")]).filterComplex.split(";");

    // La cola sólo se puede recortar del revés: stop_periods=1 corta en el
    // primer silencio interno y descarta el resto del clip.
    expect(chain.match(/areverse/g)).toHaveLength(2);
    expect(chain).toContain("start_periods=1");

    // El techo de los huecos internos tiene que dejar pasar la pausa de un punto.
    const internal = /stop_periods=-1:stop_duration=([\d.]+)/.exec(chain);
    expect(Number(internal?.[1])).toBeGreaterThanOrEqual(0.6);
  });

  it("desvanece el final del clip sin llegar a tapar la última consonante", () => {
    // 25 de 66 clips reales terminan en seco, a nivel de voz: el salto brusco a
    // silencio suena a frase amputada aunque la palabra esté entera.
    const [chain = ""] = buildFilterGraph([clip("/a.mp3")]).filterComplex.split(";");

    // El fundido va dentro de la inversión, que es lo que lo convierte en salida.
    const reversed = chain.slice(chain.indexOf("areverse"), chain.lastIndexOf("areverse"));
    const fade = /afade=t=in:d=([\d.]+)/.exec(reversed);
    expect(fade).not.toBeNull();

    // Una `s` final dura 100-150 ms; pasarse de ahí la apagaría.
    expect(Number(fade?.[1])).toBeGreaterThan(0.02);
    expect(Number(fade?.[1])).toBeLessThan(0.08);
  });

  it("mide en la primera pasada y aplica ganancia constante en la segunda", () => {
    // En una sola pasada loudnorm es dinámico y entrecorta el material flojo.
    const measuring = buildFilterGraph([clip("/a.mp3")]);
    expect(measuring.filterComplex).toContain("print_format=json");
    expect(measuring.filterComplex).not.toContain("linear=true");

    const measurement: LoudnessMeasurement = {
      inputI: "-12.79",
      inputTp: "-0.49",
      inputLra: "5.80",
      inputThresh: "-24.37",
      targetOffset: "-2.09",
    };
    const applying = buildFilterGraph([clip("/a.mp3")], measurement);
    expect(applying.filterComplex).toContain("linear=true");
    expect(applying.filterComplex).toContain("measured_I=-12.79");
    expect(applying.filterComplex).toContain("offset=-2.09");
    expect(applying.filterComplex).not.toContain("print_format");
  });

  it("devuelve la salida al ritmo de muestreo de origen", () => {
    // loudnorm trabaja a 192 kHz por dentro; sin volver a 44,1, libmp3lame
    // remuestreaba a 48 kHz con un ratio no entero sobre la fuente.
    const graph = buildFilterGraph([clip("/a.mp3")]);
    expect(graph.filterComplex).toContain(`aresample=${SAMPLE_RATE}`);
    // El aformat final fija el layout de salida para la pasada de medición.
    expect(graph.filterComplex.endsWith("[out]")).toBe(true);
    expect(graph.filterComplex.indexOf("loudnorm")).toBeLessThan(
      graph.filterComplex.indexOf("aresample"),
    );
  });
});

describe("parseLoudnessMeasurement", () => {
  const report = `[Parsed_loudnorm_0 @ 0x55] 
{
	"input_i" : "-12.79",
	"input_tp" : "-0.49",
	"input_lra" : "5.80",
	"input_thresh" : "-24.37",
	"output_i" : "-13.91",
	"target_offset" : "-2.09"
}`;

  it("saca los valores del informe de ffmpeg", () => {
    expect(parseLoudnessMeasurement(report)).toEqual({
      inputI: "-12.79",
      inputTp: "-0.49",
      inputLra: "5.80",
      inputThresh: "-24.37",
      targetOffset: "-2.09",
    });
  });

  it("devuelve undefined si el informe no trae medición", () => {
    // Preferible montar con una sola pasada que quedarse sin audio.
    expect(parseLoudnessMeasurement("ffmpeg version 8.0.1\nnada que ver")).toBeUndefined();
  });

  it("devuelve undefined con un JSON incompleto", () => {
    expect(parseLoudnessMeasurement('{ "input_i" : "-12.79" }')).toBeUndefined();
  });

  it("no revienta con un JSON malformado", () => {
    expect(parseLoudnessMeasurement('{ "input_i" : ')).toBeUndefined();
  });
});

describe("trimTrailingPause", () => {
  it("anula sólo la pausa del último segmento", () => {
    const result = trimTrailingPause([clip("/a.mp3", 300), clip("/b.mp3", 500)]);
    expect(result.map((s) => s.pauseAfterMs)).toEqual([300, 0]);
  });

  it("no muta la entrada", () => {
    const segments = [clip("/a.mp3", 500)];
    trimTrailingPause(segments);
    expect(segments[0]?.pauseAfterMs).toBe(500);
  });

  it("tolera una lista vacía", () => {
    expect(trimTrailingPause([])).toEqual([]);
  });
});
