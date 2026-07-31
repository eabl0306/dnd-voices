import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HttpError, ownedRender, requireUser } from "@/lib/api";
import * as storage from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/**
 * El audio se sirve por aquí y no como archivo estático: así la comprobación
 * de propiedad sigue aplicando y las rutas de storage no quedan expuestas.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const render = await ownedRender(id, user.id);

    if (!render.audioPath) {
      throw new HttpError(409, "Este render todavía no ha producido audio.");
    }

    const audio = await storage.read(render.audioPath);
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.byteLength),
        "Content-Disposition": `inline; filename="${id}.mp3"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "No se pudo servir el audio." }, { status: 500 });
  }
}
