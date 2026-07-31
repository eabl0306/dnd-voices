import type { NextRequest } from "next/server";
import { handler, ownedCharacter, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { voiceQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

/** Reencola el casting de voz: para reintentar tras un fallo o tras editar el trasfondo. */
export function POST(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCharacter(id, user.id);

    await db.character.update({
      where: { id },
      data: { voiceStatus: "PENDING", voiceError: null },
    });
    const job = await voiceQueue.add("provision", { characterId: id });
    return { queued: true, jobId: job.id };
  });
}
