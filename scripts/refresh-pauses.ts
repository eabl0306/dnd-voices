/**
 * Recalcula `pauseAfter` de todas las líneas ya guardadas.
 *
 * Las pausas se fijan al analizar la escena, así que cambiar las reglas no toca
 * lo que ya está en la base de datos. Volver a analizar costaría una llamada a
 * Claude y podría reatribuir hablantes; esto sólo reescribe el silencio.
 *
 * No cuesta nada en ElevenLabs: `pauseAfter` no entra en la clave de caché, así
 * que el siguiente render reutiliza todos los clips y sólo rehace el montaje.
 */
import { db } from "@/lib/db";
import { type PauseContext, pauseAfterFor } from "@/lib/render/pauses";

async function main() {
  const scenes = await db.scene.findMany({
    where: { lines: { some: {} } },
    select: {
      id: true,
      title: true,
      lines: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          text: true,
          pauseAfter: true,
          characterId: true,
          character: { select: { isNarrator: true } },
        },
      },
    },
  });

  let touched = 0;

  for (const scene of scenes) {
    const contexts: PauseContext[] = scene.lines.map((line) => ({
      characterId: line.characterId,
      isNarrator: line.character?.isNarrator ?? false,
      text: line.text,
    }));

    const changes = scene.lines.flatMap((line, index) => {
      const context = contexts[index];
      if (!context) return [];
      const pauseAfter = pauseAfterFor(context, contexts[index + 1]);
      return pauseAfter === line.pauseAfter ? [] : [{ id: line.id, pauseAfter }];
    });

    if (changes.length === 0) continue;

    // En una transacción: dejar una escena a medias mezclaría ritmos viejos y
    // nuevos en el mismo audio, que es peor que no haberla tocado.
    await db.$transaction(
      changes.map((change) =>
        db.line.update({ where: { id: change.id }, data: { pauseAfter: change.pauseAfter } }),
      ),
    );

    touched += changes.length;
    console.log(`${scene.title}: ${changes.length}/${scene.lines.length} líneas`);
  }

  console.log(
    touched === 0
      ? "Nada que cambiar: las pausas ya siguen las reglas actuales."
      : `${touched} pausas actualizadas. Vuelve a generar el audio de esas escenas.`,
  );
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
