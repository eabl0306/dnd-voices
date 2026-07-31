import { describe, expect, it } from "vitest";
import { compact, optional } from "@/lib/types";

describe("compact", () => {
  it("elimina las claves con valor undefined", () => {
    // Con exactOptionalPropertyTypes, «no actualizar» y «poner a undefined»
    // no son lo mismo para Prisma.
    expect(compact({ a: 1, b: undefined, c: "x" })).toEqual({ a: 1, c: "x" });
  });

  it("conserva null, que sí es un valor con significado", () => {
    expect(compact({ characterId: null })).toEqual({ characterId: null });
  });

  it("conserva valores falsy que no son undefined", () => {
    expect(compact({ a: 0, b: "", c: false })).toEqual({ a: 0, b: "", c: false });
  });

  it("devuelve un objeto vacío si todo es undefined", () => {
    expect(compact({ a: undefined, b: undefined })).toEqual({});
  });

  it("no muta la entrada", () => {
    const input = { a: 1, b: undefined };
    compact(input);
    expect("b" in input).toBe(true);
  });
});

describe("optional", () => {
  it("omite la clave si el valor es undefined", () => {
    expect(optional("labels", undefined)).toEqual({});
  });

  it("crea la clave si el valor está presente", () => {
    expect(optional("labels", { a: "b" })).toEqual({ labels: { a: "b" } });
  });

  it("crea la clave para valores falsy definidos", () => {
    expect(optional("speed", 0)).toEqual({ speed: 0 });
  });

  it("se puede esparcir sin dejar claves sueltas", () => {
    const result = { text: "x", ...optional("languageCode", undefined) };
    expect(Object.keys(result)).toEqual(["text"]);
  });
});
