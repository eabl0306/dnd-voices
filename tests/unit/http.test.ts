import { afterEach, describe, expect, it, vi } from "vitest";
import { api, messageOf } from "@/lib/http";

function mockFetch(status: number, body: unknown) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
  vi.stubGlobal("fetch", vi.fn(async () => response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("devuelve el cuerpo en una respuesta correcta", async () => {
    mockFetch(200, { id: "c1" });
    await expect(api("/api/campaigns")).resolves.toEqual({ id: "c1" });
  });

  it("lanza con el mensaje que envía la API", async () => {
    mockFetch(404, { error: "Campaña no encontrada." });
    await expect(api("/api/campaigns/x")).rejects.toThrow("Campaña no encontrada.");
  });

  it("cae a un mensaje genérico si el error no trae texto", async () => {
    mockFetch(500, { error: 42 });
    await expect(api("/api/x")).rejects.toThrow("Error 500");
  });

  it("no revienta si el cuerpo no es JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError("no es JSON");
        },
      }) as unknown as Response),
    );
    await expect(api("/api/x")).rejects.toThrow("Error 502");
  });

  it("manda Content-Type JSON sin pisar cabeceras propias", async () => {
    mockFetch(200, {});
    await api("/api/x", { headers: { "X-Custom": "1" } });

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Custom": "1",
    });
  });
});

describe("messageOf", () => {
  it("extrae el mensaje de un Error", () => {
    expect(messageOf(new Error("vaya"))).toBe("vaya");
  });

  it("cae a un texto genérico con valores que no son Error", () => {
    expect(messageOf("string suelto")).toBe("Error inesperado");
    expect(messageOf(undefined)).toBe("Error inesperado");
  });
});
