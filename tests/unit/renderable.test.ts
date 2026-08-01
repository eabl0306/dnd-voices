import { describe, expect, it } from "vitest";
import { assertRenderable, type RenderableLine } from "@/lib/render/scene";

const line = (character: RenderableLine["character"]): RenderableLine => ({
  id: "l1",
  text: "Una frase.",
  delivery: null,
  pauseAfter: 300,
  character,
});

const voiceRef = { model: "eleven_v3" };
const withVoice = { name: "Vex", voiceId: "voice-1", voiceSettings: null, voiceRef };
const withoutVoice = { name: "Grum", voiceId: null, voiceSettings: null, voiceRef: null };

describe("assertRenderable", () => {
  it("acepta una escena con todo asignado", () => {
    expect(() => assertRenderable([line(withVoice)])).not.toThrow();
  });

  it("rechaza una escena sin líneas", () => {
    expect(() => assertRenderable([])).toThrow(/analiza el texto/i);
  });

  it("manda al guion cuando falta el hablante", () => {
    // Sin narrador por defecto, una línea puede quedarse sin personaje: el
    // arreglo está en el guion, no en el reparto.
    expect(() => assertRenderable([line(null)])).toThrow(/sin personaje.*en el guion/i);
  });

  it("cuenta cuántas intervenciones quedan sin hablante", () => {
    expect(() => assertRenderable([line(null), line(null), line(withVoice)])).toThrow(
      /2 intervenciones siguen/,
    );
  });

  it("usa el singular con una sola", () => {
    expect(() => assertRenderable([line(null)])).toThrow(/1 intervención sigue/);
  });

  it("manda al reparto y nombra a quién le falta la voz", () => {
    expect(() => assertRenderable([line(withoutVoice)])).toThrow(/Grum.*no tiene voz/i);
  });

  it("avisa antes del hablante que de la voz", () => {
    // Quien no tiene personaje tampoco tiene voz: mencionar la voz primero
    // mandaría al usuario a la pantalla equivocada.
    expect(() => assertRenderable([line(null), line(withoutVoice)])).toThrow(/sin personaje/i);
  });
});
