import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ownedScene, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import type { SceneDetail } from "@/lib/dto";
import { compact } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const UpdateScene = z.object({
  title: z.string().min(1).max(200).optional(),
  rawText: z.string().max(200_000).optional(),
});

export function GET(_request: NextRequest, { params }: Params) {
  return handler(async (): Promise<SceneDetail> => {
    const user = await requireUser();
    const { id } = await params;
    await ownedScene(id, user.id);

    const scene = await db.scene.findUniqueOrThrow({
      where: { id },
      include: {
        lines: {
          orderBy: { order: "asc" },
          include: { character: { select: { isNarrator: true } } },
        },
        renders: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    return {
      id: scene.id,
      campaignId: scene.campaignId,
      title: scene.title,
      rawText: scene.rawText,
      status: scene.status,
      lines: scene.lines.map((line) => ({
        id: line.id,
        order: line.order,
        text: line.text,
        delivery: line.delivery,
        confidence: line.confidence,
        characterId: line.characterId,
        // La narración se compone en serif itálica y sin selector de personaje.
        isNarration: line.character?.isNarrator ?? false,
      })),
      renders: scene.renders.map((render) => ({
        id: render.id,
        status: render.status,
        progress: render.progress,
        cacheHits: render.cacheHits,
        charsBilled: render.charsBilled,
        durationMs: render.durationMs,
        error: render.error,
      })),
    };
  });
}

export function PATCH(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedScene(id, user.id);
    const body = UpdateScene.parse(await request.json());

    // Cambiar el texto crudo deja obsoletas las líneas ya atribuidas: vuelve a
    // DRAFT para que quede claro que hay que reanalizar antes de renderizar.
    const status = body.rawText !== undefined ? ("DRAFT" as const) : undefined;
    return db.scene.update({ where: { id }, data: compact({ ...body, status }) });
  });
}

export function DELETE(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedScene(id, user.id);
    await db.scene.delete({ where: { id } });
    return { deleted: true };
  });
}
