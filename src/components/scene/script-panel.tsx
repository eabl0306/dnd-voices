"use client";

import { Badge, Button, Card, Select } from "@/components/ui";
import type { CharacterDto, LineDto } from "@/lib/dto";
import { isLineDubious } from "@/lib/dto";

function ScriptLine({
  line,
  characters,
  onReassign,
}: {
  line: LineDto;
  characters: readonly CharacterDto[];
  onReassign: (lineId: string, characterId: string) => void;
}) {
  const dubious = isLineDubious(line);

  return (
    <div
      data-testid="script-line"
      data-dubious={dubious}
      className={`rounded-md border p-3 ${
        dubious ? "border-amber-500/40 bg-amber-500/5" : "border-black/10 dark:border-white/15"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Select
          aria-label={`Voz de la línea ${line.order + 1}`}
          className="w-auto py-1 text-xs"
          value={line.characterId ?? ""}
          onChange={(event) => onReassign(line.id, event.target.value)}
        >
          <option value="" disabled>
            Sin asignar
          </option>
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </Select>
        {line.delivery && <Badge>{line.delivery}</Badge>}
        {dubious && <Badge tone="warn">revisar</Badge>}
      </div>
      <p className="whitespace-pre-wrap text-sm">{line.text}</p>
    </div>
  );
}

export function ScriptPanel({
  lines,
  characters,
  onReassign,
  onRender,
  renderDisabled,
}: {
  lines: readonly LineDto[];
  characters: readonly CharacterDto[];
  onReassign: (lineId: string, characterId: string) => void;
  onRender: () => void;
  renderDisabled: boolean;
}) {
  const unassigned = lines.filter((line) => line.characterId === null).length;

  return (
    <Card className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Guion</h2>
        <span className="text-sm opacity-60">
          {lines.length} líneas
          {unassigned > 0 && ` · ${unassigned} sin voz`}
        </span>
      </div>

      <div className="space-y-2">
        {lines.map((line) => (
          <ScriptLine
            key={line.id}
            line={line}
            characters={characters}
            onReassign={onReassign}
          />
        ))}
      </div>

      <div className="mt-4">
        <Button onClick={onRender} disabled={renderDisabled}>
          Generar audio
        </Button>
      </div>
    </Card>
  );
}
