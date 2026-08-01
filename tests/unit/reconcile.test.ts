import { describe, expect, it } from "vitest";
import type { MappedLine } from "@/lib/render/line-mapper";
import { appendedText, type ExistingLine, reconcileLines } from "@/lib/render/reconcile";

const existing = (id: string, text: string): ExistingLine => ({ id, text });

const incoming = (text: string, characterId = "c1"): MappedLine => ({
  order: 0,
  characterId,
  text,
  delivery: null,
  confidence: 1,
  pauseAfter: 400,
});

describe("appendedText", () => {
  it("devuelve la cola cuando el texto sólo ha crecido", () => {
    expect(appendedText("Primera parte.", "Primera parte.\n\nSegunda parte.")).toBe(
      "\n\nSegunda parte.",
    );
  });

  it("devuelve cadena vacía cuando el texto no ha cambiado", () => {
    // Distinto de null: no hay nada que analizar, pero tampoco nada que rehacer.
    expect(appendedText("Igual.", "Igual.")).toBe("");
  });

  it("devuelve null si se tocó algo de lo ya analizado", () => {
    expect(appendedText("La taberna huele a cerveza.", "La taberna huele a vino.")).toBeNull();
    expect(appendedText("Segunda parte.", "Primera parte.\nSegunda parte.")).toBeNull();
  });

  it("devuelve null si nunca se había analizado nada", () => {
    expect(appendedText("", "Texto nuevo.")).toBeNull();
    expect(appendedText("   \n ", "Texto nuevo.")).toBeNull();
  });
});

describe("reconcileLines", () => {
  it("conserva todo y sólo añade al final cuando el guion crece", () => {
    const result = reconcileLines(
      [existing("l1", "Hola."), existing("l2", "Adiós.")],
      [incoming("Hola."), incoming("Adiós."), incoming("Y una más.")],
    );

    expect(result.keep).toEqual([
      { id: "l1", order: 0 },
      { id: "l2", order: 1 },
    ]);
    expect(result.create.map((line) => line.text)).toEqual(["Y una más."]);
    expect(result.removeIds).toEqual([]);
  });

  it("conserva las líneas intactas alrededor de una editada", () => {
    // Es lo que salva el audio: sólo se refactura lo que de verdad cambió.
    const result = reconcileLines(
      [existing("l1", "Primera."), existing("l2", "Segunda."), existing("l3", "Tercera.")],
      [incoming("Primera."), incoming("Segunda corregida."), incoming("Tercera.")],
    );

    expect(result.keep).toEqual([
      { id: "l1", order: 0 },
      { id: "l3", order: 2 },
    ]);
    expect(result.create.map((line) => line.text)).toEqual(["Segunda corregida."]);
    expect(result.removeIds).toEqual(["l2"]);
  });

  it("reordena sin recrear cuando se inserta algo por delante", () => {
    const result = reconcileLines(
      [existing("l1", "Hola.")],
      [incoming("Antes."), incoming("Hola.")],
    );

    expect(result.keep).toEqual([{ id: "l1", order: 1 }]);
    expect(result.create.map((line) => line.text)).toEqual(["Antes."]);
  });

  it("empareja por orden las líneas de texto idéntico", () => {
    // Sin el reparto voraz, dos «Sí.» podrían intercambiarse el audio y los
    // ajustes, que es un fallo invisible hasta que se escucha la escena.
    const result = reconcileLines(
      [existing("l1", "Sí."), existing("l2", "Sí."), existing("l3", "No.")],
      [incoming("Sí."), incoming("No."), incoming("Sí.")],
    );

    expect(result.keep).toEqual([
      { id: "l1", order: 0 },
      { id: "l3", order: 1 },
      { id: "l2", order: 2 },
    ]);
    expect(result.create).toEqual([]);
    expect(result.removeIds).toEqual([]);
  });

  it("no da por nueva una línea que sólo cambió de espaciado", () => {
    // Claude puede espaciar distinto entre dos análisis y eso no cambia ni una
    // sílaba de lo que se sintetiza.
    const result = reconcileLines(
      [existing("l1", "  Hola,\n  qué tal.  ")],
      [incoming("Hola, qué tal.")],
    );

    expect(result.keep).toEqual([{ id: "l1", order: 0 }]);
    expect(result.create).toEqual([]);
    expect(result.removeIds).toEqual([]);
  });

  it("borra lo que ya no aparece en el texto", () => {
    const result = reconcileLines(
      [existing("l1", "Se queda."), existing("l2", "Se va.")],
      [incoming("Se queda.")],
    );

    expect(result.removeIds).toEqual(["l2"]);
    expect(result.create).toEqual([]);
  });

  it("crea todo desde cero cuando no había guion", () => {
    const result = reconcileLines([], [incoming("Primera."), incoming("Segunda.")]);

    expect(result.keep).toEqual([]);
    expect(result.create.map((line) => line.order)).toEqual([0, 1]);
    expect(result.removeIds).toEqual([]);
  });

  it("borra todo cuando el texto nuevo no comparte nada", () => {
    const result = reconcileLines([existing("l1", "Viejo.")], []);

    expect(result.keep).toEqual([]);
    expect(result.create).toEqual([]);
    expect(result.removeIds).toEqual(["l1"]);
  });
});
