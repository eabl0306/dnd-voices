import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MODEL, anthropic } from "@/lib/ai/client";
import {
  DESIGN_INSTRUCTIONS,
  POOL_INSTRUCTIONS,
  renderCataloguePrompt,
  renderCharacterPrompt,
} from "@/lib/ai/prompts/casting";
import {
  type DesignBrief,
  DesignBriefSchema,
  type PoolPick,
  PoolPickSchema,
} from "@/lib/ai/schemas";
import type { CampaignContext, CharacterBrief, PoolVoice } from "@/lib/types";

export type CastArgs = {
  character: CharacterBrief;
  campaign: CampaignContext;
};

/** Estrategia DESIGNED: genera el prompt que se le pasa a Voice Design. */
export async function buildDesignBrief(args: CastArgs): Promise<DesignBrief> {
  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(DesignBriefSchema) },
    system: [
      {
        type: "text",
        text: DESIGN_INSTRUCTIONS,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: renderCharacterPrompt(args.character, args.campaign) },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(`Claude no devolvió un brief de voz (stop_reason: ${response.stop_reason}).`);
  }
  return response.parsed_output;
}

/** Estrategia POOL: elige la voz base más cercana y la ajusta al personaje. */
export async function pickFromPool(
  args: CastArgs & { pool: readonly PoolVoice[] },
): Promise<PoolPick> {
  if (args.pool.length === 0) {
    throw new Error("El pool de voces está vacío: sincroniza las voces de ElevenLabs primero.");
  }

  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(PoolPickSchema) },
    system: [
      { type: "text", text: POOL_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
      // El catálogo cambia poco: su propio breakpoint lo mantiene en caché
      // entre personajes de la misma campaña.
      {
        type: "text",
        text: renderCataloguePrompt(args.pool),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: renderCharacterPrompt(args.character, args.campaign) },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(`Claude no eligió voz (stop_reason: ${response.stop_reason}).`);
  }

  const pick = response.parsed_output;
  // Un voiceId inventado fallaría más tarde, en mitad del render y con
  // caracteres ya facturados. Se corta aquí.
  if (!args.pool.some((voice) => voice.voiceId === pick.voiceId)) {
    throw new Error(`Claude devolvió un voiceId fuera del catálogo: ${pick.voiceId}`);
  }
  return pick;
}
