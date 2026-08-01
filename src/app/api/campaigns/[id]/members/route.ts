import type { NextRequest } from "next/server";
import { z } from "zod";
import { accessibleCampaign, handler, HttpError, ownedCampaign, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import type { MemberDto } from "@/lib/dto";
import { listMembers } from "@/lib/queries/members";

type Params = { params: Promise<{ id: string }> };

const AddMember = z.object({
  email: z.email().max(320),
});

/** La mesa la ve cualquiera que esté en ella: saber con quién juegas no es secreto. */
export function GET(_request: NextRequest, { params }: Params) {
  return handler(async (): Promise<MemberDto[]> => {
    const user = await requireUser();
    const { id } = await params;
    await accessibleCampaign(id, user.id);
    return listMembers(id);
  });
}

export function POST(request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    await ownedCampaign(id, user.id);
    const { email } = AddMember.parse(await request.json());

    const invited = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    if (!invited) {
      // No se crea la cuenta desde aquí: sortearía la lista blanca de altas y
      // dejaría al invitado sin contraseña que conozca.
      throw new HttpError(
        404,
        "Nadie usa ese correo todavía. Pídele que cree su cuenta y vuelve a intentarlo.",
      );
    }

    const already = await db.campaignMember.count({
      where: { campaignId: id, userId: invited.id },
    });
    if (already > 0) throw new HttpError(409, "Esa persona ya está en la mesa.");

    await db.campaignMember.create({ data: { campaignId: id, userId: invited.id } });
    return listMembers(id);
  });
}
