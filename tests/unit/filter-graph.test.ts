import { describe, expect, it } from "vitest";
import {
  buildFilterGraph,
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
