import { describe, expect, it, vi } from "vitest";
import { lazyProxy } from "@/lib/lazy";

describe("lazyProxy", () => {
  it("no construye nada hasta el primer acceso", () => {
    const factory = vi.fn(() => ({ value: 1 }));
    const proxy = lazyProxy(factory);

    expect(factory).not.toHaveBeenCalled();
    expect(proxy.value).toBe(1);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("construye una sola vez aunque se acceda muchas veces", () => {
    const factory = vi.fn(() => ({ value: 1 }));
    const proxy = lazyProxy(factory);

    void proxy.value;
    void proxy.value;
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("propaga el error de la fábrica en el primer acceso, no al crear", () => {
    // Es lo que hace que `next build` no reviente sin variables de entorno.
    const proxy = lazyProxy<{ value: number }>(() => {
      throw new Error("falta ANTHROPIC_API_KEY");
    });
    expect(() => proxy.value).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("conserva el `this` de los métodos extraídos del proxy", () => {
    // Sin el bind, `const f = db.$transaction; f()` perdería la instancia.
    const proxy = lazyProxy(() => ({
      count: 7,
      read() {
        return this.count;
      },
    }));

    const detached = proxy.read;
    expect(detached()).toBe(7);
  });

  it("expone métodos anidados sin romper su contexto", () => {
    const proxy = lazyProxy(() => ({
      scene: {
        rows: ["a"],
        findMany() {
          return this.rows;
        },
      },
    }));
    expect(proxy.scene.findMany()).toEqual(["a"]);
  });

  it("responde a `in` sobre las claves reales", () => {
    const proxy = lazyProxy(() => ({ value: 1 }));
    expect("value" in proxy).toBe(true);
    expect("otra" in proxy).toBe(false);
  });

  it("enumera las claves de la instancia", () => {
    const proxy = lazyProxy(() => ({ a: 1, b: 2 }));
    expect(Object.keys(proxy).sort()).toEqual(["a", "b"]);
  });

  it("se puede esparcir sin lanzar por invariantes del Proxy", () => {
    // ownKeys sin getOwnPropertyDescriptor configurable lanzaría TypeError.
    const proxy = lazyProxy(() => ({ a: 1, b: 2 }));
    expect({ ...proxy }).toEqual({ a: 1, b: 2 });
  });

  it("devuelve undefined en una propiedad inexistente", () => {
    const proxy = lazyProxy(() => ({ a: 1 }) as Record<string, unknown>);
    expect(proxy.noExiste).toBeUndefined();
  });
});
