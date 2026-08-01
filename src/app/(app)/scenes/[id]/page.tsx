"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RawTextPanel } from "@/components/editor/raw-text-panel";
import { RenderPanel } from "@/components/editor/render-panel";
import { ScriptPanel } from "@/components/editor/script-panel";
import { useNav } from "@/components/shell/app-shell";
import { ViewHeader } from "@/components/shell/view-header";
import { ErrorNote } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { usePoll } from "@/hooks/use-poll";
import type { CharacterDto, RenderDto, SceneDetail } from "@/lib/dto";
import { isLineDubious, isRenderSettled } from "@/lib/dto";
import { pluralize } from "@/lib/format";
import { api } from "@/lib/http";

const RENDER_POLL_MS = 2000;

type SceneData = { scene: SceneDetail; characters: CharacterDto[] };

export default function ScenePage() {
  const { id } = useParams<{ id: string }>();
  const { nav, refresh: refreshNav } = useNav();

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
    // clearInterval no cancela una petición ya en vuelo: sin esta bandera, una
    // respuesta rezagada del render anterior resucitaría su estado y taparía
    // al render recién encolado.
    let alive = true;
    const timer = setInterval(async () => {
      const updated = await api<RenderDto>(`/api/renders/${render.id}`);
      if (!alive) return;
      setRenderOverride(updated);
      if (updated.status === "DONE") await refresh();
    }, RENDER_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [render, refresh]);

  const saveRawText = async () => {
    await api(`/api/scenes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ rawText: raw }),
    });
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
      await Promise.all([refresh(), refreshNav()]);
    });

  const onRender = () =>
    void run("render", async () => {
      setRenderOverride(await api<RenderDto>(`/api/scenes/${id}/render`, { method: "POST" }));
    });

  const onReassign = (lineId: string, characterId: string) =>
    void run("reassign", async () => {
      await api(`/api/scenes/${id}/lines`, {
        method: "PATCH",
        body: JSON.stringify({ lines: [{ id: lineId, characterId, confidence: 1 }] }),
      });
      await Promise.all([refresh(), refreshNav()]);
    });

  const onPatchAudio = (
    lineId: string,
    patch: { pauseAfter?: number; fadeOutMs?: number; text?: string },
  ) =>
    void run("line-audio", async () => {
      await api(`/api/scenes/${id}/lines`, {
        method: "PATCH",
        body: JSON.stringify({ lines: [{ id: lineId, ...patch }] }),
      });
      await refresh();
    });

  const onRegenerateLine = (lineId: string) =>
    void run("line-render", async () => {
      await api(`/api/lines/${lineId}/audio`, { method: "POST" });
      await refresh();
    });

  const onDeleteLine = (lineId: string) =>
    void run("delete-line", async () => {
      if (!confirm("¿Quitar esta intervención del guion? Desaparecerá del próximo audio.")) {
        return;
      }
      await api(`/api/lines/${lineId}`, { method: "DELETE" });
      await Promise.all([refresh(), refreshNav()]);
    });

  if (!data) {
    return (
      <>
        <ViewHeader crumb="Escena" title="Cargando…" />
        <div className="p-6">
          <ErrorNote>{loadError}</ErrorNote>
        </div>
      </>
    );
  }

  const { scene, characters } = data;
  const dubious = scene.lines.filter(isLineDubious).length;
  const renderBusy = render !== undefined && !isRenderSettled(render.status);
  const withoutVoice = characters.filter((c) => c.voiceStatus !== "READY").length;

  return (
    <>
      <ViewHeader
        crumb={`${nav?.active?.name ?? "Campaña"} · Escena`}
        title={scene.title}
        meta={
          scene.lines.length > 0 &&
          `${pluralize(scene.lines.length, "línea", "líneas")}${dubious > 0 ? ` · ${dubious} por revisar` : ""}`
        }
      />

      <section className="flex flex-col gap-4 px-6 pt-[22px] pb-24">
        <ErrorNote>{loadError || actionError}</ErrorNote>

        <RawTextPanel
          value={raw}
          onChange={setRawDraft}
          onParse={onParse}
          onSave={onSave}
          pending={pending}
        />

        {scene.lines.length > 0 && (
          <ScriptPanel
            lines={scene.lines}
            characters={characters}
            onReassign={onReassign}
            onDeleteLine={onDeleteLine}
            onPatchAudio={onPatchAudio}
            onRegenerate={onRegenerateLine}
            busy={pending === "line-render"}
          />
        )}

        {scene.lines.length > 0 && (
          <RenderPanel
            render={render}
            onRender={onRender}
            // Ajustar una pausa hace commit en el blur: si eso contara como
            // ocupado, el clic en «Generar audio» que provocó ese blur caería
            // sobre un botón recién deshabilitado y se perdería.
            busy={(pending !== "" && pending !== "line-audio") || renderBusy}
            hint={
              withoutVoice > 0
                ? `${withoutVoice} ${withoutVoice === 1 ? "personaje sigue" : "personajes siguen"} sin voz lista.`
                : "Las líneas ya generadas se sirven de caché y no se vuelven a facturar."
            }
          />
        )}
      </section>
    </>
  );
}
