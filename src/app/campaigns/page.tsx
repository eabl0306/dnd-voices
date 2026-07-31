"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useState } from "react";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  Shell,
  Textarea,
} from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { usePoll } from "@/hooks/use-poll";
import type { CampaignSummary } from "@/lib/dto";
import { api } from "@/lib/http";

export default function CampaignsPage() {
  const fetcher = useCallback(() => api<CampaignSummary[]>("/api/campaigns"), []);
  const { data, error: loadError, refresh } = usePoll(fetcher);
  const { pending, error: actionError, run } = useAction();

  const [name, setName] = useState("");
  const [setting, setSetting] = useState("");

  function create(event: FormEvent) {
    event.preventDefault();
    void run("create", async () => {
      await api("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({ name, setting }),
      });
      setName("");
      setSetting("");
      await refresh();
    });
  }

  return (
    <Shell title="Campañas">
      <ErrorNote>{loadError || actionError}</ErrorNote>

      <div className="space-y-3">
        {data?.map((campaign) => (
          <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block">
            <Card className="transition hover:border-black/30 dark:hover:border-white/40">
              <div className="font-medium">{campaign.name}</div>
              <div className="text-sm opacity-60">
                {campaign._count.characters} personajes · {campaign._count.scenes} escenas
              </div>
            </Card>
          </Link>
        ))}
        {data?.length === 0 && <p className="text-sm opacity-60">Todavía no hay campañas.</p>}
      </div>

      <Card className="mt-8">
        <h2 className="mb-4 font-medium">Nueva campaña</h2>
        <form onSubmit={create} className="space-y-4">
          <Field label="Nombre">
            <Input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
          <Field
            label="Ambientación"
            hint="Tono, mundo y contexto. Claude lo usa para atribuir hablantes y para el casting de voces."
          >
            <Textarea
              name="setting"
              rows={4}
              value={setting}
              onChange={(event) => setSetting(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={pending !== "" || !name}>
            {pending === "create" ? "Creando…" : "Crear"}
          </Button>
        </form>
      </Card>
    </Shell>
  );
}
