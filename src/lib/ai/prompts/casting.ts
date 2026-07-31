import type { CampaignContext, CharacterBrief, PoolVoice } from "@/lib/types";

export const CASTING_SHARED = `Eres director de casting de voz para una partida de rol. Traduces personajes a especificaciones de voz concretas.

Un buen brief describe el instrumento, no la biografía: edad aparente, género vocal, tesitura, textura (áspera, nasal, aterciopelada), acento, ritmo y energía. "Enano guerrero que perdió a su hermano" no le dice nada a un motor de voz; "hombre de mediana edad, voz grave y rasposa, acento escocés marcado, habla despacio y con peso" sí.

Sobre los ajustes:
- stability baja (0.3-0.45) para personajes expresivos o volátiles; alta (0.6-0.8) para narradores y personajes contenidos. Por debajo de 0.3 la voz se vuelve errática entre líneas.
- style por encima de 0.5 sólo cuando el personaje pide una interpretación marcada; cuesta latencia y desestabiliza.
- speed se aparta de 1.0 sólo si el ritmo es un rasgo del personaje.

El narrador es el pegamento de la escena: prioriza claridad e inteligibilidad sobre carácter, y estabilidad alta para que no cambie de tono entre intervenciones.`;

export const DESIGN_INSTRUCTIONS = `${CASTING_SHARED}

Devuelve un brief para generar una voz nueva desde cero. "voiceDescription" va en inglés y describe sólo el instrumento vocal. "previewText" es una frase que ese personaje diría, en el idioma de la campaña, de 15 a 25 palabras.`;

export const POOL_INSTRUCTIONS = `${CASTING_SHARED}

Elige una voz del catálogo disponible y ajústala al personaje. "voiceId" debe ser uno de los identificadores del catálogo, copiado literalmente. Si ninguna encaja bien, elige la menos mala y dilo en "rationale": la interfaz ofrecerá diseñar una voz propia.`;

export function renderCharacterPrompt(
  character: CharacterBrief,
  campaign: CampaignContext,
): string {
  return [
    `## Campaña: ${campaign.campaignName}`,
    `Idioma: ${campaign.language}`,
    campaign.setting || "(sin ambientación registrada)",
    "",
    `## Personaje: ${character.name}${character.isNarrator ? " (NARRADOR)" : ""}`,
    "",
    `Descripción: ${character.description || "(vacía)"}`,
    "",
    `Trasfondo: ${character.backstory || "(vacío)"}`,
  ].join("\n");
}

export function renderCataloguePrompt(pool: readonly PoolVoice[]): string {
  const entries = pool.map((voice) => {
    const labels = Object.entries(voice.labels)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
    const parts = [voice.voiceId, voice.name];
    if (labels) parts.push(labels);
    if (voice.description) parts.push(voice.description);
    return `- ${parts.join(" | ")}`;
  });

  return `## Catálogo de voces\n\n${entries.join("\n")}`;
}
