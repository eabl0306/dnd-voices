"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  isTheme,
  otherTheme,
  type Theme,
  THEME_STORAGE_KEY,
  themeLabel,
} from "@/lib/theme";

/**
 * El tema vive en `data-theme` del <html>, que fija un script antes de pintar.
 *
 * Se lee con useSyncExternalStore y no con un efecto porque es exactamente eso:
 * estado que vive fuera de React. Sincronizarlo por efecto provocaría un render
 * extra en cada carga y un destello del rótulo equivocado.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  const attribute = document.documentElement.dataset.theme;
  return isTheme(attribute) ? attribute : DEFAULT_THEME;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_THEME);

  const toggle = useCallback(() => {
    const next = otherTheme(getSnapshot());
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Modo privado o almacenamiento lleno: el tema dura la sesión y ya.
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Cambiar a tema ${themeLabel(otherTheme(theme)).toLowerCase()}`}
      className="flex items-center gap-2 rounded-[7px] border border-line px-[10px] py-[7px] font-mono text-[11px] tracking-[0.06em] uppercase text-text2 transition hover:border-line2 hover:text-text"
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
      {compact ? themeLabel(theme) : `Tema: ${themeLabel(theme)}`}
    </button>
  );
}
