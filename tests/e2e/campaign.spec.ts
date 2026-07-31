import { expect, test } from "./fixtures";

test.describe("campañas", () => {
  test("crear una campaña la lista y le da narrador", async ({ page, account }) => {
    void account; // la fixture ya dejó la sesión iniciada en este contexto

    await page.goto("/campaigns");
    await page.getByLabel("Nombre").fill("La Tumba de la Aniquilación");
    await page.getByLabel("Ambientación").fill("Selva de Chult, tono pulp.");
    await page.getByRole("button", { name: "Crear" }).click();

    const card = page.getByRole("link", { name: /La Tumba de la Aniquilación/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("1 personajes · 0 escenas");

    // Toda campaña nace con narrador: sin él la primera escena no tendría a
    // quién atribuir la narración.
    await card.click();
    await expect(page.getByText("Narrador", { exact: true })).toBeVisible();
    await expect(page.getByText("asignando voz…")).toBeVisible();
  });

  test("añadir personaje y escena a una campaña", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña con reparto" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/campaigns/${campaign.id}`);

    await page.getByLabel("Nombre").fill("Thorin");
    await page.getByLabel("Descripción").fill("Enano gruñón de voz grave.");
    await page.getByRole("button", { name: "Añadir personaje" }).click();
    await expect(page.getByText("Thorin", { exact: true })).toBeVisible();

    await page.getByLabel("Nueva escena").fill("La taberna");
    await page.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByRole("link", { name: /La taberna/ })).toContainText(
      "0 líneas · draft",
    );
  });

  test("una escena nueva se abre y guarda su texto", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña con escena" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/campaigns/${campaign.id}`);
    await page.getByLabel("Nueva escena").fill("El puente colgante");
    await page.getByRole("button", { name: "Crear" }).click();
    await page.getByRole("link", { name: /El puente colgante/ }).click();

    const raw = "El puente cruje bajo sus pies.";
    await page.getByLabel("Texto de la escena").fill(raw);
    await page.getByRole("button", { name: "Guardar sin analizar" }).click();

    // Recargar prueba que se persistió, no que quedó en el estado local.
    await page.reload();
    await expect(page.getByLabel("Texto de la escena")).toHaveValue(raw);
  });

  test("el botón de generar audio no aparece sin guion", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña sin guion" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    const scene = await context.request
      .post(`/api/campaigns/${campaign.id}/scenes`, { data: { title: "Escena cruda" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/scenes/${scene.id}`);
    await expect(page.getByLabel("Texto de la escena")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generar audio" })).toHaveCount(0);
  });
});
