import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, HttpError, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { toVoiceDto, VOICE_SELECT } from "@/lib/queries/voices";
import { compact } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const UpdateVoice = z.object({
  name: z.string().min(1).max(120).optional(),
  provider: z.enum(["ELEVENLABS", "OPENAI", "AZURE"]).optional(),
  externalId: z.string().min(1).max(200).optional(),
  model: z.string().min(1).max(120).optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).optional(),
  campaignId: z.string().min(1).nullable().optional(),
});

async function ownedVoice(voiceId: string, userId: string) {
  const voice = await db.voice.findFirst({ where: { id: voiceId, userId } });
  if (!voice) throw new HttpError(404, "Voz no encontrada.");
  return voice;
}

export function PATCH(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedVoice(id, user.id);

    const body = UpdateVoice.parse(await request.json());
    if (body.campaignId) await ownedCampaign(body.campaignId, user.id);

    const voice = await db.voice.update({
      where: { id },
      data: compact(body),
      select: VOICE_SELECT,
    });
    return toVoiceDto(voice);
  });
}

export function DELETE(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedVoice(id, user.id);

    // Los personajes que la usaban quedan con voiceRefId a null por la
    // relación, pero su voiceId seguiría apuntando a una voz ya no listada:
    // se marcan como pendientes para que la interfaz pida recastear.
    await db.character.updateMany({
      where: { voiceRefId: id },
      data: { voiceStatus: "PENDING", voiceId: null },
    });
    await db.voice.delete({ where: { id } });
    return { deleted: true };
  });
}
