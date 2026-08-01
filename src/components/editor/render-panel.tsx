"use client";

import { EditorPanel } from "@/components/editor/editor-panel";
import { AudioPlayer, Button, ErrorNote, ProgressBar } from "@/components/ui";
import { type RenderDto, isRenderSettled } from "@/lib/dto";
import { formatCount } from "@/lib/format";

const STATUS_TEXT: Record<RenderDto["status"], { label: string; color: string }> = {
  QUEUED: { label: "En espera", color: "var(--warn)" },
  RUNNING: { label: "Generando", color: "var(--warn)" },
  DONE: { label: "Listo", color: "var(--ok)" },
  FAILED: { label: "Falló", color: "var(--err)" },
};

function Player({ render }: { render: RenderDto }) {
  return (
    <div style={{ animation: "fadeUp .3s ease both" }}>
      <AudioPlayer
        src={`/api/renders/${render.id}/audio`}
        downloadName={`${render.id}.mp3`}
        initialDurationMs={render.durationMs}
        testId="render-audio"
      />

      <div className="mt-[11px] flex flex-wrap gap-[10px] font-mono text-[11.5px] text-text3">
        <span>{formatCount(render.cacheHits)} líneas desde caché</span>
        <span>·</span>
        <span>{formatCount(render.charsBilled)} caracteres facturados</span>
      </div>
    </div>
  );
}

export function RenderPanel({
  render,
  onRender,
  hint,
  busy,
}: {
  render: RenderDto | undefined;
  onRender: () => void;
  hint: string;
  busy: boolean;
}) {
  const status = render ? STATUS_TEXT[render.status] : { label: "En espera", color: "var(--warn)" };
  const running = render !== undefined && !isRenderSettled(render.status);

  return (
    <EditorPanel
      step={3}
      title="Render"
      hint={
        <span
          className="flex items-center gap-[7px] font-mono text-[11px] tracking-[0.06em] uppercase"
          style={{ color: status.color }}
        >
          <span
            aria-hidden
            className="h-[7px] w-[7px] rounded-full"
            style={{
              background: status.color,
              animation: running ? "pulseDot 1.2s ease-in-out infinite" : undefined,
            }}
          />
          {status.label}
        </span>
      }
    >
      <div className="p-[15px]">
        {running && render && (
          <div>
            <div className="mb-2 flex justify-between gap-3 font-mono text-[12px] text-text2">
              <span>
                {render.status === "QUEUED"
                  ? "En cola, esperando al worker"
                  : "Sintetizando intervenciones"}
              </span>
              <span>{render.progress} %</span>
            </div>
            <ProgressBar value={render.progress} label="Progreso del render" />
          </div>
        )}

        {render?.status === "FAILED" && <ErrorNote>{render.error ?? "El render falló."}</ErrorNote>}

        {render?.status === "DONE" && <Player render={render} />}

        {(!render || isRenderSettled(render.status)) && (
          <div className={`flex flex-wrap items-center gap-3 ${render?.status === "DONE" ? "mt-3" : ""}`}>
            <Button onClick={onRender} disabled={busy}>
              {render?.status === "DONE" ? "Volver a generar" : "Generar audio de la escena"}
            </Button>
            <span className="text-[13px] text-text3">{hint}</span>
          </div>
        )}
      </div>
    </EditorPanel>
  );
}
