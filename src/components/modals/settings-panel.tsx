"use client";

import {
  adjustableSettings,
  SETTING_HINT,
  SETTING_LABEL,
  SETTING_RANGE,
  type SettingKey,
} from "@/lib/voice-settings";
import type { VoiceSettings } from "@/lib/types";

/**
 * Ajuste fino de la voz de un personaje.
 *
 * Sólo se muestran los controles que el modelo respeta de verdad: v3 ignora
 * velocidad, estilo y fidelidad —comprobado comparando la duración de la
 * salida— y enseñarlos haría creer que hacen algo.
 */
export function SettingsPanel({
  model,
  value,
  onChange,
}: {
  model: string;
  value: VoiceSettings;
  onChange: (settings: VoiceSettings) => void;
}) {
  const keys = adjustableSettings(model);
  const ignored = (["stability", "similarityBoost", "style", "speed"] as SettingKey[]).filter(
    (key) => !keys.includes(key),
  );

  return (
    <div className="flex flex-col gap-[14px]">
      {keys.map((key) => {
        const range = SETTING_RANGE[key];
        return (
          <label key={key} className="block">
            <span className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-text2">{SETTING_LABEL[key]}</span>
              <span className="font-mono text-[11.5px] text-text3">
                {value[key].toFixed(2).replace(".", ",")}
              </span>
            </span>
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={value[key]}
              onChange={(event) =>
                onChange({ ...value, [key]: Number(event.target.value) })
              }
              className="w-full accent-[var(--accent)]"
            />
            <span className="mt-1 block text-[12px] leading-[1.45] text-text3">
              {SETTING_HINT[key]}
            </span>
          </label>
        );
      })}

      {ignored.length > 0 && (
        <p className="rounded-[7px] border border-line bg-panel2 px-[10px] py-2 text-[12px] leading-[1.45] text-text3">
          Este modelo ignora {ignored.map((key) => SETTING_LABEL[key].toLowerCase()).join(", ")}.
          Cambia la voz a un modelo v2 si necesitas ese control.
        </p>
      )}
    </div>
  );
}
