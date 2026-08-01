import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, handler, ownedScene, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { compact } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const PatchLines = z.object({
  lines: z
    .array(
      z.object({
        id: z.string().min(1),
        characterId: z.string().min(1).nullable().optional(),
        text: z.string().max(20_000).optional(),
        delivery: z.string().max(500).nullable().optional(),
        pauseAfter: z.number().int().min(0).max(10_000).optional(),
        /// Decaimiento manual del final del clip. Más de 2 s ya no es un
        /// fundido, es amputar la intervención.
        fadeOutMs: z.number().int().min(0).max(2_000).optional(),
        /// Al corregir a mano la atribución deja de ser una conjetura.
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .min(1)
    .max(2000),
});

/**
 * Corrección manual de la atribución. Al cambiar texto o personaje, la clave
 * de caché de esa línea deja de coincidir y sólo ese clip se regenera en el
 * siguiente render; el resto de la escena se sirve de caché.
 */
export function PATCH(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    const scene = await ownedScene(id, user.id);
    const { lines } = PatchLines.parse(await request.json());

    const owned = await db.line.findMany({
      where: { id: { in: lines.map((l) => l.id) }, sceneId: id },
      select: { id: true },
    });
    if (owned.length !== lines.length) {
      throw new HttpError(400, "Alguna línea no pertenece a esta escena.");
    }

    const characterIds = lines
      .map((l) => l.characterId)
      .filter((v): v is string => typeof v === "string");
    if (characterIds.length > 0) {
      const valid = await db.character.count({
        where: { id: { in: characterIds }, campaignId: scene.campaignId },
      });
      if (valid !== new Set(characterIds).size) {
        throw new HttpError(400, "Alguna voz asignada no pertenece a esta campaña.");
      }
    }

    await db.$transaction(
      lines.map(({ id: lineId, ...data }) =>
        db.line.update({ where: { id: lineId }, data: compact(data) }),
      ),
    );

    return db.line.findMany({
      where: { sceneId: id },
      orderBy: { order: "asc" },
      include: { character: true },
    });
  });
}
