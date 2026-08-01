import type { NextRequest } from "next/server";
import { HttpError, handler, accessibleLine, requireUser } from "@/lib/api";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export function DELETE(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    const line = await accessibleLine(id, user.id);

    // El worker recorre un snapshot de las líneas tomado al arrancar: borrar
    // una a mitad de render facturaría su TTS para nada y el audio final ya no
    // se correspondería con el guion que queda.
    const rendering = await db.render.count({
      where: { sceneId: line.sceneId, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (rendering > 0) {
      throw new HttpError(409, "Hay un render en marcha: espera a que termine para quitar intervenciones.");
    }

    // El hueco que deja en `order` no importa: sólo se usa para ordenar, y el
    // clip cacheado se queda en disco por si la línea vuelve en un reanálisis.
    await db.line.delete({ where: { id } });
    return { deleted: true };
  });
}
