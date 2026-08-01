"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { CampaignModal } from "@/components/modals/campaign-modal";
import { Sidebar } from "@/components/shell/sidebar";
import { ErrorNote } from "@/components/ui";
import { usePoll } from "@/hooks/use-poll";
import { signOut } from "@/lib/auth-client";
import type { NavData } from "@/lib/dto";
import { api } from "@/lib/http";
import { activeNavKey, navContextFromPath, navQuery } from "@/lib/nav";

type NavState = { nav: NavData | undefined; refresh: () => Promise<void> };

const NavContext = createContext<NavState>({ nav: undefined, refresh: async () => {} });

/** Datos de la barra lateral, para que las vistas no vuelvan a pedirlos. */
export function useNav(): NavState {
  return useContext(NavContext);
}

/** El casting corre en el worker: la barra lateral se refresca hasta que acaba. */
const POLL_MS = 6000;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const context = useMemo(() => navContextFromPath(pathname), [pathname]);
  const fetcher = useCallback(() => api<NavData>(`/api/nav${navQuery(context)}`), [context]);
  const { data: nav, error, refresh } = usePoll(fetcher, POLL_MS);

  const value = useMemo<NavState>(() => ({ nav, refresh }), [nav, refresh]);

  async function onSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <NavContext.Provider value={value}>
      <div className="flex min-h-screen flex-wrap items-stretch">
        {nav && (
          <Sidebar
            nav={nav}
            activeKey={activeNavKey(pathname)}
            onNewCampaign={() => setCreating(true)}
            onSignOut={onSignOut}
          />
        )}

        <main className="flex min-w-0 flex-[1_1_560px] flex-col">
          {error && (
            <div className="p-6">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
          {children}
        </main>
      </div>

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
    </NavContext.Provider>
  );
}
