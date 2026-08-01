import { describe, expect, it } from "vitest";
import { honoursLanguageCode, OUTPUT_FORMAT, TTS_MODEL } from "@/lib/tts/elevenlabs";

describe("configuración de síntesis", () => {
  it("pide el formato de mayor calidad que admite el plan", () => {
    // Comprobado contra la API: mp3_44100_192 responde 200 y pcm_44100 da 403
    // por suscripción insuficiente.
    expect(OUTPUT_FORMAT).toBe("mp3_44100_192");
  });

  it("no manda el idioma al modelo que lo ignora", () => {
    // Con semilla fija, eleven_multilingual_v2 devuelve audio byte a byte
    // idéntico con `es`, con `en` y sin el parámetro.
    expect(honoursLanguageCode(TTS_MODEL)).toBe(false);
  });

  it("sí lo mandaría a los modelos que sí lo respetan", () => {
    expect(honoursLanguageCode("eleven_turbo_v2_5")).toBe(true);
    expect(honoursLanguageCode("eleven_flash_v2_5")).toBe(true);
  });

  it("no da por buenos modelos desconocidos", () => {
    expect(honoursLanguageCode("eleven_v3")).toBe(false);
    expect(honoursLanguageCode("")).toBe(false);
  });
});
