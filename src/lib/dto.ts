/** Formas que devuelve la API y consume el cliente. */

export type VoiceStrategy = "DESIGNED" | "POOL";
export type VoiceStatus = "PENDING" | "READY" | "FAILED";
export type RenderStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export type CampaignSummary = {
  id: string;
  name: string;
  setting: string;
  language: string;
  _count: { characters: number; scenes: number };
};

export type CharacterDto = {
  id: string;
  name: string;
  description: string;
  isNarrator: boolean;
  voiceStrategy: VoiceStrategy;
  voiceStatus: VoiceStatus;
  voiceId: string | null;
  voiceBrief: string | null;
  voiceError: string | null;
};

export type SceneSummary = {
  id: string;
  title: string;
  status: string;
  _count: { lines: number };
};

export type LineDto = {
  id: string;
  order: number;
  text: string;
  delivery: string | null;
  confidence: number;
  characterId: string | null;
};

export type RenderDto = {
  id: string;
  status: RenderStatus;
  progress: number;
  cacheHits: number;
  charsBilled: number;
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
