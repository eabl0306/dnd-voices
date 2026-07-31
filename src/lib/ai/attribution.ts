import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MODEL, anthropic } from "@/lib/ai/client";
import {
  ATTRIBUTION_INSTRUCTIONS,
  renderRosterPrompt,
} from "@/lib/ai/prompts/attribution";
import { type Attribution, AttributionSchema } from "@/lib/ai/schemas";
import type { RosterEntry } from "@/lib/types";

export type AttributeArgs = {
  campaignName: string;
  setting: string;
  roster: readonly RosterEntry[];
  rawText: string;
};

export type AttributeResult = {
  result: Attribution;
  usage: Anthropic.Usage;
};

/**
 * Convierte el texto crudo de una escena en intervenciones atribuidas.
 *
 * Los dos breakpoints de caché van del contenido más estable al más volátil:
 * instrucciones (iguales en toda la instancia) → campaña (iguales en todas sus
 * escenas) → texto de la escena, que cambia siempre y por eso va al final.
 */
export async function attributeSpeakers(args: AttributeArgs): Promise<AttributeResult> {
  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(AttributionSchema) },
    system: [
      {
        type: "text",
        text: ATTRIBUTION_INSTRUCTIONS,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: renderRosterPrompt(args.campaignName, args.setting, args.roster),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: args.rawText }],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Claude no devolvió una atribución válida (stop_reason: ${response.stop_reason}).`,
    );
  }

  return { result: response.parsed_output, usage: response.usage };
}
