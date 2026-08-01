import type { CampaignContext, CharacterBrief, PoolVoice } from "@/lib/types";

export const CASTING_SHARED = `Eres director de casting de voz para una partida de rol. Traduces personajes a especificaciones de voz concretas.

Un buen brief describe el instrumento, no la biografía: edad aparente, género vocal, tesitura, textura (áspera, nasal, aterciopelada), acento, ritmo y energía. "Enano guerrero que perdió a su hermano" no le dice nada a un motor de voz; "hombre de mediana edad, voz grave y rasposa, acento escocés marcado, habla despacio y con peso" sí.

Sobre los ajustes:
- stability no funciona como un «más o menos energía». En el modelo actual, 0.5 es la entrega natural y subir de ahí aplana la prosodia hasta sonar mecánico. Muévete entre 0.35 y 0.5: baja para personajes volátiles, hasta 0.5 para los contenidos. Por encima de 0.55 la voz suena a locución automática, y por debajo de 0.3 cambia demasiado entre intervenciones. Un personaje sobrio o de pocas palabras no necesita más estabilidad: su sobriedad está en lo que dice y en cómo se dice, no en aplanarle la entonación.
- style por encima de 0.5 sólo cuando el personaje pide una interpretación marcada; cuesta latencia y desestabiliza.
- speed se aparta de 1.0 sólo si el ritmo es un rasgo del personaje.

El narrador es el pegamento de la escena: prioriza claridad e inteligibilidad sobre carácter, y estabilidad alta para que no cambie de tono entre intervenciones.

Y una regla que vale para todos, no sólo para el narrador: la voz tiene que entenderse. Un timbre muy aireado, muy apretado o muy susurrante se come sílabas y arruina la escena por mucho que encaje con el personaje. La tensión, el cansancio o la rabia se interpretan al decir cada frase; no se piden metidas en el instrumento. Describe una voz que articule con claridad y deja el matiz para la interpretación.`;

export const DESIGN_INSTRUCTIONS = `${CASTING_SHARED}

Devuelve un brief para generar una voz nueva desde cero. "voiceDescription" va en inglés y describe sólo el instrumento vocal.

"previewText" es lo que ese personaje diría, en el idioma de la campaña, y tiene que pasar de 100 caracteres: el proveedor rechaza cualquier cosa más corta. Escribe dos o tres frases suyas, no una sola, y que suenen a él.`;

export const POOL_INSTRUCTIONS = `${CASTING_SHARED}

Elige una voz del catálogo disponible y ajústala al personaje. "voiceId" debe ser uno de los identificadores del catálogo, copiado literalmente. Si ninguna encaja bien, elige la menos mala y dilo en "rationale": la interfaz ofrecerá diseñar una voz propia.

Prioriza una voz libre aunque encaje algo peor. Dos personajes que suenan igual son indistinguibles en una escena donde ambos hablan, y eso arruina el reparto más que un timbre imperfecto. Reutiliza una ya ocupada sólo si no queda ninguna libre, o si la libre que queda es claramente inadecuada (género vocal o edad muy distintos); en ese caso dilo en "rationale" y separa los ajustes de la otra asignación todo lo que puedas.`;

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
    // Marcar las ocupadas es lo que permite repartir en vez de elegir siempre
    // la que mejor encaja en abstracto.
    parts.push(voice.takenBy.length > 0 ? `YA LA USA: ${voice.takenBy.join(", ")}` : "libre");
    return `- ${parts.join(" | ")}`;
  });

  return `## Catálogo de voces\n\n${entries.join("\n")}`;
}
