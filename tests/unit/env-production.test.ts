import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `env` cachea cada variable la primera vez que se lee, así que cada caso
 * reimporta el módulo para partir de cero.
 */
async function readAuthUrl(publicDeploy: string, url: string | undefined) {
  vi.resetModules();
  vi.stubEnv("PUBLIC_DEPLOY", publicDeploy);
  if (url === undefined) vi.stubEnv("BETTER_AUTH_URL", "");
  else vi.stubEnv("BETTER_AUTH_URL", url);
  if (url === undefined) delete process.env.BETTER_AUTH_URL;

  const { env } = await import("@/lib/env");
  return env.BETTER_AUTH_URL;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("BETTER_AUTH_URL en un despliegue público", () => {
  it("rechaza localhost con un mensaje que dice qué poner", async () => {
    // Es el fallo silencioso más caro del despliegue: la página carga y sólo
    // revientan el alta y el login, con un 403 por Origin que no coincide.
    for (const url of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://localhost",
    ]) {
      await expect(readAuthUrl("true", url), url).rejects.toThrow(/URL real/);
    }
  });

  it("acepta una URL pública de verdad", async () => {
    await expect(readAuthUrl("true", "https://voces.bahoque.com")).resolves.toBe(
      "https://voces.bahoque.com",
    );
  });

  it("fuera de un despliegue público sigue cayendo a localhost sin estorbar", async () => {
    await expect(readAuthUrl("false", undefined)).resolves.toBe("http://localhost:3000");
    await expect(readAuthUrl("false", "http://localhost:3000")).resolves.toBe(
      "http://localhost:3000",
    );
  });
});
