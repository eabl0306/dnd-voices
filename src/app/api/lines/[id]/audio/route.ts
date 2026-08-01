import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HttpError, ownedLine, requireUser } from "@/lib/api";
import { audioFileResponse } from "@/lib/api-audio";

type Params = { params: Promise<{ id: string }> };

/** Sirve el clip de una sola intervención, para escucharla suelta en el guion. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const line = await ownedLine(id, user.id);

    if (!line.audioPath) {
      throw new HttpError(
        409,
        "Esta intervención todavía no tiene audio: genera la escena primero.",
      );
    }

    // A diferencia del render, esta URL cambia de contenido: si se reasigna la
    // voz y se regenera, el mismo id sirve otro clip. Sin caché.
    return await audioFileResponse(request, line.audioPath, {
      cacheControl: "private, no-store",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "No se pudo servir el audio." }, { status: 500 });
  }
}
