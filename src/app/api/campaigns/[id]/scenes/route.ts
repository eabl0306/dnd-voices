import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import type { SceneSummary } from "@/lib/dto";
import { countPendingReview, excerptOf } from "@/lib/queries/scene-meta";

type Params = { params: Promise<{ id: string }> };

const CreateScene = z.object({
  title: z.string().min(1).max(200),
  rawText: z.string().max(200_000).default(""),
});

export function GET(_request: NextRequest, { params }: Params) {
  return handler(async (): Promise<SceneSummary[]> => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCampaign(id, user.id);

    const scenes = await db.scene.findMany({
      where: { campaignId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        rawText: true,
        lines: { select: { characterId: true, confidence: true } },
        renders: { where: { status: "DONE" }, select: { id: true }, take: 1 },
      },
    });

    return scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      status: scene.status,
      excerpt: excerptOf(scene.rawText),
      lineCount: scene.lines.length,
      pendingReview: countPendingReview(scene.lines),
      hasAudio: scene.renders.length > 0,
    }));
  });
}

export function POST(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCampaign(id, user.id);
    const body = CreateScene.parse(await request.json());
    return db.scene.create({ data: { ...body, campaignId: id } });
  });
}
