import type { NextRequest } from "next/server";
import { z } from "zod";
import { accessibleCampaign, handler, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { compact } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const UpdateCampaign = z.object({
  name: z.string().min(1).max(120).optional(),
  setting: z.string().max(20_000).optional(),
  language: z.string().min(2).max(5).optional(),
});

export function GET(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    return accessibleCampaign(id, user.id);
  });
}

export function PATCH(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await accessibleCampaign(id, user.id);
    const body = UpdateCampaign.parse(await request.json());
    return db.campaign.update({ where: { id }, data: compact(body) });
  });
}

export function DELETE(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    // Se lleva por delante personajes, escenas y audio de toda la mesa: sólo
    // el dueño. Un miembro que quiera salirse se quita a sí mismo de la mesa.
    await ownedCampaign(id, user.id);
    await db.campaign.delete({ where: { id } });
    return { deleted: true };
  });
}
