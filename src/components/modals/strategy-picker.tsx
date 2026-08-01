"use client";

import type { VoiceDto, VoiceStrategy } from "@/lib/dto";
import { GLYPH } from "@/lib/tone";

export const STRATEGIES: { value: VoiceStrategy; label: string; hint: string }[] = [
  {
    value: "DESIGNED",
    label: "Generar voz nueva",
    hint: "La IA la crea a partir del trasfondo. Tarda unos segundos.",
  },
  {
    value: "POOL",
    label: "Voz del pool",
    hint: "Reutiliza una voz ya generada en esta campaña. Instantáneo y sin coste.",
  },
  {
    value: "LIBRARY",
    label: "Elegir voz concreta",
    hint: "Tú eliges de la biblioteca y del pool. Queda fijada.",
  },
];

export function StrategyPicker({
  value,
  onChange,
  /** Sin ninguna voz registrada, reutilizar y elegir no llevan a ningún sitio. */
  hasVoices,
}: {
  value: VoiceStrategy;
  onChange: (strategy: VoiceStrategy) => void;
  hasVoices: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Estrategia de voz" className="flex flex-col gap-2">
      {STRATEGIES.map((strategy) => {
        const active = strategy.value === value;
        // Ofrecerlas con la biblioteca vacía sólo produce un casting fallido.
        const unavailable = !hasVoices && strategy.value !== "DESIGNED";
        return (
          <button
            key={strategy.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={unavailable}
            onClick={() => onChange(strategy.value)}
            className={`flex items-start gap-[10px] rounded-[8px] border px-3 py-[10px] text-left transition disabled:opacity-45 ${
              active ? "border-accent bg-accent-soft" : "border-line hover:border-line2"
            }`}
          >
            <span
              aria-hidden
              className={`mt-px grid h-[15px] w-[15px] flex-none place-items-center rounded-full border ${
                active ? "border-accent" : "border-line2"
              }`}
            >
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: active ? "var(--accent)" : "transparent" }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`mb-[2px] block text-[13.5px] ${active ? "font-semibold" : ""}`}>
                {strategy.label}
              </span>
              <span className="block text-[12.5px] leading-[1.45] text-text3">
                {unavailable
                  ? "Todavía no hay ninguna voz registrada. Genera la primera y esta opción se abrirá."
                  : strategy.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Rejilla de voces asignables; sólo se muestra con la estrategia LIBRARY. */
export function VoiceGrid({
  voices,
  selectedId,
  onSelect,
}: {
  voices: readonly VoiceDto[];
  selectedId: string | null;
  onSelect: (voiceId: string) => void;
}) {
  if (voices.length === 0) {
    return (
      <p className="rounded-[8px] border border-dashed border-line2 px-3 py-[10px] text-[13px] text-text3">
        Todavía no hay voces que elegir. Añade una en la biblioteca o genera una nueva.
      </p>
    );
  }

  return (
    <div
      className="grid max-h-[212px] grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-2 overflow-y-auto p-px"
      role="listbox"
      aria-label="Voces disponibles"
    >
      {voices.map((voice) => {
        const active = voice.id === selectedId;
        return (
          <button
            key={voice.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(voice.id)}
            className={`flex items-center gap-[9px] rounded-[8px] border px-[10px] py-[9px] transition ${
              active ? "border-accent bg-accent-soft" : "border-line hover:border-line2"
            }`}
          >
            <span
              aria-hidden
              className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full border border-line2 text-[9px] text-text2"
            >
              {GLYPH.play}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{voice.name}</span>
              <span className="block truncate font-mono text-[10.5px] text-text3">
                {voice.tags.length > 0
                  ? voice.tags.join(" · ")
                  : voice.generated
                    ? "generada por la IA"
                    : voice.model}
              </span>
            </span>
            {active && <span className="flex-none text-[11px] text-accent">{GLYPH.generated}</span>}
          </button>
        );
      })}
    </div>
  );
}
