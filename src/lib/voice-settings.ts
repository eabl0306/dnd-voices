import type { VoiceSettings } from "@/lib/types";

/**
 * Qué ajustes respeta cada modelo.
 *
 * Comprobado contra la API comparando la duración de la salida: v2 con
 * `speed` 0,8 devuelve 116 KB y con 1,15 devuelve 79 KB, mientras que v3
 * devuelve exactamente el mismo tamaño con cualquier valor. En v3 sólo
 * `stability` cambia el resultado de forma medible.
 *
 * Enseñar un control que no hace nada es peor que no enseñarlo: el usuario lo
 * mueve, no pasa nada, y deja de fiarse del resto.
 */
export type SettingKey = keyof VoiceSettings;

const V3_KEYS: SettingKey[] = ["stability"];
const V2_KEYS: SettingKey[] = ["stability", "similarityBoost", "style", "speed"];

export function adjustableSettings(model: string): SettingKey[] {
  return model.startsWith("eleven_v3") ? V3_KEYS : V2_KEYS;
}

export const SETTING_LABEL: Record<SettingKey, string> = {
  stability: "Estabilidad",
  similarityBoost: "Fidelidad a la voz",
  style: "Exageración del estilo",
  speed: "Velocidad",
};

export const SETTING_HINT: Record<SettingKey, string> = {
  stability:
    "Baja, más expresiva y variable; alta, más plana y monótona. Por encima de 0,65 la voz empieza a sonar robótica.",
  similarityBoost: "Cuánto se ciñe al timbre original de la voz.",
  style: "Cuánto exagera la interpretación. Sube la latencia y desestabiliza.",
  speed: "Ritmo del habla. Apártate de 1 sólo si es un rasgo del personaje.",
};

export const SETTING_RANGE: Record<SettingKey, { min: number; max: number; step: number }> = {
  stability: { min: 0, max: 1, step: 0.01 },
  similarityBoost: { min: 0, max: 1, step: 0.01 },
  style: { min: 0, max: 1, step: 0.01 },
  // Fuera de este margen el proveedor rechaza la petición.
  speed: { min: 0.7, max: 1.2, step: 0.01 },
};

/**
 * Ajustes de partida cuando nadie los ha elegido.
 *
 * Los personajes con voz elegida a mano se quedaban sin ninguno, y acababan con
 * los valores por defecto del proveedor. El narrador era el más perjudicado:
 * es quien más habla y quien más se nota si cambia de tono entre turnos.
 */
export function defaultVoiceSettings(isNarrator: boolean): VoiceSettings {
  return isNarrator
    ? { stability: 0.6, similarityBoost: 0.8, style: 0.1, speed: 0.96 }
    : { stability: 0.5, similarityBoost: 0.75, style: 0.3, speed: 1 };
}

/** Recorta al margen que admite el proveedor, para no provocar un 422. */
export function clampVoiceSettings(settings: VoiceSettings): VoiceSettings {
  const clamp = (key: SettingKey) => {
    const { min, max } = SETTING_RANGE[key];
    return Math.min(max, Math.max(min, settings[key]));
  };
  return {
    stability: clamp("stability"),
    similarityBoost: clamp("similarityBoost"),
    style: clamp("style"),
    speed: clamp("speed"),
  };
}
