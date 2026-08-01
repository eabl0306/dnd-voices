import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import type { CampaignSummary } from "@/lib/dto";

const CreateCampaign = z.object({
  name: z.string().min(1).max(120),
  setting: z.string().max(20_000).default(""),
  language: z.string().min(2).max(5).default("es"),
});

export function GET() {
  return handler(async (): Promise<CampaignSummary[]> => {
    const user = await requireUser();
    const campaigns = await db.campaign.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, _count: { select: { characters: true, scenes: true } } },
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      characterCount: campaign._count.characters,
      sceneCount: campaign._count.scenes,
    }));
  });
}

export function POST(request: NextRequest) {
  return handler(async () => {
    const user = await requireUser();
    const body = CreateCampaign.parse(await request.json());

    // La campaña nace sin reparto. Crear un narrador por defecto obligaba a
    // encolar su casting desde aquí, y al no hacerlo se quedaba en «asignando
    // voz…» para siempre. El reparto lo da de alta el DM, que además así elige
    // la estrategia de voz en vez de heredar una.
    return db.campaign.create({ data: { ...body, userId: user.id } });
  });
}
