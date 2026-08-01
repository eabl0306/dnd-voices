import type { NextRequest } from "next/server";
import { handler, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import type { AttentionItem, CampaignOverview } from "@/lib/dto";
import { countPendingReview } from "@/lib/queries/scene-meta";

type Params = { params: Promise<{ id: string }> };

/** Métricas y lista de «requiere tu atención» del resumen de campaña. */
export function GET(_request: NextRequest, { params }: Params) {
  return handler(async (): Promise<CampaignOverview> => {
    const user = await requireUser();
    const { id } = await params;
    const campaign = await ownedCampaign(id, user.id);

    const [characters, scenes, renders] = await Promise.all([
      db.character.findMany({
        where: { campaignId: id },
        select: { id: true, name: true, voiceStatus: true },
      }),
      db.scene.findMany({
        where: { campaignId: id },
        select: {
          id: true,
          title: true,
          status: true,
          lines: { select: { characterId: true, confidence: true } },
        },
      }),
      db.render.findMany({
        where: { scene: { campaignId: id }, status: "DONE" },
        orderBy: { createdAt: "desc" },
        select: { charsBilled: true, cacheHits: true, totalLines: true, createdAt: true },
      }),
    ]);

    const perScene = scenes.map((scene) => ({
      ...scene,
      pending: countPendingReview(scene.lines),
    }));

    const pendingReview = perScene.reduce((total, scene) => total + scene.pending, 0);
    const scenesWithPending = perScene.filter((scene) => scene.pending > 0).length;
    const charsBilled = renders.reduce((total, render) => total + render.charsBilled, 0);
    const cacheHits = renders.reduce((total, render) => total + render.cacheHits, 0);
    const renderedLines = renders.reduce((total, render) => total + render.totalLines, 0);
    const failed = characters.filter((character) => character.voiceStatus === "FAILED");
    const pendingVoices = characters.filter(
      (character) => character.voiceStatus === "PENDING",
    ).length;

    const attention: AttentionItem[] = [
      ...perScene
        .filter((scene) => scene.pending > 0)
        .map((scene) => ({
          id: `review-${scene.id}`,
          glyph: "?",
          tone: "warn" as const,
          text: `${scene.pending} ${scene.pending === 1 ? "atribución dudosa" : "atribuciones dudosas"} en "${scene.title}"`,
          href: `/scenes/${scene.id}`,
        })),
      ...failed.map((character) => ({
        id: `voice-${character.id}`,
        glyph: "!",
        tone: "err" as const,
        text: `${character.name}: la voz falló al generarse`,
        href: `/campaigns/${id}/characters`,
      })),
      ...perScene
        .filter((scene) => scene.status === "PARSED" && scene.pending === 0)
        .map((scene) => ({
          id: `render-${scene.id}`,
          glyph: "·",
          tone: "neutral" as const,
          text: `"${scene.title}" sigue sin audio`,
          href: `/scenes/${scene.id}`,
        })),
    ];

    return {
      id: campaign.id,
      name: campaign.name,
      setting: campaign.setting,
      characterCount: characters.length,
      sceneCount: scenes.length,
      failedVoices: failed.length,
      pendingVoices,
      renderedScenes: perScene.filter((scene) => scene.status === "RENDERED").length,
      pendingReview,
      scenesWithPending,
      charsBilled,
      // Proporción de líneas servidas de disco sobre el total renderizado: la
      // métrica que dice si la caché está funcionando de verdad.
      cacheHitRatio: renderedLines === 0 ? 0 : Math.round((cacheHits / renderedLines) * 100),
      lastRenderAt: renders[0]?.createdAt.toISOString() ?? null,
      attention,
    };
  });
}
