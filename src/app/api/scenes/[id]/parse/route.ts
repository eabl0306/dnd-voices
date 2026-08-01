import type { NextRequest } from "next/server";
import { handler, accessibleScene, requireUser } from "@/lib/api";
import { parseScene } from "@/lib/render/parse";

type Params = { params: Promise<{ id: string }> };

/**
 * La atribución es una sola llamada a Claude (segundos, no minutos), así que
 * va en línea. El renderizado, que son decenas de llamadas a ElevenLabs, va a
 * la cola.
 */
export function POST(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await accessibleScene(id, user.id);
    return parseScene(id);
  });
}

export const maxDuration = 300;
