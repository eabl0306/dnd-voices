"use client";

import { useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import { GLYPH } from "@/lib/tone";

const SKIP_MS = 10_000;

/**
 * Reproductor con barra de posición de verdad.
 *
 * La barra es un `input type="range"`, no un div decorativo: da clic, arrastre
 * y flechas del teclado gratis. Sólo funciona si la ruta que sirve el audio
 * responde a peticiones `Range` con 206 — sin eso el navegador ignora cualquier
 * cambio de `currentTime`.
 */
export function AudioPlayer({
  src,
  downloadName,
  initialDurationMs,
  testId,
}: {
  src: string;
  /** Con valor, se muestra el enlace de descarga con ese nombre de fichero. */
  downloadName?: string | undefined;
  /** Duración conocida de antemano, hasta que los metadatos digan la real. */
  initialDurationMs?: number | null | undefined;
  testId?: string | undefined;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(initialDurationMs ?? 0);
  // Mientras se arrastra la barra, el timeupdate del audio no debe pisar el
  // pulgar: el tirón visual hace creer que el seek no funciona.
  const scrubbing = useRef(false);

  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (element.paused) void element.play();
    else element.pause();
  }

  function seek(ms: number) {
    const element = audio.current;
    if (!element) return;
    const clamped = Math.max(0, Math.min(duration, ms));
    element.currentTime = clamped / 1000;
    setPosition(clamped);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-[14px] gap-y-2 rounded-[8px] border border-line bg-panel2 p-3">
      <div className="flex flex-none items-center gap-[6px]">
        <button
          type="button"
          onClick={() => seek(position - SKIP_MS)}
          aria-label="Retroceder 10 segundos"
          className="rounded-[6px] border border-line px-[8px] py-[5px] font-mono text-[11px] text-text2 transition hover:border-line2 hover:text-text"
        >
          −10s
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar" : "Reproducir"}
          className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-accent text-[13px] text-accent-fg transition hover:brightness-110"
        >
          {playing ? GLYPH.pause : GLYPH.play}
        </button>
        <button
          type="button"
          onClick={() => seek(position + SKIP_MS)}
          aria-label="Avanzar 10 segundos"
          className="rounded-[6px] border border-line px-[8px] py-[5px] font-mono text-[11px] text-text2 transition hover:border-line2 hover:text-text"
        >
          +10s
        </button>
      </div>

      <div className="min-w-0 flex-[1_1_220px]">
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={1000}
          value={Math.min(position, duration)}
          disabled={duration === 0}
          aria-label="Posición de reproducción"
          onChange={(event) => seek(Number(event.target.value))}
          onPointerDown={() => {
            scrubbing.current = true;
          }}
          onPointerUp={() => {
            scrubbing.current = false;
          }}
          // En táctil, un arrastre diagonal se convierte en scroll y el gesto
          // termina en pointercancel, no en pointerup: sin esto la barra se
          // quedaba congelada ignorando los timeupdate para siempre.
          onPointerCancel={() => {
            scrubbing.current = false;
          }}
          onLostPointerCapture={() => {
            scrubbing.current = false;
          }}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between font-mono text-[11.5px] text-text3">
          <span>{formatDuration(position)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {downloadName && (
        <a
          href={src}
          download={downloadName}
          className="flex-none rounded-[6px] border border-line2 px-3 py-2 font-mono text-[11.5px] text-text2 transition hover:bg-panel hover:text-text"
        >
          Descargar mp3
        </a>
      )}

      {/* biome-ignore lint/a11y/useMediaCaption: el audio ES el texto que se muestra al lado */}
      <audio
        ref={audio}
        data-testid={testId}
        src={src}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => {
          if (!scrubbing.current) setPosition(event.currentTarget.currentTime * 1000);
        }}
        onDurationChange={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds)) setDuration(Math.round(seconds * 1000));
        }}
      />
    </div>
  );
}
