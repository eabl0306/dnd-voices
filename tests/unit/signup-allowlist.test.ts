import { describe, expect, it } from "vitest";
import { isSignupAllowed, parseAllowlist } from "@/lib/signup-allowlist";

describe("parseAllowlist", () => {
  it("separa por comas, espacios y saltos de línea", () => {
    // Para poder pegar la lista tal cual venga, sin reformatearla.
    const list = parseAllowlist("uno@dnd.test, dos@dnd.test\ntres@dnd.test  cuatro@dnd.test");
    expect([...list].sort()).toEqual([
      "cuatro@dnd.test",
      "dos@dnd.test",
      "tres@dnd.test",
      "uno@dnd.test",
    ]);
  });

  it("normaliza a minúsculas", () => {
    // Ningún proveedor real distingue mayúsculas: rechazar un alta por eso
    // sería incomprensible para quien la intenta.
    expect(parseAllowlist("Master@DnD.Test").has("master@dnd.test")).toBe(true);
  });

  it("descarta entradas que no son correos", () => {
    const list = parseAllowlist("dm@dnd.test, , comentario, 42");
    expect([...list]).toEqual(["dm@dnd.test"]);
  });

  it("de una variable vacía o sin definir saca una lista vacía", () => {
    expect(parseAllowlist("").size).toBe(0);
    expect(parseAllowlist("   \n ").size).toBe(0);
    expect(parseAllowlist(undefined).size).toBe(0);
  });
});

describe("isSignupAllowed", () => {
  const list = parseAllowlist("dm@dnd.test, jugadora@dnd.test");

  it("deja pasar a quien está en la lista", () => {
    expect(isSignupAllowed("dm@dnd.test", list)).toBe(true);
    expect(isSignupAllowed("jugadora@dnd.test", list)).toBe(true);
  });

  it("bloquea a quien no está", () => {
    expect(isSignupAllowed("colado@dnd.test", list)).toBe(false);
  });

  it("ignora mayúsculas y espacios del correo que llega", () => {
    expect(isSignupAllowed("  DM@DnD.test ", list)).toBe(true);
  });

  it("con la lista vacía el alta queda abierta", () => {
    // Es lo que mantiene vivos el desarrollo y los e2e, que crean una cuenta
    // nueva por test. La instancia se cierra añadiendo correos, no quitándolos.
    expect(isSignupAllowed("cualquiera@dnd.test", parseAllowlist(""))).toBe(true);
  });

  it("no deja colar un correo por parecerse a uno autorizado", () => {
    for (const email of [
      "dm@dnd.test.evil.com",
      "otro-dm@dnd.test",
      "dm@dnd.tes",
      "dm+alias@dnd.test",
    ]) {
      expect(isSignupAllowed(email, list), email).toBe(false);
    }
  });
});
