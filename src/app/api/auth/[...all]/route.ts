import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { lazyProxy } from "@/lib/lazy";

/**
 * `toNextJsHandler(auth)` lee la configuración al construirse, así que
 * ejecutarlo a nivel de módulo obligaría a tener BETTER_AUTH_SECRET durante
 * `next build`. El proxy lo memoiza y lo aplaza a la primera petición.
 */
const handlers = lazyProxy(() => toNextJsHandler(auth));

export const GET = (request: Request) => handlers.GET(request);
export const POST = (request: Request) => handlers.POST(request);
