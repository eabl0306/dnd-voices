import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, HttpError, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { CHARACTER_SELECT, listCharacters, toCharacterDto } from "@/lib/queries/characters";
import { voiceQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

const CreateCharacter = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(10_000).default(""),
  backstory: z.string().max(50_000).default(""),
  aliases: z.array(z.string().min(1).max(80)).max(20).default([]),
  isNarrator: z.boolean().default(false),
  voiceStrategy: z.enum(["DESIGNED", "POOL", "LIBRARY"]).default("POOL"),
  /** Obligatorio con estrategia LIBRARY: es la voz que el DM eligió. */
  voiceRefId: z.string().min(1).nullable().default(null),
  provisionVoice: z.boolean().default(true),
});

export function GET(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCampaign(id, user.id);
    return listCharacters(id);
  });
}

export function POST(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCampaign(id, user.id);

    const { provisionVoice, ...data } = CreateCharacter.parse(await request.json());

    if (data.voiceStrategy === "LIBRARY" && !data.voiceRefId) {
      throw new HttpError(400, "Elige una voz de la biblioteca para este personaje.");
    }
    if (data.voiceRefId) {
      const voice = await db.voice.count({ where: { id: data.voiceRefId, userId: user.id } });
      if (voice === 0) throw new HttpError(400, "Esa voz no está en tu biblioteca.");
    }

    const character = await db.character.create({
      data: { ...data, campaignId: id },
      select: CHARACTER_SELECT,
    });

    if (provisionVoice) {
      await voiceQueue.add("provision", { characterId: character.id });
    }
    return toCharacterDto(character);
  });
}
