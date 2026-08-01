import { describe, expect, it } from "vitest";
import {
  adjustableSettings,
  clampVoiceSettings,
  defaultVoiceSettings,
  SETTING_RANGE,
} from "@/lib/voice-settings";

describe("adjustableSettings", () => {
  it("en v3 sólo ofrece estabilidad", () => {
    // Comprobado contra la API: v3 devuelve la misma duración con cualquier
    // velocidad, estilo o fidelidad. Un control que no hace nada engaña.
    expect(adjustableSettings("eleven_v3")).toEqual(["stability"]);
  });

  it("en v2 ofrece los cuatro", () => {
    expect(adjustableSettings("eleven_multilingual_v2")).toHaveLength(4);
    expect(adjustableSettings("eleven_multilingual_v2")).toContain("speed");
  });
});

describe("defaultVoiceSettings", () => {
  it("da al narrador más estabilidad que a un personaje", () => {
    // Es quien más habla: si su timbre baila entre turnos, se nota enseguida.
    expect(defaultVoiceSettings(true).stability).toBeGreaterThan(
      defaultVoiceSettings(false).stability,
    );
  });

  it("no deja al narrador con exageración de estilo", () => {
    expect(defaultVoiceSettings(true).style).toBeLessThan(0.2);
  });

  it("se queda por debajo del umbral en que la voz suena robótica", () => {
    expect(defaultVoiceSettings(true).stability).toBeLessThanOrEqual(0.65);
  });
});

describe("clampVoiceSettings", () => {
  it("recorta al margen que admite el proveedor", () => {
    const clamped = clampVoiceSettings({
      stability: 2,
      similarityBoost: -1,
      style: 5,
      speed: 3,
    });
    expect(clamped.stability).toBe(1);
    expect(clamped.similarityBoost).toBe(0);
    expect(clamped.style).toBe(1);
    // Fuera de 0,7–1,2 el proveedor responde 422.
    expect(clamped.speed).toBe(SETTING_RANGE.speed.max);
  });

  it("deja intactos los valores válidos", () => {
    const ok = { stability: 0.5, similarityBoost: 0.75, style: 0.3, speed: 1 };
    expect(clampVoiceSettings(ok)).toEqual(ok);
  });
});
