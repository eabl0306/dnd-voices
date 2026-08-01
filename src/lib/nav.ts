export type NavKey =
  | "campaigns"
  | "overview"
  | "characters"
  | "scenes"
  | "editor"
  | "voices";

export type NavContext = {
  campaignId: string | null;
  sceneId: string | null;
};

/**
 * Contexto de campaña deducido de la URL.
 *
 * La shell vive en un layout y no recibe props de la página, así que lee la
 * ruta. Desde `/scenes/[id]` no conoce la campaña: devuelve el id de escena y
 * el servidor la resuelve.
 */
export function navContextFromPath(pathname: string): NavContext {
  const campaign = /^\/campaigns\/([^/]+)/.exec(pathname);
  if (campaign?.[1]) return { campaignId: campaign[1], sceneId: null };

  const scene = /^\/scenes\/([^/]+)/.exec(pathname);
  if (scene?.[1]) return { campaignId: null, sceneId: scene[1] };

  return { campaignId: null, sceneId: null };
}

export function activeNavKey(pathname: string): NavKey | null {
  if (pathname.startsWith("/voices")) return "voices";
  if (pathname.startsWith("/scenes/")) return "editor";
  if (/^\/campaigns\/[^/]+\/characters/.test(pathname)) return "characters";
  if (/^\/campaigns\/[^/]+\/scenes/.test(pathname)) return "scenes";
  if (/^\/campaigns\/[^/]+/.test(pathname)) return "overview";
  if (pathname === "/campaigns") return "campaigns";
  return null;
}

/** Parámetros de `/api/nav` para la ruta actual. */
export function navQuery(context: NavContext): string {
  if (context.campaignId) return `?campaignId=${encodeURIComponent(context.campaignId)}`;
  if (context.sceneId) return `?sceneId=${encodeURIComponent(context.sceneId)}`;
  return "";
}
