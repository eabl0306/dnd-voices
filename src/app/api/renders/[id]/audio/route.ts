import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HttpError, accessibleRender, requireUser } from "@/lib/api";
import { audioFileResponse } from "@/lib/api-audio";

type Params = { params: Promise<{ id: string }> };

/**
 * El audio se sirve por aquí y no como archivo estático: así la comprobación
 * de propiedad sigue aplicando y las rutas de storage no quedan expuestas.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const render = await accessibleRender(id, user.id);

    if (!render.audioPath) {
      throw new HttpError(409, "Este render todavía no ha producido audio.");
    }

    // Un render terminado no cambia nunca: su URL puede cachearse sin miedo.
    return await audioFileResponse(request, render.audioPath, {
      filename: `${id}.mp3`,
      cacheControl: "private, max-age=3600",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "No se pudo servir el audio." }, { status: 500 });
  }
}
