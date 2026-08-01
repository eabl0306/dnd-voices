/**
 * Qué sabe hacer cada modelo de síntesis.
 *
 * Vive aparte del cliente de ElevenLabs para que la interfaz pueda consultarlo
 * sin arrastrar el SDK ni las credenciales al navegador. Todo lo de aquí son
 * datos comprobados contra la API, no documentación de memoria.
 */

/**
 * Modelo por defecto de una voz nueva.
 *
 * v3 es el más expresivo y el único que entiende indicaciones de interpretación
 * en el texto, y cuesta lo mismo que v2 (`character_cost_multiplier` 1 en
 * ambos). Cada voz puede llevar el suyo.
 */
export const DEFAULT_TTS_MODEL = "eleven_v3";

/**
 * Modelos que respetan `language_code`.
 *
 * Comprobado con semilla fija: `eleven_multilingual_v2` devuelve audio idéntico
 * con `es`, con `en` y sin el parámetro, así que lo ignora y sólo detecta el
 * idioma del texto.
 */
const WITH_LANGUAGE_ENFORCEMENT = ["eleven_turbo_v2_5", "eleven_flash_v2_5"];

export function honoursLanguageCode(model: string): boolean {
  return WITH_LANGUAGE_ENFORCEMENT.includes(model);
}

/**
 * Modelos que aceptan `previous_text` / `next_text` para dar continuidad
 * prosódica entre líneas contiguas.
 *
 * v3 responde 400 `unsupported_model` tanto a eso como a `previous_request_ids`:
 * no tiene ningún mecanismo de continuidad, y por eso su timbre se mueve entre
 * intervenciones de un mismo personaje.
 */
export function acceptsNeighbourContext(model: string): boolean {
  return !model.startsWith("eleven_v3");
}

/**
 * Modelos que entienden indicaciones de interpretación entre corchetes.
 *
 * Comprobado transcribiendo la salida: con `[susurrando]` delante, la
 * transcripción es idéntica a la del texto pelado —la etiqueta no se lee en voz
 * alta— pero la duración pasa de 3,47 s a 4,28 s. La entiende en español.
 */
export function supportsAudioTags(model: string): boolean {
  return model.startsWith("eleven_v3");
}

/** Antepone la indicación de interpretación si el modelo sabe leerla. */
export function withDelivery(text: string, delivery: string | null, model: string): string {
  if (!delivery || !supportsAudioTags(model)) return text;
  return `[${delivery}] ${text}`;
}
