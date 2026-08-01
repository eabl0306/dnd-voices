import type { NextRequest } from "next/server";
import { HttpError, handler, accessibleScene, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { renderQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

export function POST(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await accessibleScene(id, user.id);

    const lineCount = await db.line.count({ where: { sceneId: id } });
    if (lineCount === 0) {
      throw new HttpError(400, "Analiza el texto antes de renderizar: la escena no tiene líneas.");
    }

    const running = await db.render.findFirst({
      where: { sceneId: id, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (running) return running;

    const render = await db.render.create({ data: { sceneId: id } });
    await renderQueue.add("render", { renderId: render.id });
    return render;
  });
}
