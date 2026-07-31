import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `env` cachea por módulo, así que cada caso necesita una instancia limpia:
 * se invalida el registro y se recarga por import dinámico.
 */
async function freshEnv() {
  vi.resetModules();
  const loaded = await import("@/lib/env");
  return loaded.env;
}

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("env", () => {
  it("lee una variable presente", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const env = await freshEnv();
    expect(env.ANTHROPIC_API_KEY).toBe("sk-test");
  });

  it("aplica el valor por defecto cuando la variable no está", async () => {
    process.env.REDIS_URL = undefined;
    delete process.env.REDIS_URL;
    const env = await freshEnv();
    expect(env.REDIS_URL).toBe("redis://localhost:6379");
  });

  it("nombra la variable que falta en el mensaje de error", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const env = await freshEnv();
    expect(() => env.ANTHROPIC_API_KEY).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("no falla al importar, sólo al leer la clave que falta", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ELEVENLABS_API_KEY = "el-test";
    // Esto es lo que permite que `next build` funcione sin claves.
    const env = await freshEnv();
    expect(env.ELEVENLABS_API_KEY).toBe("el-test");
  });

  it("rechaza una URL de auth malformada", async () => {
    process.env.BETTER_AUTH_URL = "no-es-una-url";
    const env = await freshEnv();
    expect(() => env.BETTER_AUTH_URL).toThrow(/BETTER_AUTH_URL/);
  });

  it("rechaza una variable desconocida", async () => {
    const env = await freshEnv();
    expect(() => (env as unknown as Record<string, unknown>).INVENTADA).toThrow(/desconocida/);
  });

  it("no se hace pasar por promesa al devolverlo desde una función async", async () => {
    // Sin el guardia de `.then`, este mismo `await` lanzaría.
    const env = await freshEnv();
    expect((env as unknown as Record<string, unknown>).then).toBeUndefined();
  });

  it("tolera la inspección con símbolos internos", async () => {
    const env = await freshEnv();
    expect(() => String(Object.prototype.toString.call(env))).not.toThrow();
  });
});
