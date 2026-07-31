import { buildDesignBrief, type CastArgs, pickFromPool } from "@/lib/ai/casting";
import { db } from "@/lib/db";
import { messageOf } from "@/lib/render/parse";
import { designVoicePreviews, listPool, saveDesignedVoice } from "@/lib/tts/elevenlabs";
import type { VoiceSettings } from "@/lib/types";

type VoiceAssignment = {
  voiceId: string;
  voiceBrief: string;
  voiceSettings: VoiceSettings;
};

/**
 * Diseña una voz nueva y la guarda en la cuenta.
 *
 * OJO: guardar consume un slot del plan de ElevenLabs, que limita cuántas
 * voces propias puedes tener. Por eso esta rama se reserva para el narrador y
 * los protagonistas.
 */
async function designVoice(
  args: CastArgs & { campaignId: string; characterId: string },
): Promise<VoiceAssignment> {
  const brief = await buildDesignBrief(args);
  const previews = await designVoicePreviews({
    voiceDescription: brief.voiceDescription,
    previewText: brief.previewText,
  });

  const first = previews[0];
  if (!first) throw new Error("Voice Design no devolvió ninguna preview.");

  const voiceId = await saveDesignedVoice({
    name: `${args.campaign.campaignName} — ${args.character.name}`,
    description: brief.voiceDescription,
    generatedVoiceId: first.generatedVoiceId,
    labels: { campaign: args.campaignId, character: args.characterId },
  });

  return { voiceId, voiceBrief: brief.voiceDescription, voiceSettings: brief.settings };
}

/** Elige una voz existente del catálogo y la ajusta. No gasta slots. */
async function castFromPool(args: CastArgs): Promise<VoiceAssignment> {
  const pick = await pickFromPool({ ...args, pool: await listPool() });
  return {
    voiceId: pick.voiceId,
    voiceBrief: pick.rationale,
    voiceSettings: pick.settings,
  };
}

/** Asigna voz a un personaje según su estrategia. */
export async function provisionVoice(characterId: string): Promise<void> {
  const character = await db.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { campaign: true },
  });

  await db.character.update({
    where: { id: characterId },
    data: { voiceStatus: "PENDING", voiceError: null },
  });

  const args: CastArgs = {
    character,
    campaign: {
      campaignName: character.campaign.name,
      setting: character.campaign.setting,
      language: character.campaign.language,
    },
  };

  try {
    const assignment =
      character.voiceStrategy === "DESIGNED"
        ? await designVoice({ ...args, campaignId: character.campaignId, characterId })
        : await castFromPool(args);

    await db.character.update({
      where: { id: characterId },
      data: { ...assignment, voiceStatus: "READY" },
    });
  } catch (error) {
    await db.character.update({
      where: { id: characterId },
      data: { voiceStatus: "FAILED", voiceError: messageOf(error) },
    });
    throw error;
  }
}
