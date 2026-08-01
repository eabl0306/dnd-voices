"use client";

import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { SceneModal } from "@/components/modals/scene-modal";
import { useNav } from "@/components/shell/app-shell";
import { ViewBody, ViewHeader } from "@/components/shell/view-header";
import { Button, ErrorNote, GlyphBox, MonoLabel, Panel } from "@/components/ui";
import { usePoll } from "@/hooks/use-poll";
import type { SceneSummary } from "@/lib/dto";
import { api } from "@/lib/http";
import { GLYPH, type Tone, TONE_TEXT } from "@/lib/tone";

function reviewState(scene: SceneSummary): { glyph: string; label: string; tone: Tone } {
  if (scene.lineCount === 0) return { glyph: GLYPH.dot, label: "Sin analizar", tone: "neutral" };
  if (scene.pendingReview > 0) {
    return { glyph: GLYPH.review, label: `${scene.pendingReview} por revisar`, tone: "warn" };
  }
  return { glyph: GLYPH.generated, label: "Revisada", tone: "ok" };
}

export default function ScenesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { nav, refresh: refreshNav } = useNav();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SceneSummary>();

  const fetcher = useCallback(() => api<SceneSummary[]>(`/api/campaigns/${id}/scenes`), [id]);
  const { data: scenes, error, refresh } = usePoll(fetcher);

  const pending = scenes?.reduce((total, scene) => total + scene.pendingReview, 0) ?? 0;

  return (
    <>
      <ViewHeader
        crumb={nav?.active?.name ?? "Campaña"}
        title="Escenas"
        meta={
          scenes &&
          `${scenes.length} escenas${pending > 0 ? ` · ${pending} líneas por revisar` : ""}`
        }
        action={<Button onClick={() => setCreating(true)}>Nueva escena</Button>}
      />

      <ViewBody>
        <ErrorNote>{error}</ErrorNote>

        <Panel className="overflow-hidden">
          <div className="flex flex-wrap gap-x-[14px] gap-y-[6px] border-b border-line bg-panel2 px-[15px] py-[9px]">
            <span className="min-w-0 flex-[1_1_180px]">
              <MonoLabel>Escena</MonoLabel>
            </span>
            <span className="flex flex-none gap-[14px]">
              <span className="w-[72px]">
                <MonoLabel>Líneas</MonoLabel>
              </span>
              <span className="w-[120px]">
                <MonoLabel>Revisión</MonoLabel>
              </span>
              <span className="w-[96px]">
                <MonoLabel>Audio</MonoLabel>
              </span>
              {/* Hueco del botón «Editar» de cada fila: sin él, las cabeceras
                  quedan desplazadas respecto a sus columnas. */}
              <span aria-hidden className="w-[62px]" />
            </span>
          </div>

          {scenes?.map((scene) => {
            const review = reviewState(scene);
            return (
              <div
                key={scene.id}
                className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px] border-b border-line px-[15px] py-3 transition hover:bg-panel2"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/scenes/${scene.id}`)}
                  className="min-w-0 flex-[1_1_180px] text-left"
                >
                  <span className="mb-[3px] block text-[14px] font-medium">{scene.title}</span>
                  <span className="block truncate text-[12.5px] text-text3">{scene.excerpt}</span>
                </button>

                <span className="flex flex-none items-center gap-[14px]">
                  <span className="w-[72px] font-mono text-[12.5px] text-text2">
                    {scene.lineCount > 0 ? `${scene.lineCount} líneas` : "—"}
                  </span>
                  <span
                    className={`flex w-[120px] items-center gap-[6px] font-mono text-[11px] tracking-[0.04em] ${TONE_TEXT[review.tone]}`}
                  >
                    <GlyphBox glyph={review.glyph} size={14} />
                    {review.label}
                  </span>
                  <span
                    className={`w-[96px] font-mono text-[11px] tracking-[0.04em] ${
                      scene.hasAudio ? "text-ok" : "text-text3"
                    }`}
                  >
                    {scene.hasAudio ? "Renderizada" : "Sin generar"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(scene)}
                    className="flex-none rounded-[6px] border border-line px-[9px] py-[5px] font-mono text-[11px] text-text2 transition hover:border-line2 hover:text-text"
                  >
                    Editar
                  </button>
                </span>
              </div>
            );
          })}

          {scenes?.length === 0 && (
            <div className="px-[15px] py-5 text-[13.5px] leading-[1.6] text-text2">
              Todavía no hay escenas en esta campaña. La primera se crea vacía y se abre en el
              editor.
            </div>
          )}

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-[9px] px-[15px] py-[13px] text-[14px] font-medium text-text2 transition hover:bg-panel2 hover:text-text"
          >
            <span aria-hidden className="font-mono">
              {GLYPH.add}
            </span>
            Nueva escena
          </button>
        </Panel>

        <p className="max-w-[520px] text-[13px] leading-[1.55] text-text3">
          Crear una escena la abre vacía en el editor: pegas el texto y lanzas la identificación
          de hablantes.
        </p>
      </ViewBody>

      {creating && (
        <SceneModal
          campaignId={id}
          onClose={() => setCreating(false)}
          onSaved={async (scene) => {
            setCreating(false);
            await refreshNav();
            router.push(`/scenes/${scene.id}`);
          }}
        />
      )}

      {editing && (
        <SceneModal
          campaignId={id}
          scene={{ id: editing.id, title: editing.title }}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await refresh();
          }}
        />
      )}
    </>
  );
}
