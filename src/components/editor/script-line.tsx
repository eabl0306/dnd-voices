"use client";

import { useState } from "react";
import { GlyphBox } from "@/components/ui";
import { type CharacterDto, isLineDubious, type LineDto } from "@/lib/dto";
import { formatDuration } from "@/lib/format";
import { characterColor, GLYPH } from "@/lib/tone";

/** Qué puede corregir el DM de una línea sin reanalizar la escena. */
export type LineAudioPatch = { pauseAfter?: number; fadeOutMs?: number };

/**
 * Campo numérico en ms que confirma al salir o con Enter.
 *
 * Guarda un borrador local: mandar un PATCH por cada tecla saturaría la API y
 * el refresco pisaría lo que el DM está escribiendo a medias.
 */
function MsField({
  label,
  value,
  max,
  step,
  ariaLabel,
  onCommit,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  ariaLabel: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  const [focused, setFocused] = useState(false);

  // Si el servidor cambia el valor (otro refresco, reanálisis), el borrador
  // deja de tener sentido y se descarta. Ajustar el estado durante el render —
  // y no en un efecto — evita pintar un frame con el valor viejo. Con el foco
  // dentro no se toca: el eco del commit anterior llegaría en pleno tecleo y
  // pisaría lo que el DM está escribiendo ahora.
  if (value !== lastValue) {
    setLastValue(value);
    if (!focused) setDraft(String(value));
  }

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(0, Math.min(max, Math.round(parsed)));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <label className="flex items-center gap-[5px] font-mono text-[10.5px] text-text3">
      {label}
      <input
        type="number"
        min={0}
        max={max}
        step={step}
        value={draft}
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="w-[62px] rounded-[5px] border border-line bg-panel2 px-[5px] py-[2px] text-right font-mono text-[11px] text-text"
      />
      ms
    </label>
  );
}

/**
 * Una intervención del guion.
 *
 * La atribución dudosa se marca con cuatro señales redundantes — borde, fondo,
 * subrayado discontinuo y etiqueta con glifo — porque es la única acción que el
 * DM tiene que hacer a mano, y ninguna de ellas puede depender sólo del color.
 */
export function ScriptLine({
  line,
  characters,
  tintReview,
  playing,
  onReassign,
  onTogglePlay,
  onDelete,
  onPatchAudio,
}: {
  line: LineDto;
  characters: readonly CharacterDto[];
  tintReview: boolean;
  /** Si el clip de esta línea está sonando ahora mismo. */
  playing: boolean;
  onReassign: (lineId: string, characterId: string) => void;
  onTogglePlay: (lineId: string) => void;
  onDelete: (lineId: string) => void;
  onPatchAudio: (lineId: string, patch: LineAudioPatch) => void;
}) {
  const dubious = isLineDubious(line);
  const speaker = characters.find((character) => character.id === line.characterId);
  const isNarration = line.isNarration || speaker?.isNarrator === true;
  const color = speaker ? characterColor(speaker.id) : "var(--text3)";
  const ordinal = line.order + 1;

  return (
    <div
      data-testid="script-line"
      data-dubious={dubious}
      id={`linea-${line.id}`}
      className="flex flex-wrap gap-x-[14px] gap-y-1 border-b border-line py-3 pr-[15px] pl-3 transition-colors duration-300"
      style={{
        borderLeft: `3px solid ${dubious ? "var(--warn)" : color}`,
        background: dubious && tintReview ? "var(--warn-soft)" : "transparent",
      }}
    >
      <div className="flex flex-[0_0_168px] items-start gap-[7px] pt-px">
        <span
          aria-hidden
          className="mt-[7px] h-[7px] w-[7px] flex-none"
          style={{ background: color, borderRadius: isNarration ? 0 : "50%" }}
        />
        <div className="min-w-0 flex-1">
          {isNarration ? (
            <div className="pt-[3px] font-mono text-[11px] font-medium tracking-[0.1em] uppercase text-text3">
              Narración
            </div>
          ) : (
            <select
              aria-label={`Personaje de la intervención ${ordinal}`}
              value={line.characterId ?? ""}
              onChange={(event) => onReassign(line.id, event.target.value)}
              className="w-full appearance-none rounded-[5px] px-[6px] py-[3px] font-mono text-[12px] font-medium"
              style={{
                background: dubious ? "transparent" : "var(--panel2)",
                border: dubious ? "1px dashed var(--warn)" : "1px solid var(--line)",
                color: dubious ? "var(--warn)" : "var(--text)",
              }}
            >
              <option value="">— sin asignar —</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          )}

          {dubious && (
            <div className="mt-[5px] flex items-center gap-[5px] font-mono text-[10.5px] tracking-[0.05em] uppercase text-warn">
              <GlyphBox glyph={GLYPH.review} size={13} />
              {line.characterId ? "Atribución dudosa" : "Sin asignar"}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-[1_1_320px]">
        {line.delivery && (
          <span className="mr-2 inline-block rounded-[20px] border border-line2 px-[7px] py-px align-[1px] font-mono text-[11px] text-text3">
            {line.delivery}
          </span>
        )}
        <span
          className={`text-[14.5px] leading-[1.6] text-pretty ${
            isNarration ? "font-serif italic text-text2" : "font-sans text-text"
          }`}
          style={
            dubious
              ? {
                  textDecoration: "underline dashed var(--warn-line)",
                  textUnderlineOffset: 4,
                }
              : undefined
          }
        >
          {line.text}
        </span>
      </div>

      <div className="flex flex-none flex-col items-end gap-[6px]">
        <div className="flex items-center gap-[6px]">
          {line.durationMs !== null && (
            <span className="font-mono text-[10.5px] text-text3">
              {formatDuration(line.durationMs)}
            </span>
          )}
          {line.hasAudio && (
            <button
              type="button"
              onClick={() => onTogglePlay(line.id)}
              aria-label={
                playing
                  ? `Pausar la intervención ${ordinal}`
                  : `Escuchar la intervención ${ordinal}`
              }
              aria-pressed={playing}
              className={`grid h-[24px] w-[24px] place-items-center rounded-full border text-[10px] transition ${
                playing
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-text2 hover:border-accent hover:text-accent"
              }`}
            >
              {playing ? GLYPH.pause : GLYPH.play}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(line.id)}
            aria-label={`Quitar la intervención ${ordinal}`}
            className="grid h-[24px] w-[24px] place-items-center rounded-[6px] border border-line text-[11px] text-text3 transition hover:border-err hover:text-err"
          >
            {GLYPH.close}
          </button>
        </div>

        <MsField
          label="pausa"
          value={line.pauseAfter}
          max={10_000}
          step={50}
          ariaLabel={`Pausa tras la intervención ${ordinal} en milisegundos`}
          onCommit={(pauseAfter) => onPatchAudio(line.id, { pauseAfter })}
        />
        <MsField
          label="decaimiento"
          value={line.fadeOutMs}
          max={2_000}
          step={20}
          ariaLabel={`Decaimiento de la intervención ${ordinal} en milisegundos`}
          onCommit={(fadeOutMs) => onPatchAudio(line.id, { fadeOutMs })}
        />
      </div>
    </div>
  );
}
