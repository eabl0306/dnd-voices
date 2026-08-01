"use client";

import { useCallback, useState } from "react";
import { LibraryVoiceModal } from "@/components/modals/library-voice-modal";
import { useNav } from "@/components/shell/app-shell";
import { ViewBody, ViewHeader } from "@/components/shell/view-header";
import { Button, EmptyState, ErrorNote } from "@/components/ui";
import { VoiceCard } from "@/components/voices/voice-card";
import { usePoll } from "@/hooks/use-poll";
import type { VoiceDto } from "@/lib/dto";
import { api } from "@/lib/http";
import { GLYPH } from "@/lib/tone";

export default function VoicesPage() {
  const { nav, refresh: refreshNav } = useNav();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<VoiceDto>();

  const fetcher = useCallback(() => api<VoiceDto[]>("/api/voices"), []);
  const { data: voices, error, refresh } = usePoll(fetcher);

  const reload = async () => {
    await Promise.all([refresh(), refreshNav()]);
  };

  const inPool = voices?.filter((voice) => voice.campaignId !== null).length ?? 0;

  return (
    <>
      <ViewHeader
        crumb="Cuenta"
        title="Biblioteca de voces"
        meta={voices && `${voices.length} voces · ${inPool} en el pool`}
        action={<Button onClick={() => setCreating(true)}>Añadir voz</Button>}
      />

      <ViewBody>
        <ErrorNote>{error}</ErrorNote>

        {voices?.length === 0 ? (
          <EmptyState
            title="Tu biblioteca está vacía"
            action={<Button onClick={() => setCreating(true)}>Añadir voz</Button>}
          >
            Conecta voces del proveedor por su ID para poder asignarlas a mano. También puedes
            empezar sin ninguna: la IA generará voces al dar de alta personajes y las irá dejando
            en el pool.
          </EmptyState>
        ) : (
          <p className="max-w-[620px] text-[13.5px] leading-[1.6] text-text2 text-pretty">
            Las voces viven en tu cuenta, no en la campaña: aquí conectas una voz del proveedor
            con su ID y luego la asignas a cualquier personaje. Las voces generadas por la IA
            aparecen solas en el pool de la campaña que las creó.
          </p>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {voices?.map((voice) => (
            <VoiceCard key={voice.id} voice={voice} onEdit={setEditing} />
          ))}

          {voices && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-[150px] flex-col justify-center gap-[5px] rounded-[9px] border border-dashed border-line2 p-4 text-text2 transition hover:bg-panel hover:text-text"
            >
              <span aria-hidden className="font-mono text-[15px]">
                {GLYPH.add}
              </span>
              <span className="text-[14px] font-medium">Añadir voz</span>
              <span className="text-[12.5px] text-text3">Pega el voice_id de ElevenLabs</span>
            </button>
          )}
        </div>
      </ViewBody>

      {creating && (
        <LibraryVoiceModal
          campaignId={nav?.active?.id ?? null}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await reload();
          }}
        />
      )}

      {editing && (
        <LibraryVoiceModal
          voice={editing}
          campaignId={nav?.active?.id ?? null}
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
    </>
  );
}
