import type { NextRequest } from "next/server";
import { accessibleCampaign, handler, HttpError, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { listMembers } from "@/lib/queries/members";

type Params = { params: Promise<{ id: string; userId: string }> };

/**
 * Saca a alguien de la mesa.
 *
 * Lo puede hacer el dueño con cualquiera, y cualquier miembro consigo mismo:
 * quien ya no juega tiene que poder irse sin depender de que el dueño aparezca.
 */
export function DELETE(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id, userId } = await params;
    const campaign = await accessibleCampaign(id, user.id);

    const leaving = userId === user.id;
    if (!leaving && campaign.userId !== user.id) {
      throw new HttpError(403, "Sólo el dueño de la campaña puede sacar a alguien de la mesa.");
    }
    if (userId === campaign.userId) {
      throw new HttpError(
        400,
        "El dueño no puede salirse de su propia campaña: bórrala o traspásala.",
      );
    }

    const { count } = await db.campaignMember.deleteMany({
      where: { campaignId: id, userId },
    });
    if (count === 0) throw new HttpError(404, "Esa persona no está en la mesa.");

    // Quien se va deja de ver la campaña, así que no puede recibir la lista.
    return leaving ? { deleted: true } : listMembers(id);
  });
}
