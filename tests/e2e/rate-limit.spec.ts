import { type APIRequestContext, expect, test } from "@playwright/test";
import { uniqueAccount } from "./fixtures";

/**
 * Comprueba que el rate limit de autenticación bloquea de verdad.
 *
 * Corre contra su propio stack (docker-compose.ratelimit.yml), con el límite
 * bajado a un valor que se pueda agotar. El resto de e2e usa un límite alto
 * porque crea un usuario por caso desde la misma IP, así que allí este control
 * nunca llega a dispararse.
 */

const MAX = Number(process.env.RATE_LIMIT_MAX ?? 5);
const OK = 200;
const TOO_MANY_REQUESTS = 429;

// El contador es por IP y compartido: en paralelo los casos se robarían
// intentos entre sí y el recuento dejaría de ser determinista.
test.describe.configure({ mode: "serial" });

/**
 * Cada intento va en un contexto HTTP limpio.
 *
 * Reutilizar uno solo guardaría la cookie del primer alta y better-auth
 * rechazaría las siguientes por venir ya autenticadas: el test pasaría sin
 * llegar a ejercitar el límite.
 */
async function attempts(
  count: number,
  baseURL: string,
  playwrightRequest: { newContext: (o: { baseURL: string }) => Promise<APIRequestContext> },
  send: (request: APIRequestContext, index: number) => Promise<{ status: () => number }>,
): Promise<number[]> {
  const statuses: number[] = [];
  for (let index = 0; index < count; index++) {
    const request = await playwrightRequest.newContext({ baseURL });
    statuses.push((await send(request, index)).status());
    await request.dispose();
  }
  return statuses;
}

test.describe("rate limit de autenticación", () => {
  test("el alta se corta justo al superar el límite por IP", async ({ playwright, baseURL }) => {
    const extra = 3;
    const statuses = await attempts(MAX + extra, baseURL ?? "", playwright.request, (request, i) =>
      request.post("/api/auth/sign-up/email", { data: uniqueAccount(`rl-signup-${i}`) }),
    );

    // Los primeros tienen que pasar: un límite que bloquea desde el primer
    // intento no protege, sólo rompe el alta de usuarios legítimos.
    expect(statuses.slice(0, MAX)).toEqual(Array(MAX).fill(OK));
    // Y a partir de ahí, cortado durante toda la ventana.
    expect(statuses.slice(MAX)).toEqual(Array(extra).fill(TOO_MANY_REQUESTS));
  });

  test("el login lleva su propio contador, no el del alta", async ({ playwright, baseURL }) => {
    const credentials = { email: "nadie@example.test", password: "da-igual-la-clave" };

    const statuses = await attempts(MAX + 2, baseURL ?? "", playwright.request, (request) =>
      request.post("/api/auth/sign-in/email", { data: credentials }),
    );

    // El alta acaba de agotarse en el caso anterior. Si compartieran contador,
    // el primer login ya vendría bloqueado.
    expect(statuses[0]).not.toBe(TOO_MANY_REQUESTS);
    expect(statuses.at(-1)).toBe(TOO_MANY_REQUESTS);
  });

  test("el límite estrecho no alcanza al resto de la API", async ({ request }) => {
    // Con alta y login ya bloqueados, una ruta normal debe seguir respondiendo
    // lo suyo: el límite general es mucho más holgado y va aparte.
    expect((await request.get("/api/campaigns")).status()).toBe(401);
  });
});
