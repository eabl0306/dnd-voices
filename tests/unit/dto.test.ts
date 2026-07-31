import { describe, expect, it } from "vitest";
import { isLineDubious, isRenderSettled, LOW_CONFIDENCE } from "@/lib/dto";

describe("isLineDubious", () => {
  it("marca una línea sin personaje asignado", () => {
    expect(isLineDubious({ characterId: null, confidence: 1 })).toBe(true);
  });

  it("marca una atribución por debajo del umbral", () => {
    expect(isLineDubious({ characterId: "c1", confidence: LOW_CONFIDENCE - 0.01 })).toBe(true);
  });

  it("no marca una atribución justo en el umbral", () => {
    expect(isLineDubious({ characterId: "c1", confidence: LOW_CONFIDENCE })).toBe(false);
  });

  it("no marca una atribución segura", () => {
    expect(isLineDubious({ characterId: "c1", confidence: 1 })).toBe(false);
  });
});

describe("isRenderSettled", () => {
  it.each(["DONE", "FAILED"] as const)("considera %s terminado", (status) => {
    expect(isRenderSettled(status)).toBe(true);
  });

  it.each(["QUEUED", "RUNNING"] as const)("considera %s en curso", (status) => {
    // De esto depende que el polling pare; un fallo aquí es un bucle infinito.
    expect(isRenderSettled(status)).toBe(false);
  });
});
