import { describe, expect, it } from "vitest";
import type { AttributedLine } from "@/lib/ai/schemas";
import { type KnownCharacter, mapAttributedLines } from "@/lib/render/line-mapper";
import {
  PAUSE_NARRATOR_BLOCK_MS,
  PAUSE_SAME_SPEAKER_MS,
} from "@/lib/render/pauses";

const NARRATOR: KnownCharacter = { id: "n1", name: "Narrador", isNarrator: true };
const THORIN: KnownCharacter = { id: "c1", name: "Thorin", isNarrator: false };
const CAST = [NARRATOR, THORIN];

const line = (patch: Partial<AttributedLine>): AttributedLine => ({
  speaker: "NARRADOR",
  text: "La taberna huele a cerveza rancia.",
  delivery: "",
  confidence: 1,
  ...patch,
});

describe("mapAttributedLines", () => {
  it("numera las líneas por su posición", () => {
    const result = mapAttributedLines([line({}), line({}), line({})], CAST);
    expect(result.map((l) => l.order)).toEqual([0, 1, 2]);
  });

  it("resuelve NARRADOR al personaje narrador", () => {
    const [mapped] = mapAttributedLines([line({ speaker: "NARRADOR" })], CAST);
    expect(mapped?.characterId).toBe(NARRATOR.id);
  });

  it("resuelve personajes ignorando mayúsculas y espacios", () => {
    const [mapped] = mapAttributedLines([line({ speaker: "  tHoRiN " })], CAST);
    expect(mapped?.characterId).toBe(THORIN.id);
  });

  it("cae al narrador cuando el hablante no está en el reparto", () => {
    // Perder el texto sería peor que atribuirlo mal.
    const [mapped] = mapAttributedLines([line({ speaker: "Bilbo", text: "Hola" })], CAST);
    expect(mapped?.characterId).toBe(NARRATOR.id);
    expect(mapped?.text).toBe("Hola");
  });

  it("pone confianza 0 en un hablante desconocido para que la UI lo marque", () => {
    const [mapped] = mapAttributedLines([line({ speaker: "Bilbo", confidence: 0.9 })], CAST);
    expect(mapped?.confidence).toBe(0);
  });

  it("conserva la confianza de un hablante reconocido", () => {
    const [mapped] = mapAttributedLines([line({ speaker: "Thorin", confidence: 0.5 })], CAST);
    expect(mapped?.confidence).toBe(0.5);
  });

  it("deja characterId nulo si la campaña no tiene narrador", () => {
    const [mapped] = mapAttributedLines([line({ speaker: "Bilbo" })], [THORIN]);
    expect(mapped?.characterId).toBeNull();
  });

  it("normaliza un delivery vacío a null", () => {
    const [mapped] = mapAttributedLines([line({ delivery: "   " })], CAST);
    expect(mapped?.delivery).toBeNull();
  });

  it("conserva un delivery con contenido", () => {
    const [mapped] = mapAttributedLines([line({ delivery: "susurrando" })], CAST);
    expect(mapped?.delivery).toBe("susurrando");
  });

  it("calcula la pausa mirando quién habla en la línea siguiente", () => {
    // El narrador cediendo la palabra pide más aire que Thorin siguiendo solo.
    const result = mapAttributedLines(
      [line({ speaker: "NARRADOR" }), line({ speaker: "Thorin" }), line({ speaker: "Thorin" })],
      CAST,
    );
    expect(result[0]?.pauseAfter).toBe(PAUSE_NARRATOR_BLOCK_MS);
    expect(result[1]?.pauseAfter).toBe(PAUSE_SAME_SPEAKER_MS);
  });

  it("devuelve una lista vacía sin líneas", () => {
    expect(mapAttributedLines([], CAST)).toEqual([]);
  });
});
