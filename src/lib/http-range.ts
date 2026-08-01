/** Rango de bytes cerrado por ambos extremos, como lo usa createReadStream. */
export type ByteRange = { start: number; end: number };

/**
 * Interpreta un header `Range` para un recurso de `size` bytes.
 *
 * Sin esto el audio se sirve entero con un 200 y el navegador deshabilita el
 * posicionamiento: el elemento `<audio>` sólo permite hacer seek si el servidor
 * responde 206 a peticiones de rango.
 *
 * Devuelve:
 * - `null`: no hay rango utilizable → responder 200 con el cuerpo entero, que
 *   siempre es una respuesta válida (RFC 9110 permite ignorar el header).
 * - `"unsatisfiable"`: el rango cae fuera del recurso → responder 416.
 * - `ByteRange`: rango único satisfacible → responder 206 con ese tramo.
 *
 * Los rangos múltiples (`bytes=0-1,5-9`) se ignoran a propósito: exigirían una
 * respuesta multipart que ningún reproductor de audio pide en la práctica.
 */
export function parseRangeHeader(
  header: string | null,
  size: number,
): ByteRange | "unsatisfiable" | null {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, startRaw = "", endRaw = ""] = match;
  if (startRaw === "" && endRaw === "") return null;

  // Un recurso vacío no tiene ni un byte que servir por rango.
  if (size <= 0) return "unsatisfiable";

  // Forma sufijo (`bytes=-N`): los últimos N bytes.
  if (startRaw === "") {
    const suffix = Number(endRaw);
    if (suffix === 0) return "unsatisfiable";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(startRaw);
  if (start >= size) return "unsatisfiable";

  const end = endRaw === "" ? size - 1 : Math.min(Number(endRaw), size - 1);
  // `start > end` es un header malformado, no un rango imposible: se ignora.
  if (end < start) return null;

  return { start, end };
}
