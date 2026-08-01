import { describe, expect, it } from "vitest";
import { parseRangeHeader } from "@/lib/http-range";

const SIZE = 1000;

describe("parseRangeHeader", () => {
  it("sin header sirve el recurso entero", () => {
    expect(parseRangeHeader(null, SIZE)).toBeNull();
    expect(parseRangeHeader("", SIZE)).toBeNull();
  });

  it("interpreta un rango cerrado", () => {
    expect(parseRangeHeader("bytes=0-499", SIZE)).toEqual({ start: 0, end: 499 });
    expect(parseRangeHeader("bytes=500-999", SIZE)).toEqual({ start: 500, end: 999 });
  });

  it("un rango abierto llega hasta el final", () => {
    // Es la petición típica del <audio> al hacer seek: "desde aquí en adelante".
    expect(parseRangeHeader("bytes=200-", SIZE)).toEqual({ start: 200, end: 999 });
  });

  it("la forma sufijo devuelve los últimos N bytes", () => {
    expect(parseRangeHeader("bytes=-100", SIZE)).toEqual({ start: 900, end: 999 });
    // Un sufijo mayor que el recurso se recorta al principio, no falla.
    expect(parseRangeHeader("bytes=-5000", SIZE)).toEqual({ start: 0, end: 999 });
  });

  it("recorta el final al tamaño real del recurso", () => {
    expect(parseRangeHeader("bytes=900-5000", SIZE)).toEqual({ start: 900, end: 999 });
  });

  it("un inicio fuera del recurso es insatisfacible", () => {
    expect(parseRangeHeader("bytes=1000-", SIZE)).toBe("unsatisfiable");
    expect(parseRangeHeader("bytes=5000-6000", SIZE)).toBe("unsatisfiable");
  });

  it("un sufijo de cero bytes es insatisfacible", () => {
    expect(parseRangeHeader("bytes=-0", SIZE)).toBe("unsatisfiable");
  });

  it("sobre un recurso vacío cualquier rango es insatisfacible", () => {
    expect(parseRangeHeader("bytes=0-", 0)).toBe("unsatisfiable");
  });

  it("ignora headers malformados y sirve entero, que siempre es válido", () => {
    for (const header of [
      "bytes=abc-def",
      "chars=0-100",
      "bytes=0-1,5-9", // multi-rango: ningún reproductor de audio lo pide
      "bytes=-",
      "bytes=500-200", // start > end: malformado, no insatisfacible
    ]) {
      expect(parseRangeHeader(header, SIZE), header).toBeNull();
    }
  });

  it("tolera espacios alrededor del header", () => {
    expect(parseRangeHeader("  bytes=0-9  ", SIZE)).toEqual({ start: 0, end: 9 });
  });
});
