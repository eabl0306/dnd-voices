import { rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import * as storage from "@/lib/storage";

const ROOT = path.resolve("./.tmp-test-storage");

/** Claves que escribe este fichero; la limpieza borra sólo éstas. */
const WRITTEN = ["clips/prueba.mp3", "renders/anidado"] as const;

// Los ficheros de test comparten STORAGE_DIR y corren en paralelo: borrar el
// root entero aquí hacía desaparecer, según el orden de planificación, los
// ficheros que api-audio.test.ts acababa de escribir.
afterAll(async () => {
  for (const key of WRITTEN) {
    await rm(path.join(ROOT, key), { recursive: true, force: true });
  }
});

describe("hash", () => {
  it("es determinista", () => {
    expect(storage.hash("a", 1, null)).toBe(storage.hash("a", 1, null));
  });

  it("distingue el reparto de las partes", () => {
    // Sin prefijo de longitud, ambas serían "abc" y compartirían caché.
    expect(storage.hash("ab", "c")).not.toBe(storage.hash("a", "bc"));
  });

  it("distingue null de cadena vacía sólo por posición, no por valor", () => {
    expect(storage.hash(null)).toBe(storage.hash(""));
    expect(storage.hash(null, null)).not.toBe(storage.hash(null));
  });

  it("devuelve una clave de longitud fija apta para un nombre de archivo", () => {
    expect(storage.hash("cualquier cosa")).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("resolución de rutas", () => {
  it.each([
    "../fuera.mp3",
    "clips/../../fuera.mp3",
    "/etc/passwd",
    "clips/../../../etc/passwd",
  ])("rechaza %s", (key) => {
    expect(() => storage.absolute(key)).toThrow(/fuera del root/);
  });

  it("acepta rutas anidadas dentro del root", () => {
    expect(storage.absolute("renders/scene-1/render-1.mp3")).toBe(
      path.join(ROOT, "renders/scene-1/render-1.mp3"),
    );
  });

  it("acepta una ruta que sólo comparte prefijo textual con otra carpeta", () => {
    // `<root>-malicioso` empieza igual que `<root>` pero está fuera de él.
    expect(() => storage.absolute("../.tmp-test-storage-malicioso/x.mp3")).toThrow();
  });
});

describe("write / read / exists", () => {
  it("escribe, detecta y recupera el mismo contenido", async () => {
    const key = "clips/prueba.mp3";
    expect(await storage.exists(key)).toBe(false);

    const payload = Buffer.from("audio falso");
    await storage.write(key, payload);

    expect(await storage.exists(key)).toBe(true);
    expect(await storage.read(key)).toEqual(payload);
  });

  it("crea los directorios intermedios", async () => {
    const key = "renders/anidado/muy/profundo.mp3";
    await storage.write(key, Buffer.from("x"));
    expect(await storage.exists(key)).toBe(true);
  });

  it("no confunde ausencia con error al comprobar existencia", async () => {
    expect(await storage.exists("clips/no-existe.mp3")).toBe(false);
  });
});
