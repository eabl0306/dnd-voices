import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, HttpError, ownedCharacter, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { CHARACTER_SELECT, toCharacterDto } from "@/lib/queries/characters";
import { voiceQueue } from "@/lib/queue";
import { compact } from "@/lib/types";
import { clampVoiceSettings } from "@/lib/voice-settings";
import { VoiceSettingsSchema } from "@/lib/ai/schemas";

type Params = { params: Promise<{ id: string }> };

const UpdateCharacter = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(10_000).optional(),
  backstory: z.string().max(50_000).optional(),
  aliases: z.array(z.string().min(1).max(80)).max(20).optional(),
  isNarrator: z.boolean().optional(),
  voiceStrategy: z.enum(["DESIGNED", "POOL", "LIBRARY"]).optional(),
  voiceRefId: z.string().min(1).nullable().optional(),
  /** Ajuste fino del personaje, sin volver a castear. */
  voiceSettings: VoiceSettingsSchema.optional(),
  /** Reencola el casting. La UI lo activa al cambiar de estrategia. */
  provisionVoice: z.boolean().default(false),
});

export function PATCH(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    const current = await ownedCharacter(id, user.id);

    const { provisionVoice, ...data } = UpdateCharacter.parse(await request.json());
    const strategy = data.voiceStrategy ?? current.voiceStrategy;
    const voiceRefId = data.voiceRefId === undefined ? current.voiceRefId : data.voiceRefId;

    if (strategy === "LIBRARY" && !voiceRefId) {
      throw new HttpError(400, "Elige una voz de la biblioteca para este personaje.");
    }
    if (data.voiceRefId) {
      const owned = await db.voice.count({ where: { id: data.voiceRefId, userId: user.id } });
      if (owned === 0) throw new HttpError(400, "Esa voz no está en tu biblioteca.");
    }

    // Recastear sobrescribe los ajustes con los que elija la IA, así que un
    // cambio de estrategia y un ajuste fino no pueden ir en la misma petición.
    const settings =
      data.voiceSettings && !provisionVoice
        ? { voiceSettings: clampVoiceSettings(data.voiceSettings) }
        : {};

    const character = await db.character.update({
      where: { id },
      data: compact({
        ...data,
        ...settings,
        // Reencolar deja la tarjeta en «asignando»: el estado tiene que
        // reflejarlo desde ya, o parecería que no ha pasado nada.
        ...(provisionVoice ? { voiceStatus: "PENDING" as const, voiceError: null } : {}),
      }),
      select: CHARACTER_SELECT,
    });

    if (provisionVoice) await voiceQueue.add("provision", { characterId: id });
    return toCharacterDto(character);
  });
}

export function DELETE(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCharacter(id, user.id);
    // Las líneas que tenía atribuidas quedan sin personaje y la interfaz las
    // marca para revisión, en vez de desaparecer con él.
    await db.character.delete({ where: { id } });
    return { deleted: true };
  });
}
