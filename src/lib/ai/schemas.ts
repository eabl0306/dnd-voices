import { z } from "zod";

/** Esquemas de salida estructurada. Separados para poder testearlos sin red. */

export const VoiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1),
  similarityBoost: z.number().min(0).max(1),
  style: z.number().min(0).max(1),
  speed: z.number().min(0.7).max(1.2),
});

export const AttributedLineSchema = z.object({
  /** Nombre exacto de un personaje del roster, o "NARRADOR". */
  speaker: z.string(),
  text: z.string(),
  /** Cómo se dice, no qué se dice. Vacío si el texto no da ninguna pista. */
  delivery: z.string(),
  confidence: z.number().min(0).max(1),
});

export const AttributionSchema = z.object({
  lines: z.array(AttributedLineSchema),
  /** Nombres mencionados que no están en el roster. La UI ofrece crearlos. */
  unknownSpeakers: z.array(z.string()),
});

export const DesignBriefSchema = z.object({
  /** Prompt en inglés para Voice Design: el modelo de ElevenLabs responde mejor. */
  voiceDescription: z.string().min(1),
  /**
   * Frase de muestra en el idioma de la campaña para escuchar las previews.
   * El proveedor rechaza con un 422 cualquier texto por debajo de 100
   * caracteres, así que se valida aquí y el modelo lo reintenta.
   */
  previewText: z.string().min(100),
  settings: VoiceSettingsSchema,
  rationale: z.string(),
});

export const PoolPickSchema = z.object({
  voiceId: z.string().min(1),
  settings: VoiceSettingsSchema,
  rationale: z.string(),
});

export type AttributedLine = z.infer<typeof AttributedLineSchema>;
export type Attribution = z.infer<typeof AttributionSchema>;
export type DesignBrief = z.infer<typeof DesignBriefSchema>;
export type PoolPick = z.infer<typeof PoolPickSchema>;
