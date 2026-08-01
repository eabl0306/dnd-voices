import type { NextRequest } from "next/server";
import { handler, accessibleCampaign, requireUser } from "@/lib/api";
import { listAssignableVoices } from "@/lib/queries/voices";

type Params = { params: Promise<{ id: string }> };

/** Voces que se pueden asignar a un personaje de esta campaña. */
export function GET(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await accessibleCampaign(id, user.id);
    return listAssignableVoices(user.id, id);
  });
}
