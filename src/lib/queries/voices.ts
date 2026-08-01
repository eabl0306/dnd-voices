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
 * Filtro de las voces que un personaje de esta campaña puede usar.
 *
 * Las atadas a la campaña son de la mesa y las ve cualquier miembro, venga de
 * quien venga: si no, un invitado no podría repartir voces en la campaña a la
 * que le han llamado. La biblioteca personal —las que no están atadas a
 * ninguna campaña— sigue siendo de cada uno.
 */
export function assignableVoiceFilter(userId: string, campaignId: string) {
  return { OR: [{ campaignId }, { userId, campaignId: null }] };
}

/**
 * Lo mismo, pero sin saber quién eligió la voz.
 *
 * El worker sólo tiene el personaje: resuelve una voz que ya se validó al
 * asignarla. Acepta las de la campaña y la biblioteca personal de cualquier
 * miembro de la mesa —que es exactamente lo que las rutas dejan elegir— en vez
 * de resolver por id a secas, que aceptaría la de un desconocido si alguna ruta
 * futura olvidara comprobarlo.
 */
export function campaignVoiceFilter(campaignId: string) {
  return {
    OR: [
      { campaignId },
      { campaignId: null, user: { memberships: { some: { campaignId } } } },
    ],
  };
}

export async function listAssignableVoices(
  userId: string,
  campaignId: string,
): Promise<VoiceDto[]> {
  const voices = await db.voice.findMany({
    where: assignableVoiceFilter(userId, campaignId),
    orderBy: [{ generated: "asc" }, { createdAt: "desc" }],
    select: VOICE_SELECT,
  });
  return voices.map(toVoiceDto);
}
