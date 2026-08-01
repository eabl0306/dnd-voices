"use client";

import { useState } from "react";
import { Field, Input, Modal, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/http";

export type SceneDraft = { id?: string; title: string; rawText?: string };

export function SceneModal({
  campaignId,
  scene,
  onClose,
  onSaved,
}: {
  campaignId: string;
  scene?: SceneDraft;
  onClose: () => void;
  onSaved: (scene: { id: string }) => void | Promise<void>;
}) {
  const editing = Boolean(scene?.id);
  const [title, setTitle] = useState(scene?.title ?? "");
  const [rawText, setRawText] = useState(scene?.rawText ?? "");
  const { pending, error, run } = useAction();

  const submit = () =>
    void run("save", async () => {
      const saved = await api<{ id: string }>(
        editing ? `/api/scenes/${scene?.id}` : `/api/campaigns/${campaignId}/scenes`,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify({ title, rawText }) },
      );
      await onSaved(saved);
    });

  return (
    <Modal
      title={editing ? "Editar escena" : "Nueva escena"}
      subtitle="Puedes crearla vacía y pegar el texto después, en el editor."
      width={580}
      note={error}
      submitLabel={editing ? "Guardar cambios" : "Crear escena"}
      submitting={pending !== ""}
      submitDisabled={!title.trim()}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="flex flex-col gap-[14px]">
        <Field label="Nombre">
          <Input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="El fanal del embarcadero"
            required
          />
        </Field>
        <Field label="Texto crudo" hint="opcional">
          <Textarea
            name="rawText"
            rows={5}
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="El fanal del embarcadero se apaga cuando cruzáis la pasarela."
            className="font-mono text-[13px]"
          />
        </Field>
      </div>
    </Modal>
  );
}
