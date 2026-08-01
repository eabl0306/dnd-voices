import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new HttpError(401, "No has iniciado sesión.");
  return session.user;
}

/**
 * Toda lectura y escritura pasa por uno de estos: sin ellos, un id ajeno en la
 * URL basta para leer la campaña de otro usuario.
 *
 * El filtro es la pertenencia a la mesa, no la propiedad. Como el dueño tiene
 * su propia fila en `CampaignMember`, una sola condición cubre a los dos y no
 * hay que acordarse de añadir el caso del dueño en cada ruta nueva.
 *
 * Un recurso ajeno da 404 y no 403: un 403 confirmaría que ese id existe.
 */
const memberOf = (userId: string) => ({ members: { some: { userId } } });

export async function accessibleCampaign(campaignId: string, userId: string) {
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, ...memberOf(userId) },
  });
  if (!campaign) throw new HttpError(404, "Campaña no encontrada.");
  return campaign;
}

/**
 * Sólo para lo que no admite empates: borrar la campaña y tocar la mesa.
 * El resto del contenido lo trabaja cualquier miembro.
 */
export async function ownedCampaign(campaignId: string, userId: string) {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw new HttpError(404, "Campaña no encontrada.");
  return campaign;
}

export async function accessibleCharacter(characterId: string, userId: string) {
  const character = await db.character.findFirst({
    where: { id: characterId, campaign: memberOf(userId) },
    include: { campaign: true },
  });
  if (!character) throw new HttpError(404, "Personaje no encontrado.");
  return character;
}

export async function accessibleScene(sceneId: string, userId: string) {
  const scene = await db.scene.findFirst({
    where: { id: sceneId, campaign: memberOf(userId) },
    include: { campaign: true },
  });
  if (!scene) throw new HttpError(404, "Escena no encontrada.");
  return scene;
}

export async function accessibleRender(renderId: string, userId: string) {
  const render = await db.render.findFirst({
    where: { id: renderId, scene: { campaign: memberOf(userId) } },
  });
  if (!render) throw new HttpError(404, "Render no encontrado.");
  return render;
}

export async function accessibleLine(lineId: string, userId: string) {
  const line = await db.line.findFirst({
    where: { id: lineId, scene: { campaign: memberOf(userId) } },
  });
  if (!line) throw new HttpError(404, "Intervención no encontrada.");
  return line;
}

/** Convierte errores conocidos en respuestas JSON en vez de un 500 opaco. */
export function handler<T>(fn: () => Promise<T>) {
  return fn().then(
    (data) => NextResponse.json(data),
    (error: unknown) => {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Datos inválidos", issues: z.treeifyError(error) },
          { status: 400 },
        );
      }
      console.error(error);
      const message = error instanceof Error ? error.message : "Error inesperado";
      return NextResponse.json({ error: message }, { status: 500 });
    },
  );
}
