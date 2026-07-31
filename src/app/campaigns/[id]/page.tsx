"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { CharacterCard } from "@/components/campaign/character-card";
import {
  CharacterForm,
  type NewCharacter,
} from "@/components/campaign/character-form";
import { SceneList } from "@/components/campaign/scene-list";
import { ErrorNote, Section, Shell } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { usePoll } from "@/hooks/use-poll";
import type { CharacterDto, SceneSummary } from "@/lib/dto";
import { api } from "@/lib/http";

/** El casting corre en el worker: se refresca hasta que todo el reparto esté listo. */
const POLL_MS = 5000;

type CampaignData = { characters: CharacterDto[]; scenes: SceneSummary[] };

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();

  const fetcher = useCallback(async (): Promise<CampaignData> => {
    const [characters, scenes] = await Promise.all([
      api<CharacterDto[]>(`/api/campaigns/${id}/characters`),
      api<SceneSummary[]>(`/api/campaigns/${id}/scenes`),
    ]);
    return { characters, scenes };
  }, [id]);

  const { data, error: loadError, refresh } = usePoll(fetcher, POLL_MS);
  const { pending, error: actionError, run } = useAction();

  const addCharacter = (character: NewCharacter) =>
    run("character", async () => {
      await api(`/api/campaigns/${id}/characters`, {
        method: "POST",
        body: JSON.stringify(character),
      });
      await refresh();
    });

  const addScene = (title: string) =>
    run("scene", async () => {
      await api(`/api/campaigns/${id}/scenes`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      await refresh();
    });

  const recast = (characterId: string) =>
    void run("recast", async () => {
      await api(`/api/characters/${characterId}/voice`, { method: "POST" });
      await refresh();
    });

  return (
    <Shell title="Campaña" back={{ href: "/campaigns", label: "Campañas" }}>
      <ErrorNote>{loadError || actionError}</ErrorNote>

      <Section title="Reparto">
        <div className="space-y-2">
          {data?.characters.map((character) => (
            <CharacterCard key={character.id} character={character} onRecast={recast} />
          ))}
        </div>
        <CharacterForm onSubmit={addCharacter} disabled={pending === "character"} />
      </Section>

      <Section title="Escenas">
        <SceneList
          scenes={data?.scenes ?? []}
          onCreate={addScene}
          disabled={pending === "scene"}
        />
      </Section>
    </Shell>
  );
}
