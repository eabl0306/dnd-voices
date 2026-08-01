"use client";

import { Chip, GlyphBox, MonoButton, Panel, StateLabel } from "@/components/ui";
import { type CharacterDto, voiceState } from "@/lib/dto";
import { characterColor, TONE_TEXT } from "@/lib/tone";

export function CharacterCard({
  character,
  onEdit,
  onChangeVoice,
}: {
  character: CharacterDto;
  onEdit: (character: CharacterDto) => void;
  onChangeVoice: (character: CharacterDto) => void;
}) {
  const state = voiceState(character);
  const busy = character.voiceStatus === "PENDING";
  const failed = character.voiceStatus === "FAILED";

  return (
    <Panel className={`p-[15px] transition-colors duration-350 ${failed ? "border-err" : ""}`}>
      <div className="flex items-start gap-[10px]">
        <div className="min-w-0 flex-1">
          <div className="mb-[5px] flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 flex-none"
              style={{
                background: characterColor(character.id),
                // El narrador es cuadrado: la forma distingue el papel sin color.
                borderRadius: character.isNarrator ? 0 : "50%",
              }}
            />
            {/* Encabezado real: la rejilla de personajes es una lista de entidades. */}
            <h3 className="truncate text-[15px] font-semibold">{character.name}</h3>
          </div>
          <StateLabel glyph={state.glyph} tone={state.tone}>
            {state.label}
          </StateLabel>
        </div>
        <Chip>{character.isNarrator ? "Narrador" : "Personaje"}</Chip>
      </div>

      {/* min-height fijo: sin él, la tarjeta salta al cambiar de estado. */}
      <div
        className="mt-[10px] min-h-[36px] text-[13px] leading-[1.5] text-text2 transition-opacity duration-400"
        style={{ opacity: busy ? 0.65 : 1 }}
      >
        {failed
          ? (character.voiceError ?? "La voz no se pudo generar.")
          : (character.voiceBrief ?? character.description ?? "") || "Sin descripción todavía."}
      </div>

      {busy && (
        <div className="h-[3px] overflow-hidden rounded-[2px] bg-panel3">
          <div
            className="h-full w-full"
            style={{
              background:
                "linear-gradient(90deg,transparent 0%,var(--warn) 45%,transparent 90%)",
              backgroundSize: "45% 100%",
              backgroundRepeat: "no-repeat",
              animation: "shimmer 1.25s linear infinite",
            }}
          />
        </div>
      )}

      <div className="mt-[10px] flex flex-wrap items-center gap-2 border-t border-line pt-[10px]">
        <span
          className={`flex w-full min-w-0 items-center gap-[6px] font-mono text-[11.5px] ${TONE_TEXT[state.tone]}`}
        >
          <GlyphBox glyph={state.glyph} size={14} />
          <span className="min-w-0 flex-1 truncate">
            {character.voiceName ?? (busy ? "asignando…" : "sin voz")}
          </span>
        </span>
        <MonoButton onClick={() => onEdit(character)}>Editar</MonoButton>
        <MonoButton
          onClick={() => onChangeVoice(character)}
          disabled={busy}
          tone={failed ? "err" : "neutral"}
        >
          {failed ? "Reintentar" : "Cambiar voz"}
        </MonoButton>
      </div>

      <div className="mt-2 font-mono text-[11px] text-text3">
        {character.lineCount > 0
          ? `${character.lineCount} ${character.lineCount === 1 ? "línea" : "líneas"} en la campaña`
          : "Sin líneas todavía"}
      </div>
    </Panel>
  );
}
