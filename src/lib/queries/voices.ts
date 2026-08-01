import { db } from "@/lib/db";
import type { VoiceDto } from "@/lib/dto";

type VoiceRow = {
  id: string;
  name: string;
  provider: "ELEVENLABS" | "OPENAI" | "AZURE";
  externalId: string;
  model: string;
  tags: string[];
  campaignId: string | null;
  generated: boolean;
  _count: { characters: number };
};

export function toVoiceDto(voice: VoiceRow): VoiceDto {
  const { _count, ...rest } = voice;
  return { ...rest, usedBy: _count.characters };
}

export const VOICE_SELECT = {
  id: true,
  name: true,
  provider: true,
  externalId: true,
  model: true,
  tags: true,
  campaignId: true,
  generated: true,
  _count: { select: { characters: true } },
} as const;

/**
 * Voces que un personaje de esta campaña puede usar: las de la cuenta más las
 * generadas dentro de la propia campaña. Las de otras campañas no se ofrecen.
 */
export async function listAssignableVoices(
  userId: string,
  campaignId: string,
): Promise<VoiceDto[]> {
  const voices = await db.voice.findMany({
    where: { userId, OR: [{ campaignId: null }, { campaignId }] },
    orderBy: [{ generated: "asc" }, { createdAt: "desc" }],
    select: VOICE_SELECT,
  });
  return voices.map(toVoiceDto);
}
