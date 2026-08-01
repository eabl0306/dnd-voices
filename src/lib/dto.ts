/** Formas que devuelve la API y consume el cliente. */

export type VoiceStrategy = "DESIGNED" | "POOL" | "LIBRARY";
export type VoiceStatus = "PENDING" | "READY" | "FAILED";
export type VoiceProvider = "ELEVENLABS" | "OPENAI" | "AZURE";
export type RenderStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export type CampaignSummary = {
  id: string;
  name: string;
  characterCount: number;
  sceneCount: number;
};

export type NavData = {
  user: { email: string; name: string };
  campaigns: CampaignSummary[];
  voiceCount: number;
  active: {
    id: string;
    name: string;
    characterCount: number;
    sceneCount: number;
    /** Última escena tocada: alimenta el grupo «Abierto ahora» de la barra lateral. */
    openScene: { id: string; title: string; pendingReview: number } | null;
  } | null;
};

export type MemberDto = {
  userId: string;
  name: string;
  email: string;
  /** Manda en la mesa: puede invitar, echar y borrar la campaña. */
  isOwner: boolean;
  joinedAt: string;
};

export type CampaignOverview = {
  id: string;
  name: string;
  setting: string;
  characterCount: number;
  sceneCount: number;
  failedVoices: number;
  pendingVoices: number;
  renderedScenes: number;
  pendingReview: number;
  scenesWithPending: number;
  charsBilled: number;
  cacheHitRatio: number;
  lastRenderAt: string | null;
  attention: AttentionItem[];
  /** Si quien mira es el dueño: decide si puede gestionar la mesa. */
  isOwner: boolean;
};

export type AttentionItem = {
  id: string;
  glyph: string;
  tone: "warn" | "err" | "neutral";
  text: string;
  href: string;
};

export type VoiceDto = {
  id: string;
  name: string;
  provider: VoiceProvider;
  externalId: string;
  model: string;
  tags: string[];
  campaignId: string | null;
  generated: boolean;
  usedBy: number;
};

export type CharacterDto = {
  id: string;
  name: string;
  description: string;
  backstory: string;
  isNarrator: boolean;
  voiceStrategy: VoiceStrategy;
  voiceStatus: VoiceStatus;
  voiceId: string | null;
  voiceRefId: string | null;
  voiceName: string | null;
  voiceBrief: string | null;
  voiceError: string | null;
  /** Modelo de la voz asignada; decide qué ajustes tienen efecto. */
  voiceModel: string | null;
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
    speed: number;
  } | null;
  /** Intervenciones suyas en la escena abierta. */
  lineCount: number;
};

export type SceneSummary = {
  id: string;
  title: string;
  status: string;
  excerpt: string;
  lineCount: number;
  pendingReview: number;
  hasAudio: boolean;
};

export type LineDto = {
  id: string;
  order: number;
  text: string;
  delivery: string | null;
  confidence: number;
  characterId: string | null;
  isNarration: boolean;
  /** Silencio en ms que va después de esta intervención en el montaje. */
  pauseAfter: number;
  /** Decaimiento manual del final del clip, en ms. 0 = tal cual llega. */
  fadeOutMs: number;
  /** Duración del clip; null hasta el primer render que lo sintetiza. */
  durationMs: number | null;
  /** Si hay clip en disco que escuchar por separado. */
  hasAudio: boolean;
  /** El clip existe pero ya no corresponde al texto o a la voz de ahora. */
  audioStale: boolean;
};

export type RenderDto = {
  id: string;
  status: RenderStatus;
  progress: number;
  cacheHits: number;
  charsBilled: number;
  durationMs: number | null;
  error: string | null;
};

export type SceneDetail = {
  id: string;
  campaignId: string;
  title: string;
  rawText: string;
  status: string;
  lines: LineDto[];
  renders: RenderDto[];
};

/** Por debajo de esto la atribución se marca para revisión manual. */
export const LOW_CONFIDENCE = 0.7;

export function isLineDubious(line: Pick<LineDto, "confidence" | "characterId">): boolean {
  return line.characterId === null || line.confidence < LOW_CONFIDENCE;
}

export function isRenderSettled(status: RenderStatus): boolean {
  return status === "DONE" || status === "FAILED";
}

/** Etiqueta y glifo del estado de voz de un personaje. */
export function voiceState(character: Pick<CharacterDto, "voiceStatus" | "voiceStrategy">): {
  glyph: string;
  label: string;
  tone: "ok" | "warn" | "err" | "accent";
} {
  if (character.voiceStatus === "PENDING") {
    return { glyph: "↻", label: "Asignando voz…", tone: "warn" };
  }
  if (character.voiceStatus === "FAILED") {
    return { glyph: "!", label: "Voz fallida", tone: "err" };
  }
  if (character.voiceStrategy === "DESIGNED") {
    return { glyph: "✓", label: "Voz generada", tone: "ok" };
  }
  if (character.voiceStrategy === "LIBRARY") {
    return { glyph: "★", label: "Voz asignada a mano", tone: "accent" };
  }
  return { glyph: "≡", label: "Voz del pool", tone: "accent" };
}
