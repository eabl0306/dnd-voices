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
 */
export async function ownedCampaign(campaignId: string, userId: string) {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw new HttpError(404, "Campaña no encontrada.");
  return campaign;
}

export async function ownedCharacter(characterId: string, userId: string) {
  const character = await db.character.findFirst({
    where: { id: characterId, campaign: { userId } },
    include: { campaign: true },
  });
  if (!character) throw new HttpError(404, "Personaje no encontrado.");
  return character;
}

export async function ownedScene(sceneId: string, userId: string) {
  const scene = await db.scene.findFirst({
    where: { id: sceneId, campaign: { userId } },
    include: { campaign: true },
  });
  if (!scene) throw new HttpError(404, "Escena no encontrada.");
  return scene;
}

export async function ownedRender(renderId: string, userId: string) {
  const render = await db.render.findFirst({
    where: { id: renderId, scene: { campaign: { userId } } },
  });
  if (!render) throw new HttpError(404, "Render no encontrado.");
  return render;
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
