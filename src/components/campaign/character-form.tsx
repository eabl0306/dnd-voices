"use client";

import { type FormEvent, useState } from "react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import type { VoiceStrategy } from "@/lib/dto";

export type NewCharacter = {
  name: string;
  description: string;
  backstory: string;
  voiceStrategy: VoiceStrategy;
};

const EMPTY: NewCharacter = {
  name: "",
  description: "",
  backstory: "",
  voiceStrategy: "POOL",
};

export function CharacterForm({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (character: NewCharacter) => Promise<void>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<NewCharacter>(EMPTY);

  const patch = (values: Partial<NewCharacter>) => setDraft({ ...draft, ...values });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(draft);
    setDraft(EMPTY);
  }

  return (
    <Card className="mt-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre">
            <Input
              name="name"
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              required
            />
          </Field>
          <Field
            label="Estrategia de voz"
            hint="Propia consume un slot de tu plan de ElevenLabs."
          >
            <Select
              name="voiceStrategy"
              value={draft.voiceStrategy}
              onChange={(event) =>
                patch({ voiceStrategy: event.target.value as VoiceStrategy })
              }
            >
              <option value="POOL">Pool compartido + ajustes</option>
              <option value="DESIGNED">Voz propia (Voice Design)</option>
            </Select>
          </Field>
        </div>
        <Field label="Descripción" hint="Edad, timbre, acento, forma de hablar.">
          <Input
            name="description"
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
        <Field label="Trasfondo">
          <Textarea
            name="backstory"
            rows={3}
            value={draft.backstory}
            onChange={(event) => patch({ backstory: event.target.value })}
          />
        </Field>
        <Button type="submit" disabled={disabled || !draft.name}>
          Añadir personaje
        </Button>
      </form>
    </Card>
  );
}
