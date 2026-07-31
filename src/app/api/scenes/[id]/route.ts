import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ownedScene, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { compact } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const UpdateScene = z.object({
  title: z.string().min(1).max(200).optional(),
  rawText: z.string().max(200_000).optional(),
});

export function GET(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedScene(id, user.id);
    return db.scene.findUniqueOrThrow({
      where: { id },
      include: {
        lines: { orderBy: { order: "asc" }, include: { character: true } },
        renders: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
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
