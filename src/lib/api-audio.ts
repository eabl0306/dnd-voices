import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { parseRangeHeader } from "@/lib/http-range";
import * as storage from "@/lib/storage";

/**
 * Sirve un fichero de audio del storage con soporte de rangos HTTP.
 *
 * El soporte de `Range` no es opcional: sin el 206 y el `Accept-Ranges`, el
 * navegador desactiva el seek del reproductor y la barra de progreso no deja
 * posicionarse. Además el cuerpo va en streaming — la mezcla de una escena pasa
 * de 50 MB y cargarla entera en memoria por reproducción no escala.
 *
 * Devuelve siempre una Response; el llamante ya ha comprobado sesión y
 * propiedad antes de llegar aquí.
 */
export async function audioFileResponse(
  request: Request,
  key: string,
  options: { filename?: string | undefined; cacheControl: string },
): Promise<Response> {
  let size: number;
  try {
    size = (await stat(storage.absolute(key))).size;
  } catch {
    // La base de datos apunta a un fichero que ya no está (p. ej. tras limpiar
    // el storage): mejor un 404 explicable que un 500 de ENOENT.
    return Response.json(
      { error: "El audio ya no está en el almacenamiento. Vuelve a generarlo." },
      { status: 404 },
    );
  }

  const range = parseRangeHeader(request.headers.get("range"), size);

  if (range === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": options.cacheControl,
    // `private` frena a los proxies, pero la caché del navegador no separa por
    // sesión: sin Vary, otra cuenta en el mismo perfil recibiría el audio
    // cacheado sin pasar por la comprobación de propiedad.
    Vary: "Cookie",
  });
  if (options.filename) {
    headers.set("Content-Disposition", `inline; filename="${options.filename}"`);
  }

  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
  } else {
    headers.set("Content-Length", String(size));
  }

  const stream = createReadStream(storage.absolute(key), range ?? {});
  // Los tipos de Node y los del DOM discrepan en ReadableStream; en runtime es
  // el mismo objeto y Response lo acepta tal cual.
  const body = Readable.toWeb(stream) as unknown as ReadableStream;

  return new Response(body, { status: range ? 206 : 200, headers });
}
