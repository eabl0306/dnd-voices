"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { MembersPanel } from "@/components/campaign/members-panel";
import { CampaignModal } from "@/components/modals/campaign-modal";
import { ViewBody, ViewHeader } from "@/components/shell/view-header";
import { Button, ErrorNote, GlyphBox, MonoLabel, Panel } from "@/components/ui";
import { usePoll } from "@/hooks/use-poll";
import type { AttentionItem, CampaignOverview } from "@/lib/dto";
import { api } from "@/lib/http";
import { TONE_SOFT_BG, TONE_TEXT } from "@/lib/tone";

function Metric({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <Panel className="px-[15px] py-[14px]">
      <div className="mb-[7px]">
        <MonoLabel>{label}</MonoLabel>
      </div>
      <div
        className={`text-[24px] font-semibold tracking-[-0.02em] ${highlight ? "text-warn" : ""}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[12.5px] text-text3">{hint}</div>
    </Panel>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-[10px] rounded-[7px] border border-line px-[11px] py-[9px] transition hover:border-line2 ${TONE_SOFT_BG[item.tone]}`}
    >
      <span className={`flex-none ${TONE_TEXT[item.tone]}`}>
        <GlyphBox glyph={item.glyph} size={16} />
      </span>
      <span className="min-w-0 flex-1 text-[13.5px]">{item.text}</span>
      <span aria-hidden className="flex-none font-mono text-[11px] text-text3">
        →
      </span>
    </Link>
  );
}

/** Lo que hay que mirar primero: fallo, luego trabajo en curso, luego calma. */
function voiceHint(data: CampaignOverview): string {
  if (data.failedVoices > 0) {
    return `${data.failedVoices} ${data.failedVoices === 1 ? "voz fallida" : "voces fallidas"}`;
  }
  if (data.pendingVoices > 0) {
    return `${data.pendingVoices} asignándose`;
  }
  return data.characterCount > 0 ? "todas con voz" : "sin reparto";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export default function CampaignOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const [editing, setEditing] = useState(false);

  const fetcher = useCallback(
    () => api<CampaignOverview>(`/api/campaigns/${id}/summary`),
    [id],
  );
  const { data, error, refresh } = usePoll(fetcher, 8000);

  return (
    <>
      <ViewHeader
        crumb={data?.name ?? "Campaña"}
        title="Resumen"
        meta={data && `Última generación: ${formatDate(data.lastRenderAt)}`}
      />

      <ViewBody>
        <ErrorNote>{error}</ErrorNote>
        {!data && !error && <p className="text-[13px] text-text3">Cargando…</p>}

        {data && (
          <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              <Metric
                label="Personajes"
                value={String(data.characterCount)}
                hint={voiceHint(data)}
              />
              <Metric
                label="Escenas"
                value={String(data.sceneCount)}
                hint={`${data.renderedScenes} renderizadas`}
              />
              <Metric
                label="Líneas por revisar"
                value={String(data.pendingReview)}
                hint={
                  data.scenesWithPending > 0
                    ? `en ${data.scenesWithPending} ${data.scenesWithPending === 1 ? "escena" : "escenas"}`
                    : "guion al día"
                }
                highlight={data.pendingReview > 0}
              />
              <Metric
                label="Caracteres facturados"
                value={
                  data.charsBilled >= 1000
                    ? `${(data.charsBilled / 1000).toFixed(1).replace(".", ",")} k`
                    : String(data.charsBilled)
                }
                hint={`${data.cacheHitRatio} % desde caché`}
              />
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[14px]">
              <Panel className="p-[18px]">
                <h2 className="mb-[10px]">
                  <MonoLabel>Ambientación</MonoLabel>
                </h2>
                <p className="mb-[14px] text-[14px] leading-[1.6] text-text2 text-pretty">
                  {data.setting || "Sin ambientación todavía. La IA trabaja mejor con contexto."}
                </p>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Editar ambientación
                </Button>
              </Panel>

              <Panel className="p-[18px]">
                <h2 className="mb-3">
                  <MonoLabel>Requiere tu atención</MonoLabel>
                </h2>
                {data.attention.length === 0 ? (
                  <p className="text-[13.5px] leading-[1.6] text-text2">
                    Nada pendiente. Puedes pegar una escena nueva y generar su audio.
                  </p>
                ) : (
                  <div className="flex flex-col gap-[9px]">
                    {data.attention.map((item) => (
                      <AttentionRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </Panel>

              <MembersPanel campaignId={data.id} isOwner={data.isOwner} />
            </div>
          </>
        )}
      </ViewBody>

      {editing && data && (
        <CampaignModal
          campaign={{ id: data.id, name: data.name, setting: data.setting }}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await refresh();
          }}
        />
      )}
    </>
  );
}
