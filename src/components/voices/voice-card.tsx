"use client";

import { useRef, useState } from "react";
import { Chip, MonoButton, Panel } from "@/components/ui";
import type { VoiceDto } from "@/lib/dto";
import { pluralize } from "@/lib/format";
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
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const element = audio.current;
    if (!element) return;
    setFailed(false);
    if (element.paused) void element.play().catch(() => setFailed(true));
    else element.pause();
  }

  const subtitle = failed
    ? "No se pudo generar la prueba"
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
          aria-label={playing ? `Parar prueba de ${voice.name}` : `Probar ${voice.name}`}
          className={`grid h-8 w-8 flex-none place-items-center rounded-full border text-[10px] transition ${
            playing ? "border-accent text-accent" : "border-line2 text-text2 hover:border-accent"
          }`}
        >
          {playing ? GLYPH.pause : GLYPH.play}
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="mb-[3px] truncate text-[14.5px] font-semibold">{voice.name}</h3>
          <div
            className={`truncate font-mono text-[11.5px] ${
              failed ? "text-err" : playing ? "text-accent" : "text-text3"
            }`}
          >
            {subtitle}
          </div>
        </div>

        <Chip tone={voice.generated ? "ok" : "accent"}>
          {voice.generated ? "Generada por IA" : PROVIDER_LABEL[voice.provider]}
        </Chip>
      </div>

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
          {voice.usedBy > 0 ? `Usada por ${pluralize(voice.usedBy, "personaje", "personajes")}` : "Sin usar"}
        </span>
        <span className="flex-1" />
        <MonoButton onClick={() => onEdit(voice)}>Editar</MonoButton>
      </div>

      {/* biome-ignore lint/a11y/useMediaCaption: muestra de voz, sin contenido que transcribir */}
      <audio
        ref={audio}
        src={`/api/voices/${voice.id}/preview`}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setFailed(true);
        }}
      />
    </Panel>
  );
}
