import { type APIRequestContext, expect, type Page, test as base } from "@playwright/test";

export type Account = { name: string; email: string; password: string };

/** Cada test crea su propio usuario: así pueden correr en paralelo sin pisarse. */
export function uniqueAccount(prefix: string): Account {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `DM ${prefix}`,
    email: `${prefix}-${id}@example.test`,
    password: "partida-de-prueba-2026",
  };
}

export async function signUpViaApi(
  request: APIRequestContext,
  account: Account,
): Promise<void> {
  const response = await request.post("/api/auth/sign-up/email", { data: account });
  expect(response.ok(), await response.text()).toBe(true);
}

export async function signUpViaUi(page: Page, account: Account): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: "Crear una cuenta" }).click();
  await page.getByLabel("Nombre").fill(account.name);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Contraseña").fill(account.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Campañas" })).toBeVisible();
}

export type CampaignRef = { id: string };

export async function createCampaign(
  request: APIRequestContext,
  name: string,
): Promise<CampaignRef> {
  const response = await request.post("/api/campaigns", {
    data: { name, setting: "Ambientación de prueba." },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as CampaignRef;
}

/**
 * Test con sesión ya iniciada mediante la API, sin pasar por el formulario.
 *
 * El alta va por `context.request` y no por el fixture `request`: éste último
 * es un contexto HTTP independiente, y su cookie de sesión nunca llegaría al
 * navegador que usa `page`.
 */
export const test = base.extend<{ account: Account }>({
  account: async ({ context }, use, testInfo) => {
    const account = uniqueAccount(testInfo.title.slice(0, 12).replace(/\W+/g, "-"));
    await signUpViaApi(context.request, account);
    await use(account);
  },
});

export { expect } from "@playwright/test";
