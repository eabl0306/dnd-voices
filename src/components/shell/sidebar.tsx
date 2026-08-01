"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CampaignSwitcher } from "@/components/shell/campaign-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import type { NavData } from "@/lib/dto";
import type { NavKey } from "@/lib/nav";
import { initials } from "@/lib/tone";

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="px-2 pb-[6px] font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-text3">
      {children}
    </span>
  );
}

function itemClass(active: boolean, locked: boolean): string {
  return [
    "flex items-center gap-[9px] rounded-[7px] px-[10px] py-2 text-[13.5px] transition",
    active ? "border-l-[3px] border-accent bg-panel2 font-semibold" : "border-l-[3px] border-transparent",
    locked ? "opacity-45" : "hover:bg-panel2",
  ].join(" ");
}

function NavLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={itemClass(active, false)}>
      <span className="flex-1">{children}</span>
      {count !== undefined && (
        <span className="font-mono text-[11px] text-text3">{count}</span>
      )}
    </Link>
  );
}

/** Sin campaña activa, estos destinos no llevan a ningún sitio útil. */
function LockedItem({ children }: { children: ReactNode }) {
  return (
    <span aria-disabled className={itemClass(false, true)}>
      <span className="flex-1">{children}</span>
      <span className="font-mono text-[11px] text-text3">—</span>
    </span>
  );
}

export function Sidebar({
  nav,
  activeKey,
  onNewCampaign,
  onSignOut,
}: {
  nav: NavData;
  activeKey: NavKey | null;
  onNewCampaign: () => void;
  onSignOut: () => void;
}) {
  const active = nav.active;
  const base = active ? `/campaigns/${active.id}` : null;
  const openScene = active?.openScene;

  return (
    <aside className="flex flex-[0_0_240px] flex-col gap-5 border-r border-line bg-panel p-4">
      <div className="flex items-baseline gap-2 px-[6px] py-[2px]">
        <span className="font-mono text-[14px] font-semibold">DnD&nbsp;Voices</span>
        <span className="font-mono text-[11px] tracking-[0.06em] text-text3">v0.4</span>
      </div>

      <CampaignSwitcher
        campaigns={nav.campaigns}
        activeId={active?.id ?? null}
        onNewCampaign={onNewCampaign}
      />

      <nav className="flex flex-col gap-[2px]">
        <GroupLabel>Esta campaña</GroupLabel>
        {base && active ? (
          <>
            <NavLink href={base} active={activeKey === "overview"}>
              Resumen
            </NavLink>
            <NavLink
              href={`${base}/characters`}
              active={activeKey === "characters"}
              count={active.characterCount}
            >
              Personajes
            </NavLink>
            <NavLink
              href={`${base}/scenes`}
              active={activeKey === "scenes"}
              count={active.sceneCount}
            >
              Escenas
            </NavLink>
          </>
        ) : (
          <>
            <LockedItem>Resumen</LockedItem>
            <LockedItem>Personajes</LockedItem>
            <LockedItem>Escenas</LockedItem>
            <p className="mt-[6px] px-2 text-[12px] leading-[1.5] text-text3">
              Personajes y escenas viven dentro de una campaña. Crea una para desbloquearlos.
            </p>
          </>
        )}
      </nav>

      {openScene && (
        <nav className="flex flex-col gap-[2px]">
          <GroupLabel>Abierto ahora</GroupLabel>
          <Link
            href={`/scenes/${openScene.id}`}
            aria-current={activeKey === "editor" ? "page" : undefined}
            className={`block rounded-[7px] px-[10px] py-2 transition hover:bg-panel2 ${
              activeKey === "editor"
                ? "border-l-[3px] border-accent bg-panel2"
                : "border-l-[3px] border-transparent"
            }`}
          >
            <span
              className={`block truncate text-[13.5px] ${activeKey === "editor" ? "font-semibold" : ""}`}
            >
              {openScene.title}
            </span>
            <span
              className={`mt-[3px] block font-mono text-[11px] ${
                openScene.pendingReview > 0 ? "text-warn" : "text-ok"
              }`}
            >
              {openScene.pendingReview > 0
                ? `${openScene.pendingReview} por revisar`
                : "Guion revisado"}
            </span>
          </Link>
        </nav>
      )}

      <nav className="flex flex-col gap-[2px]">
        <GroupLabel>Cuenta</GroupLabel>
        <NavLink href="/voices" active={activeKey === "voices"} count={nav.voiceCount}>
          Biblioteca de voces
        </NavLink>
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-2 border-t border-line pt-[14px]">
        <ThemeToggle />
        <div className="flex items-center gap-[9px] px-1 py-[6px]">
          <span
            aria-hidden
            className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-panel3 font-mono text-[11px] font-semibold text-text2"
          >
            {initials(nav.user.name || nav.user.email)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-text2">
            {nav.user.email}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="flex-none font-mono text-[11px] text-text3 hover:text-text"
          >
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
