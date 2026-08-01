import { expect, test } from "./fixtures";

test.describe("biblioteca de voces", () => {
  test("está vacía en una cuenta nueva y guía al alta", async ({ page, account }) => {
    void account;

    await page.goto("/voices");
    await expect(page.getByRole("heading", { name: "Tu biblioteca está vacía" })).toBeVisible();
    // La biblioteca es de la cuenta: se alcanza sin tener ninguna campaña.
    await expect(page.getByRole("heading", { name: "Biblioteca de voces" })).toBeVisible();
  });

  test("añadir una voz por su voice_id", async ({ page, account }) => {
    void account;

    await page.goto("/voices");
    await page.getByRole("button", { name: "Añadir voz" }).first().click();

    await page.getByLabel("Nombre en la app").fill("Carmelo");
    await page.getByLabel("Voice ID").fill("pNInz6obpgDQGcFmaJgB");
    await page.getByLabel(/Etiquetas/).fill("barítono, seco");
    await page.getByRole("button", { name: "Añadir voz", exact: true }).last().click();

    await expect(page.getByRole("heading", { name: "Carmelo" })).toBeVisible();
    await expect(page.getByText("pNInz6obpgDQGcFmaJgB")).toBeVisible();
    await expect(page.getByText("barítono · seco")).toBeVisible();
    await expect(page.getByText("Sin usar")).toBeVisible();
  });

  test("una voz de la biblioteca se puede fijar a un personaje", async ({
    page,
    context,
    account,
  }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña con biblioteca" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await context.request.post("/api/voices", {
      data: { name: "Nerea", externalId: "XrExE9yKIg1WjnnlVkGX", tags: ["contralto"] },
    });

    await page.goto(`/campaigns/${campaign.id}/characters`);
    await page.getByRole("button", { name: "Nuevo personaje" }).first().click();
    await page.getByLabel("Nombre").fill("Hermana Ilva");
    await page.getByRole("radio", { name: /Elegir voz concreta/ }).click();

    await page.getByRole("option", { name: /Nerea/ }).click();
    await expect(page.getByRole("button", { name: "Añadir personaje" })).toBeEnabled();
    await page.getByRole("button", { name: "Añadir personaje" }).click();

    await expect(page.getByRole("heading", { name: "Hermana Ilva" })).toBeVisible();
  });

  test("el contador de la barra lateral sigue a la biblioteca", async ({
    page,
    context,
    account,
  }) => {
    void account;
    await context.request.post("/api/voices", {
      data: { name: "Voz contada", externalId: "conteo-1" },
    });

    await page.goto("/voices");
    const sidebarEntry = page.getByRole("link", { name: /Biblioteca de voces/ });
    await expect(sidebarEntry).toContainText("1");
  });
});
