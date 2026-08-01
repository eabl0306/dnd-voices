import { describe, expect, it } from "vitest";
import {
  AttributionSchema,
  DesignBriefSchema,
  PoolPickSchema,
  VoiceSettingsSchema,
} from "@/lib/ai/schemas";

const SETTINGS = { stability: 0.5, similarityBoost: 0.7, style: 0.2, speed: 1 };

describe("VoiceSettingsSchema", () => {
  it("acepta valores dentro de rango", () => {
    expect(VoiceSettingsSchema.parse(SETTINGS)).toEqual(SETTINGS);
  });

  it.each([
    ["stability por encima de 1", { stability: 1.4 }],
    ["similarityBoost negativo", { similarityBoost: -0.1 }],
    ["style por encima de 1", { style: 2 }],
    ["speed fuera del rango de ElevenLabs", { speed: 2 }],
    ["speed por debajo del mínimo", { speed: 0.5 }],
  ])("rechaza %s", (_label, patch) => {
    // Un valor fuera de rango es un 422 de ElevenLabs a mitad del render.
    expect(VoiceSettingsSchema.safeParse({ ...SETTINGS, ...patch }).success).toBe(false);
  });
});

describe("AttributionSchema", () => {
  const line = { speaker: "Thorin", text: "Hola", delivery: "", confidence: 0.8 };

  it("acepta una atribución completa", () => {
    const parsed = AttributionSchema.parse({ lines: [line], unknownSpeakers: ["Bilbo"] });
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.unknownSpeakers).toEqual(["Bilbo"]);
  });

  it("acepta una escena sin líneas", () => {
    expect(AttributionSchema.parse({ lines: [], unknownSpeakers: [] }).lines).toEqual([]);
  });

  it("rechaza una confianza fuera de 0..1", () => {
    const bad = { lines: [{ ...line, confidence: 1.5 }], unknownSpeakers: [] };
    expect(AttributionSchema.safeParse(bad).success).toBe(false);
  });

  it("exige unknownSpeakers aunque esté vacío", () => {
    expect(AttributionSchema.safeParse({ lines: [line] }).success).toBe(false);
  });
});

describe("DesignBriefSchema", () => {
  const brief = {
    voiceDescription: "gravelly middle-aged male, scottish accent",
    // Voice Design rechaza por debajo de 100 caracteres.
    previewText:
      "Ya basta de esperar. Llevamos media vida cumpliendo órdenes de quien nunca ha pisado estos muelles, y hoy se acaba.",
    settings: SETTINGS,
    rationale: "porque sí",
  };

  it("acepta un brief completo", () => {
    expect(DesignBriefSchema.parse(brief).voiceDescription).toContain("scottish");
  });

  it("rechaza una descripción vacía", () => {
    // Voice Design con prompt vacío devuelve una voz aleatoria e inservible.
    expect(DesignBriefSchema.safeParse({ ...brief, voiceDescription: "" }).success).toBe(false);
  });

  it("rechaza un previewText vacío", () => {
    expect(DesignBriefSchema.safeParse({ ...brief, previewText: "" }).success).toBe(false);
  });
});

describe("PoolPickSchema", () => {
  it("rechaza un voiceId vacío", () => {
    const bad = { voiceId: "", settings: SETTINGS, rationale: "" };
    expect(PoolPickSchema.safeParse(bad).success).toBe(false);
  });
});

describe("DesignBriefSchema · longitud del texto de prueba", () => {
  const brief = {
    voiceDescription: "gravelly middle-aged male, scottish accent",
    previewText: "x".repeat(100),
    settings: SETTINGS,
    rationale: "porque sí",
  };

  it("exige los 100 caracteres que pide Voice Design", () => {
    // Por debajo, el proveedor responde 422 string_too_short y el casting falla
    // después de haber gastado la llamada a Claude.
    expect(DesignBriefSchema.safeParse({ ...brief, previewText: "x".repeat(99) }).success).toBe(
      false,
    );
    expect(DesignBriefSchema.safeParse(brief).success).toBe(true);
  });
});
