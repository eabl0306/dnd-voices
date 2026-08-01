import { describe, expect, it } from "vitest";
import {
  PAUSE_NARRATOR_BLOCK_MS,
  PAUSE_SAME_SPEAKER_MS,
  PAUSE_SPEAKER_CHANGE_MS,
  PAUSE_UNFINISHED_MS,
  type PauseContext,
  pauseAfterFor,
} from "@/lib/render/pauses";

const narrator = (text = "La sala queda en silencio."): PauseContext => ({
  characterId: "n1",
  isNarrator: true,
  text,
});

const thorin = (text = "No pienso moverme."): PauseContext => ({
  characterId: "c1",
  isNarrator: false,
  text,
});

const elara = (text = "Pues yo sí."): PauseContext => ({
  characterId: "c2",
  isNarrator: false,
  text,
});

describe("pauseAfterFor", () => {
  it("encadena dos líneas del mismo personaje", () => {
    expect(pauseAfterFor(thorin(), thorin())).toBe(PAUSE_SAME_SPEAKER_MS);
  });

  it("respira más al cambiar de personaje", () => {
    expect(pauseAfterFor(thorin(), elara())).toBe(PAUSE_SPEAKER_CHANGE_MS);
    expect(PAUSE_SPEAKER_CHANGE_MS).toBeGreaterThan(PAUSE_SAME_SPEAKER_MS);
  });

  it("da la pausa más larga al entrar o salir el narrador", () => {
    expect(pauseAfterFor(narrator(), thorin())).toBe(PAUSE_NARRATOR_BLOCK_MS);
    expect(pauseAfterFor(thorin(), narrator())).toBe(PAUSE_NARRATOR_BLOCK_MS);
    expect(PAUSE_NARRATOR_BLOCK_MS).toBeGreaterThan(PAUSE_SPEAKER_CHANGE_MS);
  });

  it("acorta cuando la frase queda en suspenso y sigue el mismo personaje", () => {
    expect(pauseAfterFor(thorin("Yo lo intenté, pero..."), thorin())).toBe(
      PAUSE_SAME_SPEAKER_MS,
    );
    expect(pauseAfterFor(thorin("Escucha, enano,"), thorin())).toBe(PAUSE_UNFINISHED_MS);
    expect(pauseAfterFor(thorin("Sólo diré esto:"), thorin())).toBe(PAUSE_UNFINISHED_MS);
  });

  it("ignora el suspenso si cambia el hablante", () => {
    // Aunque la frase quede a medias, el relevo de voz hay que marcarlo.
    expect(pauseAfterFor(thorin("Escucha, enano,"), elara())).toBe(PAUSE_SPEAKER_CHANGE_MS);
  });

  it("detecta el suspenso aunque el signo lleve comillas detrás", () => {
    expect(pauseAfterFor(thorin('«Escucha, enano,»'), thorin())).toBe(PAUSE_UNFINISHED_MS);
  });

  it("no trata dos líneas sin personaje como el mismo hablante", () => {
    // Comparar null con null las encadenaría como si fueran la misma voz.
    const huerfana: PauseContext = { characterId: null, isNarrator: false, text: "Hola." };
    expect(pauseAfterFor(huerfana, huerfana)).toBe(PAUSE_SPEAKER_CHANGE_MS);
  });

  it("devuelve un valor coherente en la última línea", () => {
    // El montaje descarta esta pausa; sólo se comprueba que no reviente.
    expect(pauseAfterFor(thorin(), undefined)).toBe(PAUSE_SAME_SPEAKER_MS);
  });
});
