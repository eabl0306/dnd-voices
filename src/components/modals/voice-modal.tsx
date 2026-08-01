"use client";

import { useCallback, useState } from "react";
import { SettingsPanel } from "@/components/modals/settings-panel";
import { StrategyPicker, VoiceGrid } from "@/components/modals/strategy-picker";
import { Modal } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { usePoll } from "@/hooks/use-poll";
import type { CharacterDto, VoiceDto, VoiceStrategy } from "@/lib/dto";
import { api } from "@/lib/http";
import { DEFAULT_TTS_MODEL } from "@/lib/tts/model";
import type { VoiceSettings } from "@/lib/types";
import { defaultVoiceSettings } from "@/lib/voice-settings";

/** Cambia la voz de un personaje ya creado, sin tocar su ficha. */
export function VoiceModal({
  campaignId,
  character,
  onClose,
  onSaved,
}: {
  campaignId: string;
  character: CharacterDto;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [strategy, setStrategy] = useState<VoiceStrategy>(character.voiceStrategy);
  const [voiceRefId, setVoiceRefId] = useState<string | null>(character.voiceRefId);
  const [settings, setSettings] = useState<VoiceSettings>(
    character.voiceSettings ?? defaultVoiceSettings(character.isNarrator),
  );
  const { pending, error, run } = useAction();

  const fetcher = useCallback(
    () => api<VoiceDto[]>(`/api/campaigns/${campaignId}/voices`),
    [campaignId],
  );
  const { data: voices } = usePoll(fetcher);
  const hasVoices = (voices?.length ?? 0) > 0;

  // Cambiar de estrategia obliga a recastear, y el casting decide sus propios
  // ajustes; retocar los deslizadores, no. Son dos acciones distintas.
  const recasts =
    strategy !== character.voiceStrategy || voiceRefId !== character.voiceRefId;

  const submit = () =>
    void run("save", async () => {
      await api(`/api/characters/${character.id}`, {
        method: "PATCH",
        body: JSON.stringify(
          recasts
            ? {
                voiceStrategy: strategy,
                voiceRefId: strategy === "LIBRARY" ? voiceRefId : null,
                provisionVoice: true,
              }
            : { voiceSettings: settings },
        ),
      });
      await onSaved();
    });

  const model = character.voiceModel ?? DEFAULT_TTS_MODEL;

  return (
    <Modal
      title={`Voz de ${character.name}`}
      subtitle="Genera una nueva, deja que el pool decida o elige una concreta."
      width={620}
      note={
        error ??
        (recasts
          ? "Se volverá a asignar la voz y a elegir sus ajustes."
          : "El cambio no afecta al audio ya renderizado.")
      }
      submitLabel={recasts ? "Guardar voz" : "Guardar ajustes"}
      submitting={pending !== ""}
      submitDisabled={strategy === "LIBRARY" && !voiceRefId}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="flex flex-col gap-[14px]">
        <p className="font-mono text-[11.5px] text-text3">
          Ahora: {character.voiceName ?? "sin asignar"}
          {character.voiceModel && ` · ${character.voiceModel}`}
        </p>

        <StrategyPicker value={strategy} onChange={setStrategy} hasVoices={hasVoices} />

        {strategy === "LIBRARY" && (
          <VoiceGrid voices={voices ?? []} selectedId={voiceRefId} onSelect={setVoiceRefId} />
        )}

        {!recasts && (
          <div className="border-t border-line pt-[14px]">
            <span className="mb-3 block text-[13px] text-text2">Ajuste fino</span>
            <SettingsPanel model={model} value={settings} onChange={setSettings} />
          </div>
        )}
      </div>
    </Modal>
  );
}
