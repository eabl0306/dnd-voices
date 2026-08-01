import { describe, expect, it } from "vitest";
import {
  acceptsNeighbourContext,
  DEFAULT_TTS_MODEL,
  honoursLanguageCode,
  OUTPUT_FORMAT,
  supportsAudioTags,
  withDelivery,
} from "@/lib/tts/elevenlabs";

describe("configuración de síntesis", () => {
  it("pide el formato de mayor calidad que admite el plan", () => {
    // Comprobado contra la API: mp3_44100_192 responde 200 y pcm_44100 da 403
    // por suscripción insuficiente.
    expect(OUTPUT_FORMAT).toBe("mp3_44100_192");
  });

  it("usa v3 por defecto: cuesta lo mismo que v2 y entiende las indicaciones", () => {
    // /v1/models da character_cost_multiplier 1 para ambos.
    expect(DEFAULT_TTS_MODEL).toBe("eleven_v3");
  });
});

describe("compatibilidad por modelo", () => {
  it("no manda el contexto vecino a v3, que responde 400", () => {
    expect(acceptsNeighbourContext("eleven_v3")).toBe(false);
    expect(acceptsNeighbourContext("eleven_multilingual_v2")).toBe(true);
  });

  it("sólo v3 entiende las indicaciones entre corchetes", () => {
    expect(supportsAudioTags("eleven_v3")).toBe(true);
    expect(supportsAudioTags("eleven_multilingual_v2")).toBe(false);
  });

  it("no manda el idioma a los modelos que lo ignoran", () => {
    // Con semilla fija, multilingual_v2 devuelve audio idéntico con es, con en
    // y sin el parámetro.
    expect(honoursLanguageCode("eleven_multilingual_v2")).toBe(false);
    expect(honoursLanguageCode("eleven_turbo_v2_5")).toBe(true);
  });
});

describe("withDelivery", () => {
  it("antepone la indicación entre corchetes", () => {
    expect(withDelivery("Hola.", "susurrando", "eleven_v3")).toBe("[susurrando] Hola.");
  });

  it("deja el texto intacto en un modelo que la leería en voz alta", () => {
    expect(withDelivery("Hola.", "susurrando", "eleven_multilingual_v2")).toBe("Hola.");
  });

  it("no ensucia el texto cuando no hay indicación", () => {
    expect(withDelivery("Hola.", null, "eleven_v3")).toBe("Hola.");
    expect(withDelivery("Hola.", "", "eleven_v3")).toBe("Hola.");
  });
});
