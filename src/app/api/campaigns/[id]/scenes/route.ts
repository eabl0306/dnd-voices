import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const CreateScene = z.object({
  title: z.string().min(1).max(200),
  rawText: z.string().max(200_000).default(""),
});

export function GET(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCampaign(id, user.id);
    return db.scene.findMany({
      where: { campaignId: id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { lines: true } } },
    });
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
