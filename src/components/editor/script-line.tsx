"use client";

import { GlyphBox } from "@/components/ui";
import { type CharacterDto, isLineDubious, type LineDto } from "@/lib/dto";
import { characterColor, GLYPH } from "@/lib/tone";

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
  onReassign,
}: {
  line: LineDto;
  characters: readonly CharacterDto[];
  tintReview: boolean;
  onReassign: (lineId: string, characterId: string) => void;
}) {
  const dubious = isLineDubious(line);
  const speaker = characters.find((character) => character.id === line.characterId);
  const isNarration = line.isNarration || speaker?.isNarrator === true;
  const color = speaker ? characterColor(speaker.id) : "var(--text3)";

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
              aria-label={`Personaje de la intervención ${line.order + 1}`}
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
    </div>
  );
}
