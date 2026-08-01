"use client";

import { useRef, useState } from "react";
import { EditorPanel } from "@/components/editor/editor-panel";
import { Button, ErrorNote, ProgressBar } from "@/components/ui";
import { type RenderDto, isRenderSettled } from "@/lib/dto";
import { formatCount, formatDuration } from "@/lib/format";
import { GLYPH } from "@/lib/tone";

const STATUS_TEXT: Record<RenderDto["status"], { label: string; color: string }> = {
  QUEUED: { label: "En espera", color: "var(--warn)" },
  RUNNING: { label: "Generando", color: "var(--warn)" },
  DONE: { label: "Listo", color: "var(--ok)" },
  FAILED: { label: "Falló", color: "var(--err)" },
};

function Player({ render }: { render: RenderDto }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  const src = `/api/renders/${render.id}/audio`;
  const total = render.durationMs ?? 0;

  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (element.paused) void element.play();
    else element.pause();
  }

  return (
    <div style={{ animation: "fadeUp .3s ease both" }}>
      <div className="flex flex-wrap items-center gap-[14px] rounded-[8px] border border-line bg-panel2 p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar" : "Reproducir"}
          className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-accent text-[13px] text-accent-fg transition hover:brightness-110"
        >
          {playing ? GLYPH.pause : GLYPH.play}
        </button>

        <div className="min-w-0 flex-[1_1_220px]">
          <div className="mb-[7px] h-1 rounded-[2px] bg-panel3">
            <div
              className="h-full rounded-[2px] bg-text2"
              style={{ width: total > 0 ? `${(position / total) * 100}%` : "0%" }}
            />
          </div>
          <div className="flex justify-between font-mono text-[11.5px] text-text3">
            <span>{formatDuration(position)}</span>
            <span>{formatDuration(total)}</span>
          </div>
        </div>

        <a
          href={src}
          download
          className="flex-none rounded-[6px] border border-line2 px-3 py-2 font-mono text-[11.5px] text-text2 transition hover:bg-panel hover:text-text"
        >
          Descargar mp3
        </a>
      </div>

      {/* biome-ignore lint/a11y/useMediaCaption: el audio ES el guion que se muestra arriba */}
      <audio
        ref={audio}
        data-testid="render-audio"
        src={src}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime * 1000)}
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
