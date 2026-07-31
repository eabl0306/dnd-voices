"use client";

import { Badge, Button, Card, type Tone } from "@/components/ui";
import type { CharacterDto } from "@/lib/dto";

const VOICE_TONE: Record<CharacterDto["voiceStatus"], Tone> = {
  READY: "ok",
  PENDING: "warn",
  FAILED: "bad",
};

function voiceLabel(character: CharacterDto): string {
  if (character.voiceStatus === "PENDING") return "asignando voz…";
  if (character.voiceStatus === "FAILED") return "voz fallida";
  return character.voiceStrategy === "DESIGNED" ? "voz propia" : "voz del pool";
}

export function CharacterCard({
  character,
  onRecast,
}: {
  character: CharacterDto;
  onRecast: (id: string) => void;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{character.name}</span>
            {character.isNarrator && <Badge>narrador</Badge>}
            <Badge tone={VOICE_TONE[character.voiceStatus]}>{voiceLabel(character)}</Badge>
          </div>
          {character.voiceBrief && (
            <p className="mt-1 text-sm opacity-60 line-clamp-2">{character.voiceBrief}</p>
          )}
          {character.voiceError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{character.voiceError}</p>
          )}
        </div>
        {character.voiceStatus !== "PENDING" && (
          <Button variant="ghost" onClick={() => onRecast(character.id)}>
            Recastear
          </Button>
        )}
      </div>
    </Card>
  );
}
