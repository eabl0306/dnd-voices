"use client";

import { useEffect, useRef, useState } from "react";
import { Chip, MonoButton, Panel } from "@/components/ui";
import type { VoiceDto } from "@/lib/dto";
import { pluralize } from "@/lib/format";
import { messageOf } from "@/lib/http";
import { GLYPH } from "@/lib/tone";

const PROVIDER_LABEL: Record<VoiceDto["provider"], string> = {
  ELEVENLABS: "ElevenLabs",
  OPENAI: "OpenAI TTS",
  AZURE: "Azure Speech",
};

// Borrar vive dentro del modal de edición: en el pie de la tarjeta, el diseño
// deja una sola línea y un segundo botón la parte en dos.
export function VoiceCard({
  voice,
  onEdit,
}: {
  voice: VoiceDto;
  onEdit: (voice: VoiceDto) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const objectUrl = useRef<string | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  /**
   * La muestra se pide con fetch y no con `<audio src>` a propósito: así se
   * puede leer el `{ error }` que devuelve la API y enseñar el motivo real. El
   * elemento de audio sólo sabe decir que algo falló.
   */
  async function toggle() {
    const element = audio.current;
    if (!element) return;

    if (!element.paused) {
      element.pause();
      return;
    }

    setError("");
    if (!objectUrl.current) {
      setLoading(true);
      try {
        const response = await fetch(`/api/voices/${voice.id}/preview`);
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          const detail =
            body && typeof body === "object" && "error" in body && typeof body.error === "string"
              ? body.error
              : `Error ${response.status}`;
          throw new Error(detail);
        }
        objectUrl.current = URL.createObjectURL(await response.blob());
        element.src = objectUrl.current;
      } catch (cause) {
        setError(messageOf(cause));
        return;
      } finally {
        setLoading(false);
      }
    }

    await element.play().catch((cause: unknown) => setError(messageOf(cause)));
  }

  const subtitle = loading
    ? "Generando muestra…"
    : playing
      ? "Reproduciendo…"
      : voice.tags.length > 0
        ? voice.tags.join(" · ")
        : "Sin etiquetas";

  return (
    <Panel
      className={`flex flex-col gap-[10px] p-[15px] transition-colors ${playing ? "border-accent" : ""}`}
    >
      <div className="flex items-start gap-[10px]">
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-label={playing ? `Parar prueba de ${voice.name}` : `Probar ${voice.name}`}
          className={`grid h-8 w-8 flex-none place-items-center rounded-full border text-[10px] transition disabled:opacity-45 ${
            playing ? "border-accent text-accent" : "border-line2 text-text2 hover:border-accent"
          }`}
        >
          {playing ? GLYPH.pause : GLYPH.play}
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="mb-[3px] truncate text-[14.5px] font-semibold">{voice.name}</h3>
          <div
            className={`truncate font-mono text-[11.5px] ${playing ? "text-accent" : "text-text3"}`}
          >
            {subtitle}
          </div>
        </div>

        <Chip tone={voice.generated ? "ok" : "accent"}>
          {voice.generated ? "Generada por IA" : PROVIDER_LABEL[voice.provider]}
        </Chip>
      </div>

      {/* Sin truncar: un error que no se puede leer no sirve de nada. */}
      {error && (
        <p
          role="alert"
          className="rounded-[7px] border border-line bg-err-soft px-[10px] py-2 text-[12px] leading-[1.45] text-err"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-[5px] rounded-[7px] border border-line bg-panel2 px-[10px] py-[9px] font-mono text-[11px]">
        <div className="flex gap-2">
          <span className="flex-[0_0_62px] text-text3">voice_id</span>
          <span className="min-w-0 flex-1 truncate text-text2">{voice.externalId}</span>
        </div>
        <div className="flex gap-2">
          <span className="flex-[0_0_62px] text-text3">modelo</span>
          <span className="min-w-0 flex-1 truncate text-text2">{voice.model}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
        <span className={voice.campaignId ? "text-accent" : "text-text2"}>
          {voice.campaignId ? "Pool de la campaña" : "Biblioteca"}
        </span>
        <span className="text-text3">·</span>
        <span className={voice.usedBy > 0 ? "text-text2" : "text-text3"}>
          {voice.usedBy > 0
            ? `Usada por ${pluralize(voice.usedBy, "personaje", "personajes")}`
            : "Sin usar"}
        </span>
        <span className="flex-1" />
        <MonoButton onClick={() => onEdit(voice)}>Editar</MonoButton>
      </div>

      {/* biome-ignore lint/a11y/useMediaCaption: muestra de voz, sin contenido que transcribir */}
      <audio
        ref={audio}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </Panel>
  );
}
