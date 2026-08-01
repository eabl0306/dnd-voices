import { buildDesignBrief, type CastArgs, pickFromPool } from "@/lib/ai/casting";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { listAssignableVoices } from "@/lib/queries/voices";
import { messageOf } from "@/lib/render/parse";
import { deleteVoice, designVoicePreviews, saveDesignedVoice } from "@/lib/tts/elevenlabs";
import { DEFAULT_TTS_MODEL } from "@/lib/tts/model";
import type { VoiceSettings } from "@/lib/types";
import { defaultVoiceSettings } from "@/lib/voice-settings";

type Assignment = {
  voiceId: string;
  voiceRefId: string;
  voiceBrief: string;
  voiceSettings: VoiceSettings | null;
};

type Context = CastArgs & { campaignId: string; characterId: string; userId: string };

/**
 * Diseña una voz nueva, la guarda en el proveedor y la registra en la
 * biblioteca de la campaña.
 *
 * Guardar consume un slot del plan de ElevenLabs, que limita cuántas voces
 * propias puedes tener: por eso esta rama se reserva al narrador y a los
 * protagonistas. La fila en `Voice` es lo que luego permite reutilizarla desde
 * la estrategia de pool sin volver a generar nada.
 */
async function designVoice(context: Context): Promise<Assignment> {
  const brief = await buildDesignBrief(context);
  const previews = await designVoicePreviews({
    voiceDescription: brief.voiceDescription,
    previewText: brief.previewText,
  });

  const first = previews[0];
  if (!first) throw new Error("Voice Design no devolvió ninguna preview.");

  const externalId = await saveDesignedVoice({
    name: `${context.campaign.campaignName} — ${context.character.name}`,
    description: brief.voiceDescription,
    generatedVoiceId: first.generatedVoiceId,
    labels: { campaign: context.campaignId, character: context.characterId },
  });

  const voice = await db.voice.create({
    data: {
      userId: context.userId,
      name: context.character.name,
      provider: "ELEVENLABS",
      externalId,
      model: DEFAULT_TTS_MODEL,
      campaignId: context.campaignId,
      generated: true,
    },
  });

  return {
    voiceId: externalId,
    voiceRefId: voice.id,
    voiceBrief: brief.voiceDescription,
    voiceSettings: brief.settings,
  };
}

/** Elige una voz ya registrada y la ajusta al personaje. No gasta slots. */
async function castFromPool(context: Context): Promise<Assignment> {
  const pool = await listAssignableVoices(context.userId, context.campaignId);
  if (pool.length === 0) {
    throw new Error(
      "No hay voces disponibles todavía. Genera una voz propia o añade una a la biblioteca.",
    );
  }

  // Quién usa ya cada voz en esta campaña. Sin esto, cada personaje se castea
  // por su cuenta y varios acaban con la misma voz, que en una escena donde
  // ambos hablan los vuelve indistinguibles.
  const assigned = await db.character.findMany({
    where: { campaignId: context.campaignId, voiceRefId: { not: null }, id: { not: context.characterId } },
    select: { name: true, voiceRefId: true },
  });
  const takenBy = new Map<string, string[]>();
  for (const character of assigned) {
    if (!character.voiceRefId) continue;
    takenBy.set(character.voiceRefId, [
      ...(takenBy.get(character.voiceRefId) ?? []),
      character.name,
    ]);
  }

  const pick = await pickFromPool({
    ...context,
    pool: pool.map((voice) => ({
      voiceId: voice.id,
      name: voice.name,
      description: voice.generated ? "generada por la IA en esta campaña" : "",
      labels: Object.fromEntries(voice.tags.map((tag, index) => [`tag${index}`, tag])),
      takenBy: takenBy.get(voice.id) ?? [],
    })),
  });

  const chosen = pool.find((voice) => voice.id === pick.voiceId);
  if (!chosen) throw new Error(`La voz elegida ya no existe: ${pick.voiceId}`);

  return {
    voiceId: chosen.externalId,
    voiceRefId: chosen.id,
    voiceBrief: pick.rationale,
    voiceSettings: pick.settings,
  };
}

/** El DM ya eligió la voz: sólo hay que fijarla, sin llamar a ningún modelo. */
async function assignChosenVoice(
  voiceRefId: string | null,
  userId: string,
  isNarrator: boolean,
): Promise<Assignment> {
  if (!voiceRefId) {
    throw new Error("No se ha elegido ninguna voz de la biblioteca para este personaje.");
  }
  const voice = await db.voice.findFirst({ where: { id: voiceRefId, userId } });
  if (!voice) throw new Error("La voz elegida ya no está en tu biblioteca.");

  return {
    voiceId: voice.externalId,
    voiceRefId: voice.id,
    voiceBrief: `Elegida a mano: ${voice.name}.`,
    // Sin ajustes, el proveedor usa los suyos y el personaje suena distinto en
    // cada intervención. Se parte de unos valores razonables y editables.
    voiceSettings: defaultVoiceSettings(isNarrator),
  };
}

/**
 * Retira la voz generada que acaba de quedarse sin dueño.
 *
 * Rediseñar crea una voz nueva; la anterior seguiría ocupando un slot del plan,
 * que está limitado. Sólo se borran las generadas: una voz de la biblioteca la
 * dio de alta el usuario y puede querer reutilizarla.
 */
async function discardOrphanVoice(
  previousId: string | null,
  currentId: string,
): Promise<void> {
  if (!previousId || previousId === currentId) return;

  const previous = await db.voice.findUnique({
    where: { id: previousId },
    include: { _count: { select: { characters: true } } },
  });
  if (!previous?.generated || previous._count.characters > 0) return;

  try {
    await deleteVoice(previous.externalId);
    await db.voice.delete({ where: { id: previous.id } });
  } catch (error) {
    // Que no se pueda limpiar no invalida el casting que sí funcionó.
    console.warn(`No se pudo retirar la voz huérfana ${previous.name}:`, messageOf(error));
  }
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

  const context: Context = {
    character,
    campaign: {
      campaignName: character.campaign.name,
      setting: character.campaign.setting,
      language: character.campaign.language,
    },
    campaignId: character.campaignId,
    characterId,
    userId: character.campaign.userId,
  };

  try {
    const assignment =
      character.voiceStrategy === "DESIGNED"
        ? await designVoice(context)
        : character.voiceStrategy === "LIBRARY"
          ? await assignChosenVoice(character.voiceRefId, context.userId, character.isNarrator)
          : await castFromPool(context);

    await db.character.update({
      where: { id: characterId },
      data: {
        voiceId: assignment.voiceId,
        voiceRefId: assignment.voiceRefId,
        voiceBrief: assignment.voiceBrief,
        // `undefined` borraría el Json en vez de dejarlo a null.
        voiceSettings: assignment.voiceSettings ?? Prisma.DbNull,
        voiceStatus: "READY",
      },
    });

    await discardOrphanVoice(character.voiceRefId, assignment.voiceRefId);
  } catch (error) {
    await db.character.update({
      where: { id: characterId },
      data: { voiceStatus: "FAILED", voiceError: messageOf(error) },
    });
    throw error;
  }
}
