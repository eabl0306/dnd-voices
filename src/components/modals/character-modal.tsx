"use client";

import { useCallback, useState } from "react";
import { StrategyPicker, VoiceGrid } from "@/components/modals/strategy-picker";
import { Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { usePoll } from "@/hooks/use-poll";
import type { CharacterDto, VoiceDto, VoiceStrategy } from "@/lib/dto";
import { api } from "@/lib/http";

export function CharacterModal({
  campaignId,
  character,
  onClose,
  onSaved,
}: {
  campaignId: string;
  character?: CharacterDto;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const editing = Boolean(character);
  const [name, setName] = useState(character?.name ?? "");
  const [isNarrator, setIsNarrator] = useState(character?.isNarrator ?? false);
  const [strategy, setStrategy] = useState<VoiceStrategy>(character?.voiceStrategy ?? "POOL");
  const [voiceRefId, setVoiceRefId] = useState<string | null>(character?.voiceRefId ?? null);
  const [description, setDescription] = useState(character?.description ?? "");
  const [backstory, setBackstory] = useState(character?.backstory ?? "");
  const { pending, error, run } = useAction();

  const fetcher = useCallback(
    () => api<VoiceDto[]>(`/api/campaigns/${campaignId}/voices`),
    [campaignId],
  );
  const { data: voices } = usePoll(fetcher);

  // Al editar, cambiar de estrategia o de voz obliga a recastear; tocar sólo
  // el trasfondo no debería regenerar una voz que ya funciona.
  const voiceChanged =
    !editing ||
    strategy !== character?.voiceStrategy ||
    voiceRefId !== (character?.voiceRefId ?? null);

  const submit = () =>
    void run("save", async () => {
      const payload = {
        name,
        isNarrator,
        voiceStrategy: strategy,
        voiceRefId: strategy === "LIBRARY" ? voiceRefId : null,
        description,
        backstory,
        provisionVoice: voiceChanged,
      };
      await api(
        editing ? `/api/characters/${character?.id}` : `/api/campaigns/${campaignId}/characters`,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      await onSaved();
    });

  return (
    <Modal
      title={editing ? `Editar ${character?.name}` : "Nuevo personaje"}
      subtitle="El narrador lee la prosa; los personajes, sus diálogos."
      width={660}
      note={error ?? (voiceChanged && editing ? "Se volverá a asignar la voz." : undefined)}
      submitLabel={editing ? "Guardar cambios" : "Añadir personaje"}
      submitting={pending !== ""}
      submitDisabled={!name.trim() || (strategy === "LIBRARY" && !voiceRefId)}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="flex flex-col gap-[14px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[14px]">
          <Field label="Nombre">
            <Input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Grum el Prestamista"
              required
            />
          </Field>
          <Field label="Papel">
            <Select
              name="role"
              value={isNarrator ? "narrator" : "character"}
              onChange={(event) => setIsNarrator(event.target.value === "narrator")}
            >
              <option value="character">Personaje</option>
              <option value="narrator">Narrador</option>
            </Select>
          </Field>
        </div>

        <div>
          <span className="mb-2 block text-[13px] text-text2">Estrategia de voz</span>
          <StrategyPicker value={strategy} onChange={setStrategy} />
        </div>

        {strategy === "LIBRARY" && (
          <VoiceGrid voices={voices ?? []} selectedId={voiceRefId} onSelect={setVoiceRefId} />
        )}

        <Field label="Descripción física y vocal">
          <Textarea
            name="description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Enorme, asmático. Habla despacio y sonríe demasiado."
          />
        </Field>
        <Field label="Trasfondo">
          <Textarea
            name="backstory"
            rows={3}
            value={backstory}
            onChange={(event) => setBackstory(event.target.value)}
            placeholder="Compró las deudas del gremio de estibadores y ahora cobra en favores."
          />
        </Field>
      </div>
    </Modal>
  );
}
