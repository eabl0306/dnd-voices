import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, requireUser } from "@/lib/api";
import { db } from "@/lib/db";

const CreateCampaign = z.object({
  name: z.string().min(1).max(120),
  setting: z.string().max(20_000).default(""),
  language: z.string().min(2).max(5).default("es"),
});

export function GET() {
  return handler(async () => {
    const user = await requireUser();
    return db.campaign.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { characters: true, scenes: true } } },
    });
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
        // escena falle por no tener a quién atribuir la descripción.
        characters: {
          create: {
            name: "Narrador",
            isNarrator: true,
            description: "Voz que describe la escena, el ambiente y la acción.",
            voiceStrategy: "DESIGNED",
          },
        },
      },
      include: { characters: true },
    });
  });
}
