"use client";

import { EditorPanel } from "@/components/editor/editor-panel";
import { Button } from "@/components/ui";
import { formatCount } from "@/lib/format";

const PLACEHOLDER = `El fanal del embarcadero se apaga cuando cruzáis la pasarela.

VEX: No os separéis. Este sitio cobra por cada paso que se da a solas.`;

export function RawTextPanel({
  value,
  onChange,
  onParse,
  onSave,
  pending,
}: {
  value: string;
  onChange: (value: string) => void;
  onParse: () => void;
  onSave: () => void;
  pending: string;
}) {
  const busy = pending !== "";

  return (
    <EditorPanel
      step={1}
      title="Texto crudo"
      hint={<span className="text-[12px] text-text3">Pega la escena tal cual la escribiste.</span>}
    >
      <textarea
        aria-label="Texto de la escena"
        rows={8}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={PLACEHOLDER}
        className="block w-full resize-y border-0 bg-panel px-[15px] py-[14px] font-mono text-[13.5px] leading-[1.75] outline-none"
      />
      <div className="flex flex-wrap items-center gap-[10px] border-t border-line bg-panel2 px-[15px] py-[11px]">
        <Button onClick={onParse} disabled={busy || !value.trim()}>
          {pending === "parse" ? "Analizando…" : "Identificar hablantes"}
        </Button>
        <Button variant="secondary" onClick={onSave} disabled={busy}>
          {pending === "save" ? "Guardando…" : "Guardar sin analizar"}
        </Button>
        <div className="flex-1" />
        <span className="font-mono text-[11.5px] text-text3">
          {formatCount(value.length)} caracteres
        </span>
      </div>
    </EditorPanel>
  );
}
