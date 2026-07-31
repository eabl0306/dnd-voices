/** Tipos de dominio compartidos entre servidor, worker y cliente. */

export type VoiceSettings = {
  /** Bajo = más expresivo y variable; alto = más monótono y predecible. */
  stability: number;
  similarityBoost: number;
  /** Exageración del estilo. Sube la latencia y puede desestabilizar la voz. */
  style: number;
  speed: number;
};

export type PoolVoice = {
  voiceId: string;
  name: string;
  description: string;
  labels: Record<string, string>;
};

export type RosterEntry = {
  name: string;
  aliases: string[];
  description: string;
  isNarrator: boolean;
};

export type CharacterBrief = {
  name: string;
  description: string;
  backstory: string;
  isNarrator: boolean;
};

export type CampaignContext = {
  campaignName: string;
  setting: string;
  language: string;
};

/** Omite la clave si el valor es `undefined`, en vez de asignarla explícitamente. */
export function optional<K extends string, V>(
  key: K,
  value: V | undefined,
): Record<K, V> | Record<string, never> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

/** Claves opcionales cuyo tipo ya no admite `undefined`. */
export type Defined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

/**
 * Elimina las claves con valor `undefined`.
 *
 * Con `exactOptionalPropertyTypes` no basta con que un campo sea opcional:
 * pasar `{ titulo: undefined }` a Prisma es un error de tipos, porque no es lo
 * mismo «no actualizar el título» que «poner el título a undefined».
 */
export function compact<T extends object>(input: T): Defined<T> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key] = value;
  }
  return output as Defined<T>;
}
