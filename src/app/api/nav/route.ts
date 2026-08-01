import type { NextRequest } from "next/server";
import { handler, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import type { NavData } from "@/lib/dto";
import { countPendingReview } from "@/lib/queries/scene-meta";

/**
 * Estado de la barra lateral en una sola llamada.
 *
 * Acepta `campaignId` o `sceneId` porque la shell deriva el contexto de la URL,
 * y desde `/scenes/[id]` no conoce todavía la campaña a la que pertenece.
 */
export function GET(request: NextRequest) {
  return handler(async (): Promise<NavData> => {
    const user = await requireUser();
    const params = request.nextUrl.searchParams;
    const sceneId = params.get("sceneId");

    const campaignId =
      params.get("campaignId") ??
      (sceneId
        ? ((
            await db.scene.findFirst({
              where: { id: sceneId, campaign: { userId: user.id } },
              select: { campaignId: true },
            })
          )?.campaignId ?? null)
        : null);

    const [campaigns, voiceCount] = await Promise.all([
      db.campaign.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          _count: { select: { characters: true, scenes: true } },
        },
      }),
      db.voice.count({ where: { userId: user.id } }),
    ]);

    const base = {
      user: { email: user.email, name: user.name },
      campaigns: campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        characterCount: campaign._count.characters,
        sceneCount: campaign._count.scenes,
      })),
      voiceCount,
    };

    // Sin campaña en la ruta se cae a la última tocada: estar en el listado no
    // es lo mismo que no tener ninguna, y bloquear la navegación en ese caso
    // dejaría al DM sin manera de volver a su campaña.
    const active = campaignId
      ? campaigns.find((campaign) => campaign.id === campaignId)
      : campaigns[0];
    if (!active) return { ...base, active: null };

    // La última escena tocada es la que el DM tiene «abierta ahora».
    const scene = await db.scene.findFirst({
      where: { campaignId: active.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        lines: { select: { characterId: true, confidence: true } },
      },
    });

    return {
      ...base,
      active: {
        id: active.id,
        name: active.name,
        characterCount: active._count.characters,
        sceneCount: active._count.scenes,
        openScene: scene
          ? {
              id: scene.id,
              title: scene.title,
              pendingReview: countPendingReview(scene.lines),
            }
          : null,
      },
    };
  });
}
