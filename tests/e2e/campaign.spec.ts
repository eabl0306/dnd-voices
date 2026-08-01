import { expect, test } from "./fixtures";

test.describe("campañas", () => {
  test("el estado vacío guía hasta la primera campaña", async ({ page, account }) => {
    void account; // la fixture ya dejó la sesión iniciada en este contexto

    await page.goto("/campaigns");
    await expect(page.getByRole("heading", { name: "Todo empieza por una campaña" })).toBeVisible();

    // Sin campaña, el resto de la navegación no lleva a ningún sitio útil.
    await expect(page.getByText("Personajes y escenas viven dentro de una campaña.")).toBeVisible();

    await page.getByRole("button", { name: "Crear mi primera campaña" }).click();
    await page.getByLabel("Nombre").fill("La Tumba de la Aniquilación");
    await page.getByLabel(/Ambientación/).fill("Selva de Chult, tono pulp.");
    await page.getByRole("button", { name: "Crear campaña" }).click();

    // Crear navega al resumen de la campaña recién creada.
    await expect(page).toHaveURL(/\/campaigns\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();
  });

  test("el resumen refleja la campaña recién creada", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña de resumen", setting: "Puerto gris." } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/campaigns/${campaign.id}`);
    await expect(page.getByText("Puerto gris.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Requiere tu atención" })).toBeVisible();

    // La campaña nace sin reparto: el DM decide a quién da de alta y con qué
    // estrategia de voz.
    await expect(page.getByRole("link", { name: /Personajes/ })).toContainText("0");
  });

  test("añadir un personaje desde su modal", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña con reparto" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/campaigns/${campaign.id}/characters`);
    await expect(page.getByRole("heading", { name: "Aún no hay reparto" })).toBeVisible();

    await page.getByRole("button", { name: "Añadir el primer personaje" }).click();
    await page.getByLabel("Nombre").fill("Thorin");
    await page.getByLabel("Descripción física y vocal").fill("Enano gruñón de voz grave.");
    await page.getByRole("button", { name: "Añadir personaje" }).click();

    await expect(page.getByRole("heading", { name: "Thorin" })).toBeVisible();
  });

  test("sin voces registradas sólo se ofrece generar una", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña recién nacida" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/campaigns/${campaign.id}/characters`);
    await page.getByRole("button", { name: "Añadir el primer personaje" }).click();

    // Reutilizar del pool o elegir de la biblioteca sólo produciría un casting
    // fallido mientras no exista ninguna voz.
    await expect(page.getByRole("radio", { name: /Generar voz nueva/ })).toBeEnabled();
    await expect(page.getByRole("radio", { name: /Voz del pool/ })).toBeDisabled();
    await expect(page.getByRole("radio", { name: /Elegir voz concreta/ })).toBeDisabled();
    await expect(page.getByRole("radio", { name: /Generar voz nueva/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("elegir voz concreta exige seleccionar una", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña sin voces" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/campaigns/${campaign.id}/characters`);

    // Con una voz en la biblioteca, elegir a mano ya es posible pero exige
    // seleccionar cuál.
    await context.request.post("/api/voices", {
      data: { name: "Voz suelta", externalId: `elegir-${campaign.id}` },
    });
    await page.reload();
    await page.getByRole("button", { name: "Añadir el primer personaje" }).click();
    await page.getByLabel("Nombre").fill("Grum");
    await page.getByRole("radio", { name: /Elegir voz concreta/ }).click();

    await expect(page.getByRole("button", { name: "Añadir personaje" })).toBeDisabled();
    await page.getByRole("option", { name: /Voz suelta/ }).click();
    await expect(page.getByRole("button", { name: "Añadir personaje" })).toBeEnabled();
  });

  test("crear una escena la abre en el editor", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña con escena" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/campaigns/${campaign.id}/scenes`);
    await page.getByRole("button", { name: "Nueva escena" }).first().click();
    await page.getByLabel("Nombre").fill("El puente colgante");
    await page.getByRole("button", { name: "Crear escena" }).click();

    await expect(page).toHaveURL(/\/scenes\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "El puente colgante" })).toBeVisible();

    const raw = "El puente cruje bajo sus pies.";
    await page.getByLabel("Texto de la escena").fill(raw);
    await page.getByRole("button", { name: "Guardar sin analizar" }).click();

    // Recargar prueba que se persistió, no que quedó en el estado local.
    await page.reload();
    await expect(page.getByLabel("Texto de la escena")).toHaveValue(raw);
  });

  test("la tabla de escenas resume estado y extracto", async ({ page, context, account }) => {
    void account;
    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña tabulada" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await context.request.post(`/api/campaigns/${campaign.id}/scenes`, {
      data: { title: "Escena con texto", rawText: "La taberna huele a cerveza rancia." },
    });
    await context.request.post(`/api/campaigns/${campaign.id}/scenes`, {
      data: { title: "Escena vacía" },
    });

    await page.goto(`/campaigns/${campaign.id}/scenes`);
    await expect(page.getByText("La taberna huele a cerveza rancia.")).toBeVisible();
    await expect(page.getByText("Sin texto todavía")).toBeVisible();
    await expect(page.getByText("Sin analizar").first()).toBeVisible();
  });

  test("sin guion no se ofrece generar audio", async ({ page, context, account }) => {
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
