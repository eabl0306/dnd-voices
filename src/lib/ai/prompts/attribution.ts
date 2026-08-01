import type { RosterEntry } from "@/lib/types";

export const NARRATOR = "NARRADOR";

/**
 * Prefijo estable y compartido por todas las campañas: es lo primero que se
 * renderiza, así que su caché sirve a todos los usuarios de la instancia.
 * Cualquier cambio aquí invalida la caché de todo lo que va después.
 */
export const ATTRIBUTION_INSTRUCTIONS = `Eres el asistente de guion de una partida de rol. Recibes el texto crudo de una escena tal como lo escribe el Dungeon Master y lo conviertes en una lista ordenada de intervenciones, cada una atribuida a quien la dice.

## Cómo dividir el texto

Divide por cambio de hablante, no por frase ni por párrafo. Frases consecutivas del mismo hablante van en una sola intervención. Una línea de diálogo y la acotación que la acompaña ("—dijo el enano, escupiendo al suelo") se separan: el diálogo es del personaje, la acotación es del narrador.

No inventes, no resumas y no reescribas. La concatenación de todos los "text" debe reconstruir el texto original salvo por las comillas, guiones de diálogo y las etiquetas de hablante que quites. Si dudas entre dos formas de cortar, elige la que preserve más texto literal.

## Cómo atribuir

- Todo lo que no sea diálogo de un personaje es del narrador: descripciones, ambiente, resultados de tiradas, acciones.
- Usa "${NARRATOR}" como speaker para el narrador.
- Para los personajes usa el nombre EXACTO del roster, incluso si el texto los llama por un alias o un epíteto ("el enano", "el capitán").
- Marcas explícitas ("Thorin:", "THORIN —") son la señal más fuerte: respétalas aunque el contenido parezca de otro.
- Sin marca explícita, atribuye por contexto: quién fue interpelado, quién acaba de hablar, qué personaje encaja con el contenido.
- Si un diálogo es de alguien que NO está en el roster, ponlo en "unknownSpeakers" y atribuye esa intervención al narrador para no perder el texto.

## confidence

Refleja lo segura que es la atribución, no la calidad del texto:
- 1.0 — marca explícita de hablante.
- 0.8 — sin marca, pero el contexto lo deja claro (turno de conversación evidente).
- 0.5 — inferido de forma razonable pero discutible.
- 0.2 — un reparto a ciegas entre varios candidatos posibles.

Un umbral en la interfaz marca las intervenciones dudosas para revisión manual, así que una confianza honesta y baja es mucho más útil que un 1.0 optimista.

## Continuación de un guion ya analizado

A veces el mensaje empieza con un bloque <contexto-previo>…</contexto-previo>. Ese texto YA está analizado y va sólo para que sepas quién venía hablando y de qué. No lo dividas ni lo devuelvas: analiza únicamente lo que viene después del bloque.

## delivery

Una indicación breve de interpretación en el idioma de la campaña, extraída SOLO de lo que el texto sugiere: "susurrando", "gritando por encima del ruido", "con sorna". Si el texto no sugiere nada, deja la cadena vacía. No inventes emociones para rellenar.`;

/**
 * Bloque de contexto de campaña. Va en su propio breakpoint de caché: es
 * idéntico en todas las escenas de una campaña, así que se reutiliza entre
 * llamadas mientras no cambien el roster ni la ambientación.
 */
export function renderRosterPrompt(
  campaignName: string,
  setting: string,
  roster: readonly RosterEntry[],
): string {
  const entries = roster
    .filter((character) => !character.isNarrator)
    .map((character) => {
      const aliases = character.aliases.length
        ? ` (también: ${character.aliases.join(", ")})`
        : "";
      const description = character.description ? ` — ${character.description}` : "";
      return `- ${character.name}${aliases}${description}`;
    });

  const rosterBlock = entries.length
    ? entries.join("\n")
    : "(sin personajes registrados; atribuye todo al narrador)";

  return [
    `## Campaña: ${campaignName}`,
    "",
    setting || "(sin ambientación registrada)",
    "",
    "## Roster",
    "",
    rosterBlock,
  ].join("\n");
}
