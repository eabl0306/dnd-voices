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

    return db.campaign.create({
      data: {
        ...body,
        userId: user.id,
        // Toda campaña necesita narrador: crearlo aquí evita que la primera
        // escena falle por no tener a quién atribuir la narración.
        characters: {
          create: {
            name: "Narrador",
            isNarrator: true,
            description: "Voz que describe la escena, el ambiente y la acción.",
            voiceStrategy: "DESIGNED",
          },
        },
      },
    });
  });
}
