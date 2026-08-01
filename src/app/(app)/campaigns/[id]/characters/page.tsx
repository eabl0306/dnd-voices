"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { CharacterCard } from "@/components/characters/character-card";
import { CharacterModal } from "@/components/modals/character-modal";
import { VoiceModal } from "@/components/modals/voice-modal";
import { useNav } from "@/components/shell/app-shell";
import { ViewBody, ViewHeader } from "@/components/shell/view-header";
import { Button, Chip, EmptyState, ErrorNote } from "@/components/ui";
import { usePoll } from "@/hooks/use-poll";
import type { CharacterDto } from "@/lib/dto";
import { api } from "@/lib/http";
import { GLYPH, TONE_TEXT } from "@/lib/tone";

const LEGEND = [
  { glyph: GLYPH.generated, label: "Generada", tone: "ok" as const },
  { glyph: GLYPH.pool, label: "Del pool", tone: "accent" as const },
  { glyph: GLYPH.library, label: "A mano", tone: "accent" as const },
  { glyph: GLYPH.assigning, label: "Asignando", tone: "warn" as const },
  { glyph: GLYPH.failed, label: "Fallida", tone: "err" as const },
];

/** El casting corre en el worker: se refresca hasta que todo el reparto esté listo. */
const POLL_MS = 4000;

export default function CharactersPage() {
  const { id } = useParams<{ id: string }>();
  const { nav, refresh: refreshNav } = useNav();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CharacterDto>();
  const [changingVoice, setChangingVoice] = useState<CharacterDto>();

  const fetcher = useCallback(
    () => api<CharacterDto[]>(`/api/campaigns/${id}/characters`),
    [id],
  );
  const { data: characters, error, refresh } = usePoll(fetcher, POLL_MS);

  const reload = async () => {
    await Promise.all([refresh(), refreshNav()]);
  };

  const failed = characters?.filter((c) => c.voiceStatus === "FAILED").length ?? 0;

  return (
    <>
      <ViewHeader
        crumb={nav?.active?.name ?? "Campaña"}
        title="Personajes"
        meta={
          characters &&
          `${characters.length} personajes${failed > 0 ? ` · ${failed} fallida${failed === 1 ? "" : "s"}` : ""}`
        }
        action={<Button onClick={() => setCreating(true)}>Nuevo personaje</Button>}
      />

      <ViewBody>
        <ErrorNote>{error}</ErrorNote>

        {characters?.length === 0 && (
          <EmptyState
            title="Aún no hay reparto"
            action={<Button onClick={() => setCreating(true)}>Añadir el primer personaje</Button>}
          >
            Empieza por el narrador: es quien lee toda la prosa. Después añade a los personajes
            con diálogo y asigna una voz a cada uno.
          </EmptyState>
        )}

        {characters && characters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {LEGEND.map((entry) => (
              <Chip key={entry.label} className={TONE_TEXT[entry.tone]}>
                <span aria-hidden>{entry.glyph}</span>
                {entry.label}
              </Chip>
            ))}
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(292px,1fr))] gap-3">
          {characters?.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={setEditing}
              onChangeVoice={setChangingVoice}
            />
          ))}

          {characters && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-[120px] flex-col justify-center gap-[5px] rounded-[9px] border border-dashed border-line2 px-[15px] py-[14px] text-text2 transition hover:bg-panel hover:text-text"
            >
              <span aria-hidden className="font-mono text-[15px]">
                {GLYPH.add}
              </span>
              <span className="text-[14px] font-medium">Nuevo personaje</span>
              <span className="text-[12.5px] text-text3">
                Nombre, trasfondo y estrategia de voz
              </span>
            </button>
          )}
        </div>
      </ViewBody>

      {creating && (
        <CharacterModal
          campaignId={id}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await reload();
          }}
        />
      )}

      {editing && (
        <CharacterModal
          campaignId={id}
          character={editing}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await reload();
          }}
          onDeleted={async () => {
            setEditing(undefined);
            await reload();
          }}
        />
      )}

      {changingVoice && (
        <VoiceModal
          campaignId={id}
          character={changingVoice}
          onClose={() => setChangingVoice(undefined)}
          onSaved={async () => {
            setChangingVoice(undefined);
            await reload();
          }}
        />
      )}
    </>
  );
}
