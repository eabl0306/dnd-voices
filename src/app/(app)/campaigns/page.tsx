"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CampaignModal } from "@/components/modals/campaign-modal";
import { ViewBody, ViewHeader } from "@/components/shell/view-header";
import { Button, EmptyState, ErrorNote } from "@/components/ui";
import { usePoll } from "@/hooks/use-poll";
import type { CampaignSummary } from "@/lib/dto";
import { api } from "@/lib/http";
import { campaignTint, GLYPH, initials } from "@/lib/tone";

export default function CampaignsPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const fetcher = useCallback(() => api<CampaignSummary[]>("/api/campaigns"), []);
  const { data: campaigns, error, refresh } = usePoll(fetcher);

  return (
    <>
      <ViewHeader
        crumb="Cuenta"
        title="Campañas"
        meta={campaigns && `${campaigns.length} en total`}
        action={<Button onClick={() => setCreating(true)}>Nueva campaña</Button>}
      />

      <ViewBody>
        <ErrorNote>{error}</ErrorNote>

        {campaigns?.length === 0 && (
          <EmptyState
            title="Todo empieza por una campaña"
            action={<Button onClick={() => setCreating(true)}>Crear mi primera campaña</Button>}
          >
            <p className="mb-4">
              Los personajes y sus voces, y las escenas que renderizas, cuelgan de una campaña.
              Crea la primera y podrás dar de alta el reparto.
            </p>
            <ol className="list-decimal pl-[18px] text-[13.5px] leading-[1.9]">
              <li>Crea la campaña con su ambientación.</li>
              <li>Da de alta el reparto y asigna una voz a cada personaje.</li>
              <li>Pega tu primera escena y genera el audio.</li>
            </ol>
          </EmptyState>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(236px,1fr))] gap-3">
          {campaigns?.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="flex items-start gap-[11px] rounded-[9px] border border-line bg-panel p-4 transition hover:-translate-y-px hover:border-line2"
            >
              <span
                aria-hidden
                className="grid h-8 w-8 flex-none place-items-center rounded-[8px] font-mono text-[12.5px] font-semibold"
                style={{ background: campaignTint(campaign.id) }}
              >
                {initials(campaign.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-1 block text-[15px] font-semibold">{campaign.name}</span>
                <span className="block font-mono text-[12px] text-text3">
                  {campaign.characterCount} personajes · {campaign.sceneCount} escenas
                </span>
              </span>
            </Link>
          ))}

          {campaigns && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-[92px] flex-col justify-center gap-[5px] rounded-[9px] border border-dashed border-line2 p-4 text-text2 transition hover:bg-panel hover:text-text"
            >
              <span aria-hidden className="font-mono text-[15px]">
                {GLYPH.add}
              </span>
              <span className="text-[14px] font-medium">Nueva campaña</span>
            </button>
          )}
        </div>
      </ViewBody>

      {creating && (
        <CampaignModal
          onClose={() => setCreating(false)}
          onSaved={async (campaign) => {
            setCreating(false);
            await refresh();
            router.push(`/campaigns/${campaign.id}`);
          }}
        />
      )}
    </>
  );
}
