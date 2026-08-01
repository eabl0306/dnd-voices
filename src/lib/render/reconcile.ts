import type { MappedLine } from "@/lib/render/line-mapper";

export type ExistingLine = { id: string; text: string };

export type Reconciliation = {
  /** Líneas que sobreviven al reanálisis; sólo cambia su posición. */
  keep: { id: string; order: number }[];
  /** Líneas que no existían, con la posición que les toca. */
  create: MappedLine[];
  /** Líneas que ya no aparecen en el texto y hay que borrar. */
  removeIds: string[];
};

/**
 * Clave de emparejamiento entre una línea guardada y una recién analizada.
 *
 * Ignora los espacios porque Claude puede devolver el mismo contenido con otro
 * espaciado entre dos análisis, y eso no cambia ni una sílaba de lo que se
 * sintetiza: tratar esas líneas como nuevas tiraría su audio sin motivo.
 */
function matchKey(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Texto añadido al final, o null si el cambio no es una simple ampliación.
 *
 * Devuelve "" cuando el texto no ha cambiado. Es la diferencia entre añadir una
 * escena nueva al final —el caso normal cuando la partida avanza— y haber
 * tocado algo de lo ya analizado, que obliga a rehacer el guion entero.
 */
export function appendedText(parsed: string, current: string): string | null {
  if (!parsed.trim()) return null;
  if (!current.startsWith(parsed)) return null;
  return current.slice(parsed.length);
}

/**
 * Empareja el guion recién analizado con el que ya había.
 *
 * Reanalizar borrando y recreando todo tiraba el trabajo manual —personaje
 * corregido a mano, pausas y decaimientos ajustados— y dejaba las líneas sin
 * audio aunque su texto no hubiera cambiado. Aquí lo que coincide se conserva
 * tal cual y sólo se mueve de sitio; lo que no, se crea o se borra.
 *
 * El emparejamiento es voraz y por orden: con dos líneas de texto idéntico, la
 * primera que aparece se queda con la primera existente. Sin eso, dos "Sí."
 * seguidos podrían intercambiar sus audios.
 */
export function reconcileLines(
  existing: readonly ExistingLine[],
  incoming: readonly MappedLine[],
): Reconciliation {
  const pending = new Map<string, string[]>();
  for (const line of existing) {
    const key = matchKey(line.text);
    const bucket = pending.get(key);
    if (bucket) bucket.push(line.id);
    else pending.set(key, [line.id]);
  }

  const keep: Reconciliation["keep"] = [];
  const create: MappedLine[] = [];
  const matched = new Set<string>();

  for (const [order, line] of incoming.entries()) {
    const id = pending.get(matchKey(line.text))?.shift();
    if (id === undefined) {
      create.push({ ...line, order });
      continue;
    }
    matched.add(id);
    keep.push({ id, order });
  }

  return {
    keep,
    create,
    removeIds: existing.filter((line) => !matched.has(line.id)).map((line) => line.id),
  };
}
