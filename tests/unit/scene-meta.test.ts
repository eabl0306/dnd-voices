import { describe, expect, it } from "vitest";
import { LOW_CONFIDENCE } from "@/lib/dto";
import { countPendingReview, excerptOf } from "@/lib/queries/scene-meta";

describe("countPendingReview", () => {
  it("cuenta las líneas sin personaje", () => {
    expect(countPendingReview([{ characterId: null, confidence: 1 }])).toBe(1);
  });

  it("cuenta las que están por debajo del umbral", () => {
    expect(
      countPendingReview([{ characterId: "c1", confidence: LOW_CONFIDENCE - 0.01 }]),
    ).toBe(1);
  });

  it("no cuenta las que están justo en el umbral", () => {
    expect(countPendingReview([{ characterId: "c1", confidence: LOW_CONFIDENCE }])).toBe(0);
  });

  it("usa el mismo criterio que la interfaz", () => {
    // Si divergieran, la barra lateral anunciaría un número de pendientes que
    // no coincide con las filas en ámbar del guion.
    const lines = [
      { characterId: "c1", confidence: 1 },
      { characterId: null, confidence: 1 },
      { characterId: "c2", confidence: 0.4 },
    ];
    expect(countPendingReview(lines)).toBe(2);
  });

  it("devuelve cero sin líneas", () => {
    expect(countPendingReview([])).toBe(0);
  });
});

describe("excerptOf", () => {
  it("avisa cuando la escena no tiene texto", () => {
    expect(excerptOf("")).toBe("Sin texto todavía");
    expect(excerptOf("   \n  ")).toBe("Sin texto todavía");
  });

  it("aplana los saltos de línea", () => {
    expect(excerptOf("Primera línea.\n\nSegunda línea.")).toBe(
      "Primera línea. Segunda línea.",
    );
  });

  it("deja intacto un texto corto", () => {
    expect(excerptOf("Texto corto.")).toBe("Texto corto.");
  });

  it("corta por palabra y añade puntos suspensivos", () => {
    const long = "palabra ".repeat(30).trim();
    const result = excerptOf(long, 20);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21);
    // Partir a mitad de palabra cuesta más de leer de un vistazo.
    expect(result).not.toMatch(/pala…$/);
  });

  it("corta duro si no hay ningún espacio donde partir", () => {
    const result = excerptOf("a".repeat(50), 10);
    expect(result).toBe(`${"a".repeat(10)}…`);
  });
});
