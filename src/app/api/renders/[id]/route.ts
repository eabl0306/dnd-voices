import type { NextRequest } from "next/server";
import { handler, accessibleRender, requireUser } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** Polling de progreso desde la UI mientras el worker trabaja. */
export function GET(_request: NextRequest, { params }: Params) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await params;
    return accessibleRender(id, user.id);
  });
}
