import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * El proyecto de rate limit necesita su propio stack, con el límite bajado a
 * un valor que se pueda agotar. Sólo se registra cuando esa URL está definida,
 * para que `npm run test:e2e` siga funcionando sin levantar un segundo stack.
 */
const RATE_LIMIT_URL = process.env.RATE_LIMIT_BASE_URL;
const RATE_LIMIT_SPEC = /rate-limit\.spec\.ts/;

/** Sólo la suite principal contra local necesita que Playwright arranque la app. */
const managesServer = !process.env.E2E_BASE_URL && !RATE_LIMIT_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { trace: "on-first-retry" },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], baseURL: BASE_URL },
      testIgnore: RATE_LIMIT_SPEC,
    },
    ...(RATE_LIMIT_URL
      ? [
          {
            name: "rate-limit",
            use: { ...devices["Desktop Chrome"], baseURL: RATE_LIMIT_URL },
            testMatch: RATE_LIMIT_SPEC,
            // El contador vive en el servidor y es por IP: en paralelo los
            // casos se robarían intentos entre sí.
            fullyParallel: false,
            // Reintentar tampoco sirve: la ventana de 60 s sigue agotada.
            retries: 0,
          },
        ]
      : []),
  ],

  ...(managesServer
    ? {
        webServer: {
          command: "npm run dev",
          url: BASE_URL,
          // Sin reutilizar: un dev server ya arrancado lleva el límite real de
          // producción, y como cada caso crea un usuario desde la misma IP, los
          // fallos salen como «element not found» en vez de como un 429. Es
          // preferible un error claro de puerto ocupado.
          reuseExistingServer: false,
          timeout: 120_000,
          env: { AUTH_RATE_LIMIT_MAX: "1000" },
        },
      }
    : {}),
});
