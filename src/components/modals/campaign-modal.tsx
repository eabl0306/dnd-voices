"use client";

import { useState } from "react";
import { Field, Input, Modal, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/http";

export type CampaignDraft = { id?: string; name: string; setting: string };

export function CampaignModal({
  campaign,
  onClose,
  onSaved,
}: {
  campaign?: CampaignDraft;
  onClose: () => void;
  onSaved: (campaign: { id: string }) => void | Promise<void>;
}) {
  const editing = Boolean(campaign?.id);
  const [name, setName] = useState(campaign?.name ?? "");
  const [setting, setSetting] = useState(campaign?.setting ?? "");
  const { pending, error, run } = useAction();

  const submit = () =>
    void run("save", async () => {
      const saved = await api<{ id: string }>(
        editing ? `/api/campaigns/${campaign?.id}` : "/api/campaigns",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify({ name, setting }) },
      );
      await onSaved(saved);
    });

  return (
    <Modal
      title={editing ? "Editar campaña" : "Nueva campaña"}
      subtitle="Los personajes y las escenas cuelgan de la campaña."
      width={520}
      note={error}
      submitLabel={editing ? "Guardar cambios" : "Crear campaña"}
      submitting={pending !== ""}
      submitDisabled={!name.trim()}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="flex flex-col gap-[14px]">
        <Field label="Nombre">
          <Input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Los muelles de Vantre"
            required
          />
        </Field>
        <Field label="Ambientación" hint="tono y mundo; alimenta a la IA">
          <Textarea
            name="setting"
            rows={4}
            value={setting}
            onChange={(event) => setSetting(event.target.value)}
            placeholder="Puerto industrial en decadencia. Tono seco, poca magia, mucha deuda."
          />
        </Field>
      </div>
    </Modal>
  );
}
