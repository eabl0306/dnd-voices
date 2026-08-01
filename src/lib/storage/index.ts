import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

const ROOT = path.resolve(env.STORAGE_DIR);

/**
 * Todas las rutas guardadas en la base de datos son relativas a STORAGE_DIR.
 * Migrar a S3/R2 después es reimplementar estas cuatro funciones.
 */
function resolveKey(key: string) {
  const full = path.resolve(ROOT, key);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    throw new Error(`Ruta de storage fuera del root: ${key}`);
  }
  return full;
}

export async function write(key: string, data: Buffer): Promise<string> {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function read(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

/** Borra si existe. No falla si ya no está: el objetivo es que no esté. */
export async function remove(key: string): Promise<void> {
  await rm(resolveKey(key), { force: true });
}

export async function exists(key: string): Promise<boolean> {
  try {
    await stat(resolveKey(key));
    return true;
  } catch {
    return false;
  }
}

/** Ruta absoluta, para pasarle a ffmpeg. */
export function absolute(key: string): string {
  return resolveKey(key);
}

/**
 * Hash de varias partes, con prefijo de longitud en cada una.
 *
 * Sin el prefijo, concatenar sería ambiguo: `("ab", "c")` y `("a", "bc")`
 * darían la misma clave, y dos audios distintos compartirían caché.
 */
export function hash(...parts: (string | number | undefined | null)[]): string {
  const digest = createHash("sha256");
  for (const part of parts) {
    const value = String(part ?? "");
    digest.update(`${value.length}:${value}`, "utf8");
  }
  return digest.digest("hex").slice(0, 32);
}
