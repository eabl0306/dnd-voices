"use client";

import { useCallback, useState } from "react";
import { StrategyPicker, VoiceGrid } from "@/components/modals/strategy-picker";
import { Modal } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { usePoll } from "@/hooks/use-poll";
import type { CharacterDto, VoiceDto, VoiceStrategy } from "@/lib/dto";
import { api } from "@/lib/http";

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
  const { pending, error, run } = useAction();

  const fetcher = useCallback(
    () => api<VoiceDto[]>(`/api/campaigns/${campaignId}/voices`),
    [campaignId],
  );
  const { data: voices } = usePoll(fetcher);

  const submit = () =>
    void run("save", async () => {
      await api(`/api/characters/${character.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          voiceStrategy: strategy,
          voiceRefId: strategy === "LIBRARY" ? voiceRefId : null,
          provisionVoice: true,
        }),
      });
      await onSaved();
    });

  const current = character.voiceName ?? "sin asignar";

  return (
    <Modal
      title={`Voz de ${character.name}`}
      subtitle="Genera una nueva, deja que el pool decida o elige una concreta."
      width={620}
      note={error ?? "El cambio no afecta al audio ya renderizado."}
      submitLabel="Guardar voz"
      submitting={pending !== ""}
      submitDisabled={strategy === "LIBRARY" && !voiceRefId}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="flex flex-col gap-[14px]">
        <p className="font-mono text-[11.5px] text-text3">Ahora: {current}</p>
        <StrategyPicker value={strategy} onChange={setStrategy} />
        {strategy === "LIBRARY" && (
          <VoiceGrid voices={voices ?? []} selectedId={voiceRefId} onSelect={setVoiceRefId} />
        )}
      </div>
    </Modal>
  );
}
