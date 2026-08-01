/**
 * Cuánto silencio se inserta entre dos intervenciones.
 *
 * Medido sobre una escena real de 22 minutos con los valores anteriores (300 ms
 * tras un personaje, 500 ms tras el narrador): la mediana de silencio del audio
 * montado era 0,26 s y el 80 % de los huecos quedaba por debajo de 0,45 s. En
 * una narración eso se oye atropellado, sin tiempo para asimilar quién habla.
 *
 * El criterio es el de un audiolibro: dentro de una misma intervención se
 * encadena, y al cambiar de voz se respira.
 */

/** Sigue hablando el mismo personaje: basta con separar las frases. */
export const PAUSE_SAME_SPEAKER_MS = 400;

/** La frase queda en suspenso: encadenar sin respirar o se pierde el hilo. */
export const PAUSE_UNFINISHED_MS = 250;

/** Cambio de voz entre dos personajes: el oyente necesita recolocarse. */
export const PAUSE_SPEAKER_CHANGE_MS = 850;

/**
 * El narrador entra o sale. Equivale a un punto y aparte: separa la acción
 * narrada del diálogo, que es el corte que más cuesta seguir de oído.
 */
export const PAUSE_NARRATOR_BLOCK_MS = 1000;

/** Signos que dejan la frase abierta: la siguiente línea la continúa. */
const UNFINISHED = /[,;:—–-]["'»)\s]*$/;

export type PauseContext = {
  characterId: string | null;
  isNarrator: boolean;
  text: string;
};

/**
 * Devuelve la pausa que va después de `current`.
 *
 * `next` es undefined en la última línea; el valor da igual porque el montaje
 * descarta esa pausa, pero devolver algo coherente evita un caso especial.
 */
export function pauseAfterFor(
  current: PauseContext,
  next: PauseContext | undefined,
): number {
  if (!next) return PAUSE_SAME_SPEAKER_MS;

  // Dos líneas sin personaje resuelto no son "el mismo hablante": comparar
  // null con null las encadenaría como si lo fueran.
  const sameSpeaker =
    current.characterId !== null && current.characterId === next.characterId;

  // El suspenso sólo cuenta dentro de una misma voz. Si cambia el hablante hay
  // que marcar el relevo aunque la frase anterior quedara a medias.
  if (sameSpeaker) {
    return UNFINISHED.test(current.text) ? PAUSE_UNFINISHED_MS : PAUSE_SAME_SPEAKER_MS;
  }

  if (current.isNarrator || next.isNarrator) return PAUSE_NARRATOR_BLOCK_MS;
  return PAUSE_SPEAKER_CHANGE_MS;
}
