"use client";

import { useRef, useState } from "react";
import { EditorPanel } from "@/components/editor/editor-panel";
import { ScriptLine } from "@/components/editor/script-line";
import { GlyphBox } from "@/components/ui";
import { type CharacterDto, isLineDubious, type LineDto } from "@/lib/dto";
import { pluralize } from "@/lib/format";
import { GLYPH } from "@/lib/tone";

export function ScriptPanel({
  lines,
  characters,
  onReassign,
}: {
  lines: readonly LineDto[];
  characters: readonly CharacterDto[];
  onReassign: (lineId: string, characterId: string) => void;
}) {
  const [onlyReview, setOnlyReview] = useState(false);
  const [tintReview, setTintReview] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const cursor = useRef(0);

  const pending = lines.filter(isLineDubious);
  const narration = lines.filter((line) => line.isNarration).length;
  const visible = onlyReview ? pending : lines;

  /**
   * Salta a la siguiente dudosa dentro del contenedor.
   *
   * Con scroll manual y no `scrollIntoView`: éste arrastra la página entera y
   * el DM pierde de vista el resto del editor.
   */
  function nextReview() {
    const container = scroller.current;
    if (!container || pending.length === 0) return;

    cursor.current = cursor.current % pending.length;
    const target = pending[cursor.current];
    cursor.current += 1;
    if (!target) return;

    const row = container.querySelector<HTMLElement>(`#linea-${CSS.escape(target.id)}`);
    if (!row) return;
    container.scrollTo({ top: row.offsetTop - container.offsetTop - 8, behavior: "smooth" });
  }

  return (
    <EditorPanel
      step={2}
      title="Guion"
      hint={
        <span className="font-mono text-[11.5px] text-text3">
          {pluralize(lines.length, "intervención", "intervenciones")} · {narration} de narración
        </span>
      }
      actions={
        pending.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-[6px] rounded-[20px] border border-warn-line bg-warn-soft px-[9px] py-1 font-mono text-[11px] tracking-[0.05em] text-warn">
              <GlyphBox glyph={GLYPH.review} size={14} />
              {pluralize(pending.length, "por revisar", "por revisar")}
            </span>
            <button
              type="button"
              onClick={nextReview}
              className="rounded-[6px] border border-line2 px-[10px] py-[5px] font-mono text-[11px] tracking-[0.04em] text-text2 transition hover:bg-panel2 hover:text-text"
            >
              Siguiente {GLYPH.down}
            </button>
            <button
              type="button"
              onClick={() => setOnlyReview(!onlyReview)}
              aria-pressed={onlyReview}
              className={`rounded-[6px] border px-[10px] py-[5px] font-mono text-[11px] tracking-[0.04em] transition ${
                onlyReview
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line2 text-text2 hover:text-text"
              }`}
            >
              Solo por revisar
            </button>
            <button
              type="button"
              onClick={() => setTintReview(!tintReview)}
              aria-pressed={tintReview}
              title="Fondo ámbar en las filas dudosas"
              className="rounded-[6px] border border-line2 px-[10px] py-[5px] font-mono text-[11px] tracking-[0.04em] text-text2 transition hover:text-text"
            >
              {tintReview ? "Sin tinte" : "Con tinte"}
            </button>
          </div>
        ) : (
          <span className="flex items-center gap-[6px] rounded-[20px] border border-ok bg-ok-soft px-[9px] py-1 font-mono text-[11px] tracking-[0.05em] text-ok">
            {GLYPH.generated} Guion revisado
          </span>
        )
      }
    >
      <div ref={scroller} className="max-h-[620px] overflow-y-auto">
        {visible.map((line) => (
          <ScriptLine
            key={line.id}
            line={line}
            characters={characters}
            tintReview={tintReview}
            onReassign={onReassign}
          />
        ))}
        {visible.length === 0 && (
          <p className="px-[15px] py-5 text-[13.5px] text-text2">
            No queda ninguna intervención por revisar.
          </p>
        )}
      </div>
    </EditorPanel>
  );
}
