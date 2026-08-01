"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CampaignSummary } from "@/lib/dto";
import { campaignTint, GLYPH, initials } from "@/lib/tone";

function meta(campaign: CampaignSummary): string {
  return `${campaign.characterCount} personajes · ${campaign.sceneCount} escenas`;
}

export function CampaignSwitcher({
  campaigns,
  activeId,
  onNewCampaign,
}: {
  campaigns: readonly CampaignSummary[];
  activeId: string | null;
  onNewCampaign: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event.type === "pointerdown" && root.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const active = campaigns.find((campaign) => campaign.id === activeId);
  const label = active?.name ?? "Sin campaña";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center gap-[10px] rounded-[8px] border px-[10px] py-[9px] transition ${
          open ? "border-line2 bg-panel2" : "border-line hover:border-line2"
        }`}
      >
        <span
          aria-hidden
          className="grid h-7 w-7 flex-none place-items-center rounded-[7px] font-mono text-[12px] font-semibold"
          style={{ background: active ? campaignTint(active.id) : "var(--panel3)" }}
        >
          {active ? initials(active.name) : "··"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{label}</span>
          <span className="block truncate font-mono text-[10.5px] text-text3">
            {active ? meta(active) : "Elige o crea una"}
          </span>
        </span>
        <span
          aria-hidden
          className="flex-none text-[9px] text-text3 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          {GLYPH.chevron}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Cambiar de campaña"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-40 rounded-[9px] border border-line2 bg-panel p-[6px] shadow-[var(--shadow)]"
          style={{ animation: "fadeUp .14s ease both" }}
        >
          <div className="px-2 pt-[6px] pb-2 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-text3">
            Cambiar de campaña
          </div>

          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              role="option"
              aria-selected={campaign.id === activeId}
              onClick={() => setOpen(false)}
              className={`flex w-full items-center gap-[9px] rounded-[7px] px-2 py-[7px] hover:bg-panel2 ${
                campaign.id === activeId ? "bg-panel2" : ""
              }`}
            >
              <span
                aria-hidden
                className="grid h-6 w-6 flex-none place-items-center rounded-[6px] font-mono text-[11px] font-semibold"
                style={{ background: campaignTint(campaign.id) }}
              >
                {initials(campaign.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[13px] ${campaign.id === activeId ? "font-semibold" : ""}`}
                >
                  {campaign.name}
                </span>
                <span className="block font-mono text-[10.5px] text-text3">{meta(campaign)}</span>
              </span>
              {campaign.id === activeId && (
                <span className="flex-none text-[11px] text-accent">{GLYPH.generated}</span>
              )}
            </Link>
          ))}

          <div className="my-[6px] h-px bg-line" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNewCampaign();
            }}
            className="flex w-full items-center gap-[9px] rounded-[7px] px-2 py-[7px] text-[13px] text-text2 hover:bg-panel2 hover:text-text"
          >
            <span aria-hidden className="w-6 text-center font-mono">
              {GLYPH.add}
            </span>
            Nueva campaña
          </button>
          <Link
            href="/campaigns"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-[9px] rounded-[7px] px-2 py-[7px] text-[13px] text-text2 hover:bg-panel2 hover:text-text"
          >
            <span aria-hidden className="w-6 text-center font-mono">
              {GLYPH.swap}
            </span>
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
