"use client";

import { useState } from "react";
import { Field, Input, Modal, Select } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import type { VoiceDto, VoiceProvider } from "@/lib/dto";
import { api } from "@/lib/http";

// v3 primero: es el que se usa por defecto. Los otros dos existen para textos
// largos donde importa más el coste que la interpretación (turbo cuesta la mitad).
const MODELS = ["eleven_v3", "eleven_multilingual_v2", "eleven_turbo_v2_5"];

/** Alta y edición de una voz del proveedor en la biblioteca de la cuenta. */
export function LibraryVoiceModal({
  voice,
  campaignId,
  onClose,
  onSaved,
  onDeleted,
}: {
  voice?: VoiceDto;
  /** Si viene, se ofrece limitar la voz a esa campaña. */
  campaignId?: string | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onDeleted?: () => void | Promise<void>;
}) {
  const editing = Boolean(voice);
  const [name, setName] = useState(voice?.name ?? "");
  const [provider, setProvider] = useState<VoiceProvider>(voice?.provider ?? "ELEVENLABS");
  const [externalId, setExternalId] = useState(voice?.externalId ?? "");
  const [model, setModel] = useState(voice?.model ?? MODELS[0] ?? "");
  const [tags, setTags] = useState(voice?.tags.join(", ") ?? "");
  const [scoped, setScoped] = useState(Boolean(voice?.campaignId));
  const { pending, error, run } = useAction();

  const submit = () =>
    void run("save", async () => {
      const payload = {
        name,
        provider,
        externalId: externalId.trim(),
        model,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        campaignId: scoped ? (campaignId ?? voice?.campaignId ?? null) : null,
      };
      await api(editing ? `/api/voices/${voice?.id}` : "/api/voices", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      await onSaved();
    });

  const canScope = Boolean(campaignId ?? voice?.campaignId);

  const remove = () =>
    void run("delete", async () => {
      const used =
        voice && voice.usedBy > 0
          ? `La usan ${voice.usedBy} personajes, que se quedarán sin voz. `
          : "";
      if (!confirm(`${used}¿Borrar "${voice?.name}" de la biblioteca?`)) return;
      await api(`/api/voices/${voice?.id}`, { method: "DELETE" });
      await onDeleted?.();
    });

  return (
    <Modal
      title={editing ? `Editar ${voice?.name}` : "Añadir voz"}
      subtitle="Conecta una voz del proveedor por su ID para poder asignarla a mano."
      width={620}
      note={error}
      submitLabel={editing ? "Guardar cambios" : "Añadir voz"}
      submitting={pending !== ""}
      submitDisabled={!name.trim() || !externalId.trim()}
      onSubmit={submit}
      onClose={onClose}
      {...(editing && onDeleted ? { destructive: { label: "Borrar voz", onClick: remove } } : {})}
    >
      <div className="flex flex-col gap-[14px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
          <Field label="Nombre en la app">
            <Input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Carmelo"
              required
            />
          </Field>
          <Field label="Proveedor">
            <Select
              name="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as VoiceProvider)}
            >
              <option value="ELEVENLABS">ElevenLabs</option>
              <option value="OPENAI">OpenAI TTS</option>
              <option value="AZURE">Azure Speech</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
          <Field label="Voice ID">
            <Input
              name="externalId"
              value={externalId}
              onChange={(event) => setExternalId(event.target.value)}
              placeholder="pNInz6obpgDQGcFmaJgB"
              className="font-mono text-[13px]"
              required
            />
          </Field>
          <Field label="Modelo">
            <Select
              name="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              {MODELS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Etiquetas" hint="separadas por comas; sólo descriptivas">
          <Input
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="barítono, seco, 50 a"
          />
        </Field>

        {canScope && (
          <label className="flex items-start gap-[10px] rounded-[8px] border border-line px-3 py-[10px]">
            <input
              type="checkbox"
              name="scoped"
              checked={scoped}
              onChange={(event) => setScoped(event.target.checked)}
              className="mt-[3px]"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px]">Sólo para esta campaña</span>
              <span className="block text-[12.5px] leading-[1.45] text-text3">
                Sin marcar, la voz queda en la biblioteca de la cuenta y se puede usar en
                cualquier campaña.
              </span>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}
