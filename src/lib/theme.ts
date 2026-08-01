export type Theme = "dark" | "light";

/** Oscuro por defecto: la app se usa en mesa, con poca luz. */
export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "dndvoices:theme";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function otherTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function themeLabel(theme: Theme): string {
  return theme === "dark" ? "Oscuro" : "Claro";
}

/**
 * Script que fija `data-theme` antes de pintar.
 *
 * Va inline en el <head>: si esperásemos a la hidratación, el usuario vería un
 * destello del tema equivocado en cada carga.
 */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.dataset.theme=(t==="dark"||t==="light")?t:${JSON.stringify(
  DEFAULT_THEME,
)}}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)}}})()`;
