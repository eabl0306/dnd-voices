import { attributeSpeakers } from "@/lib/ai/attribution";
import { db } from "@/lib/db";
import { mapAttributedLines } from "@/lib/render/line-mapper";

export type ParseResult = {
  lineCount: number;
  unknownSpeakers: string[];
};

/**
 * Pasa el texto crudo de una escena por Claude y persiste el resultado como
 * líneas editables. Reemplaza las líneas anteriores: la escena vuelve a partir
 * del texto crudo, que es la única fuente de verdad antes del renderizado.
 */
export async function parseScene(sceneId: string): Promise<ParseResult> {
  const scene = await db.scene.findUniqueOrThrow({
    where: { id: sceneId },
    include: { campaign: { include: { characters: true } } },
  });

  if (!scene.rawText.trim()) {
    throw new Error("La escena no tiene texto que analizar.");
  }

  await db.scene.update({
    where: { id: sceneId },
    data: { status: "PARSING", error: null },
  });

  try {
    const { result } = await attributeSpeakers({
      campaignName: scene.campaign.name,
      setting: scene.campaign.setting,
      roster: scene.campaign.characters,
      rawText: scene.rawText,
    });

    const mapped = mapAttributedLines(result.lines, scene.campaign.characters);

    await db.$transaction([
      db.line.deleteMany({ where: { sceneId } }),
      db.line.createMany({ data: mapped.map((line) => ({ ...line, sceneId })) }),
      db.scene.update({ where: { id: sceneId }, data: { status: "PARSED" } }),
    ]);

    return { lineCount: mapped.length, unknownSpeakers: result.unknownSpeakers };
  } catch (error) {
    await db.scene.update({
      where: { id: sceneId },
      data: { status: "FAILED", error: messageOf(error) },
    });
    throw error;
  }
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
