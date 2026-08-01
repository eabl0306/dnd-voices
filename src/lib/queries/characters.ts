import { db } from "@/lib/db";
import type { CharacterDto } from "@/lib/dto";

export const CHARACTER_SELECT = {
  id: true,
  name: true,
  description: true,
  backstory: true,
  isNarrator: true,
  voiceStrategy: true,
  voiceStatus: true,
  voiceId: true,
  voiceRefId: true,
  voiceBrief: true,
  voiceError: true,
  voiceRef: { select: { name: true } },
  _count: { select: { lines: true } },
} as const;

type CharacterRow = {
  id: string;
  name: string;
  description: string;
  backstory: string;
  isNarrator: boolean;
  voiceStrategy: "DESIGNED" | "POOL" | "LIBRARY";
  voiceStatus: "PENDING" | "READY" | "FAILED";
  voiceId: string | null;
  voiceRefId: string | null;
  voiceBrief: string | null;
  voiceError: string | null;
  voiceRef: { name: string } | null;
  _count: { lines: number };
};

export function toCharacterDto(character: CharacterRow): CharacterDto {
  const { voiceRef, _count, ...rest } = character;
  return { ...rest, voiceName: voiceRef?.name ?? null, lineCount: _count.lines };
}

export async function listCharacters(campaignId: string): Promise<CharacterDto[]> {
  const characters = await db.character.findMany({
    where: { campaignId },
    // El narrador primero: es el que lee toda la prosa y el que más se consulta.
    orderBy: [{ isNarrator: "desc" }, { name: "asc" }],
    select: CHARACTER_SELECT,
  });
  return characters.map(toCharacterDto);
}
