import { describe, expect, it } from "vitest";
import { voiceState } from "@/lib/dto";
import { campaignTint, characterColor, characterHue, GLYPH, initials } from "@/lib/tone";

describe("characterHue", () => {
  it("es estable para el mismo id", () => {
    expect(characterHue("abc123")).toBe(characterHue("abc123"));
  });

  it("reparte ids distintos entre varios tonos", () => {
    const ids = Array.from({ length: 40 }, (_, index) => `cm${index}xyz`);
    const hues = new Set(ids.map(characterHue));
    expect(hues.size).toBeGreaterThan(3);
  });

  it("devuelve siempre un tono de la paleta", () => {
    for (const id of ["", "a", "personaje-largo-con-guiones"]) {
      const hue = characterHue(id);
      expect(Number.isInteger(hue)).toBe(true);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it("produce colores oklch válidos", () => {
    expect(characterColor("c1")).toMatch(/^oklch\(0\.66 0\.13 \d+\)$/);
    expect(campaignTint("c1")).toMatch(/^oklch\(0\.66 0\.13 \d+ \/ 0\.28\)$/);
  });
});

describe("initials", () => {
  it.each([
    ["Los muelles de Vantre", "LM"],
    ["Vantre", "VA"],
    ["  espacios  raros  ", "ER"],
  ])("saca %s → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it("no revienta con un nombre vacío", () => {
    expect(initials("   ")).toBe("··");
  });
});

describe("voiceState", () => {
  it("prioriza el estado sobre la estrategia mientras asigna", () => {
    // Una voz en curso es «asignando» aunque su estrategia sea generar.
    const state = voiceState({ voiceStatus: "PENDING", voiceStrategy: "DESIGNED" });
    expect(state.glyph).toBe(GLYPH.assigning);
    expect(state.tone).toBe("warn");
  });

  it("marca el fallo por encima de todo", () => {
    const state = voiceState({ voiceStatus: "FAILED", voiceStrategy: "POOL" });
    expect(state.glyph).toBe(GLYPH.failed);
    expect(state.tone).toBe("err");
  });

  it.each([
    ["DESIGNED", GLYPH.generated],
    ["POOL", GLYPH.pool],
    ["LIBRARY", GLYPH.library],
  ] as const)("da a %s el glifo %s cuando está lista", (strategy, glyph) => {
    expect(voiceState({ voiceStatus: "READY", voiceStrategy: strategy }).glyph).toBe(glyph);
  });

  it("nunca devuelve una etiqueta vacía", () => {
    // El color solo no basta: la palabra es la mitad de la señal.
    for (const status of ["PENDING", "READY", "FAILED"] as const) {
      for (const strategy of ["DESIGNED", "POOL", "LIBRARY"] as const) {
        expect(voiceState({ voiceStatus: status, voiceStrategy: strategy }).label).not.toBe("");
      }
    }
  });
});
