import { rm } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { audioFileResponse } from "@/lib/api-audio";
import * as storage from "@/lib/storage";

const KEY = "clips/test-api-audio.mp3";
const BODY = Buffer.from("0123456789abcdef", "utf8"); // 16 bytes, contenido conocido

const request = (range?: string) =>
  new Request("http://test.local/audio", {
    headers: range ? { Range: range } : {},
  });

const CACHE = { cacheControl: "private, max-age=60" };

beforeAll(async () => {
  await storage.write(KEY, BODY);
});

afterAll(async () => {
  await rm(storage.absolute(KEY), { force: true });
});

describe("audioFileResponse", () => {
  it("sin Range responde 200 con el fichero entero y anuncia que acepta rangos", async () => {
    const response = await audioFileResponse(request(), KEY, CACHE);

    expect(response.status).toBe(200);
    // Sin este header el navegador no intenta el seek siquiera.
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(response.headers.get("Content-Length")).toBe(String(BODY.length));
    expect(Buffer.from(await response.arrayBuffer())).toEqual(BODY);
  });

  it("con Range responde 206 con exactamente el tramo pedido", async () => {
    const response = await audioFileResponse(request("bytes=4-9"), KEY, CACHE);

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes 4-9/${BODY.length}`);
    expect(response.headers.get("Content-Length")).toBe("6");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("456789");
  });

  it("un rango abierto sirve desde el punto pedido hasta el final", async () => {
    const response = await audioFileResponse(request("bytes=10-"), KEY, CACHE);

    expect(response.status).toBe(206);
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("abcdef");
  });

  it("un rango imposible responde 416 con el tamaño real", async () => {
    const response = await audioFileResponse(request("bytes=999-"), KEY, CACHE);

    expect(response.status).toBe(416);
    // El tamaño en el 416 es lo que permite al cliente corregir su petición.
    expect(response.headers.get("Content-Range")).toBe(`bytes */${BODY.length}`);
  });

  it("si el fichero desapareció del storage responde 404, no un 500 de ENOENT", async () => {
    const response = await audioFileResponse(request(), "clips/no-existe.mp3", CACHE);

    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("almacenamiento");
  });

  it("propaga el Cache-Control que decide la ruta", async () => {
    const response = await audioFileResponse(request(), KEY, {
      cacheControl: "private, no-store",
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("incluye el nombre de descarga sólo cuando se pide", async () => {
    const named = await audioFileResponse(request(), KEY, {
      filename: "escena.mp3",
      cacheControl: "private, max-age=60",
    });
    expect(named.headers.get("Content-Disposition")).toBe('inline; filename="escena.mp3"');

    const anonymous = await audioFileResponse(request(), KEY, CACHE);
    expect(anonymous.headers.get("Content-Disposition")).toBeNull();
  });
});
