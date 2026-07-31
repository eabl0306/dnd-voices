import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { voiceQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

const CreateCharacter = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(10_000).default(""),
  backstory: z.string().max(50_000).default(""),
  aliases: z.array(z.string().min(1).max(80)).max(20).default([]),
  isNarrator: z.boolean().default(false),
  voiceStrategy: z.enum(["DESIGNED", "POOL"]).default("POOL"),
  /** Encola el casting de voz al crear. Útil para no hacer dos llamadas. */
  provisionVoice: z.boolean().default(true),
});

export function GET(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCampaign(id, user.id);
    return db.character.findMany({
      where: { campaignId: id },
      orderBy: [{ isNarrator: "desc" }, { name: "asc" }],
    });
  });
}

export function POST(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCampaign(id, user.id);

    const { provisionVoice, ...data } = CreateCharacter.parse(await request.json());
    const character = await db.character.create({ data: { ...data, campaignId: id } });

    if (provisionVoice) {
      await voiceQueue.add("provision", { characterId: character.id });
    }
    return character;
  });
}
