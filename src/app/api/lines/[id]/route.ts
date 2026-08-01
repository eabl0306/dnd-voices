import type { NextRequest } from "next/server";
import { handler, ownedLine, requireUser } from "@/lib/api";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export function DELETE(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedLine(id, user.id);
    // El hueco que deja en `order` no importa: sólo se usa para ordenar, y el
    // clip cacheado se queda en disco por si la línea vuelve en un reanálisis.
    await db.line.delete({ where: { id } });
    return { deleted: true };
  });
}
