"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RawTextPanel } from "@/components/scene/raw-text-panel";
import { RenderPanel } from "@/components/scene/render-panel";
import { ScriptPanel } from "@/components/scene/script-panel";
import { ErrorNote, Shell } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { usePoll } from "@/hooks/use-poll";
import type { CharacterDto, RenderDto, SceneDetail } from "@/lib/dto";
import { isRenderSettled } from "@/lib/dto";
import { api } from "@/lib/http";

const RENDER_POLL_MS = 2000;

type SceneData = { scene: SceneDetail; characters: CharacterDto[] };

export default function ScenePage() {
  const { id } = useParams<{ id: string }>();

  const fetcher = useCallback(async (): Promise<SceneData> => {
    const scene = await api<SceneDetail>(`/api/scenes/${id}`);
    const characters = await api<CharacterDto[]>(
      `/api/campaigns/${scene.campaignId}/characters`,
    );
    return { scene, characters };
  }, [id]);

  const { data, error: loadError, refresh } = usePoll(fetcher);
  const { pending, error: actionError, run } = useAction();

  // Borradores locales: `undefined` significa «lo que diga el servidor». Derivar
  // en render en vez de sincronizar por efecto evita renders en cascada y que
  // un refresco pise lo que el usuario está escribiendo.
  const [rawDraft, setRawDraft] = useState<string>();
  const [renderOverride, setRenderOverride] = useState<RenderDto>();

  const raw = rawDraft ?? data?.scene.rawText ?? "";
  const render = renderOverride ?? data?.scene.renders[0];

  // Sondea sólo mientras hay un render vivo: parar evita machacar la API.
  useEffect(() => {
    if (!render || isRenderSettled(render.status)) return;
    const timer = setInterval(async () => {
      const updated = await api<RenderDto>(`/api/renders/${render.id}`);
      setRenderOverride(updated);
      if (updated.status === "DONE") await refresh();
    }, RENDER_POLL_MS);
    return () => clearInterval(timer);
  }, [render, refresh]);

  const saveRawText = async () => {
    await api(`/api/scenes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ rawText: raw }),
    });
    // Vuelve a mandar el servidor: ya coincide con lo que hay en pantalla.
    setRawDraft(undefined);
  };

  const onSave = () =>
    void run("save", async () => {
      await saveRawText();
      await refresh();
    });

  const onParse = () =>
    void run("parse", async () => {
      // Se guarda antes de analizar: el backend parte del texto persistido.
      await saveRawText();
      await api(`/api/scenes/${id}/parse`, { method: "POST" });
      await refresh();
    });

  const onRender = () =>
    void run("render", async () => {
      setRenderOverride(
        await api<RenderDto>(`/api/scenes/${id}/render`, { method: "POST" }),
      );
    });

  const onReassign = (lineId: string, characterId: string) =>
    void run("reassign", async () => {
      await api(`/api/scenes/${id}/lines`, {
        method: "PATCH",
        body: JSON.stringify({ lines: [{ id: lineId, characterId, confidence: 1 }] }),
      });
      await refresh();
    });

  if (!data) {
    return (
      <Shell title="Escena">
        <ErrorNote>{loadError}</ErrorNote>
        {!loadError && <p className="text-sm opacity-60">Cargando…</p>}
      </Shell>
    );
  }

  const renderBusy = render !== undefined && !isRenderSettled(render.status);

  return (
    <Shell
      title={data.scene.title}
      back={{ href: `/campaigns/${data.scene.campaignId}`, label: "Campaña" }}
    >
      <ErrorNote>{loadError || actionError}</ErrorNote>

      <RawTextPanel
        value={raw}
        onChange={setRawDraft}
        onParse={onParse}
        onSave={onSave}
        pending={pending}
      />

      {data.scene.lines.length > 0 && (
        <ScriptPanel
          lines={data.scene.lines}
          characters={data.characters}
          onReassign={onReassign}
          onRender={onRender}
          renderDisabled={pending !== "" || renderBusy}
        />
      )}

      {render && <RenderPanel render={render} />}
    </Shell>
  );
}
