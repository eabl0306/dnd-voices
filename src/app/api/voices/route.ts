import type { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { toVoiceDto, VOICE_SELECT } from "@/lib/queries/voices";

const CreateVoice = z.object({
  name: z.string().min(1).max(120),
  provider: z.enum(["ELEVENLABS", "OPENAI", "AZURE"]).default("ELEVENLABS"),
  externalId: z.string().min(1).max(200),
  model: z.string().min(1).max(120).default("eleven_multilingual_v2"),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  /** Null = biblioteca de la cuenta. Con valor = sólo esa campaña. */
  campaignId: z.string().min(1).nullable().default(null),
});

export function GET() {
  return handler(async () => {
    const user = await requireUser();
    const voices = await db.voice.findMany({
      where: { userId: user.id },
      orderBy: [{ generated: "asc" }, { createdAt: "desc" }],
      select: VOICE_SELECT,
    });
    return voices.map(toVoiceDto);
  });
}

export function POST(request: NextRequest) {
  return handler(async () => {
    const user = await requireUser();
    const body = CreateVoice.parse(await request.json());

    // Sin esta comprobación, un campaignId ajeno colaría una voz en la
    // biblioteca de otro usuario.
    if (body.campaignId) await ownedCampaign(body.campaignId, user.id);

    const voice = await db.voice.create({
      data: { ...body, userId: user.id },
      select: VOICE_SELECT,
    });
    return toVoiceDto(voice);
  });
}
