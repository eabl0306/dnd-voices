import { expect, test } from "./fixtures";

/**
 * El modal de biblioteca es el que más campos tiene, así que es donde antes se
 * notaba que el foco saltaba solo. Las páginas sondean cada pocos segundos, y
 * ese refresco es el que disparaba el problema.
 */
test.describe("comportamiento de los modales", () => {
  test("el foco arranca en el primer campo, no en la ✕", async ({ page, account }) => {
    void account;

    await page.goto("/voices");
    await page.getByRole("button", { name: "Añadir voz" }).first().click();

    // Con la ✕ enfocada, un Intro o un espacio cerraban el modal sin guardar.
    await expect(page.getByLabel("Nombre en la app")).toBeFocused();
  });

  test("escribir no pierde el foco cuando la página se refresca", async ({ page, account }) => {
    void account;

    await page.goto("/voices");
    await page.getByRole("button", { name: "Añadir voz" }).first().click();

    const voiceId = page.getByLabel("Voice ID");
    await voiceId.click();
    await voiceId.type("pNInz6obpg");

    // Más que cualquier intervalo de sondeo de la aplicación.
    await page.waitForTimeout(7000);

    await expect(voiceId).toBeFocused();
    await voiceId.type("DQGcFmaJgB");
    await expect(voiceId).toHaveValue("pNInz6obpgDQGcFmaJgB");
  });

  test("Intro guarda tras un refresco, en vez de cerrar sin guardar", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/voices");
    await page.getByRole("button", { name: "Añadir voz" }).first().click();
    await page.getByLabel("Nombre en la app").fill("Carmelo");
    await page.getByLabel("Voice ID").fill("pNInz6obpgDQGcFmaJgB");

    // El síntoma que reportó el usuario: con el foco robado a la ✕, este Intro
    // cerraba el modal y se perdía todo lo escrito.
    await page.waitForTimeout(7000);
    await page.keyboard.press("Enter");

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Carmelo" })).toBeVisible();
  });

  test("el pie con Guardar se ve en una pantalla de portátil", async ({
    page,
    context,
    account,
  }) => {
    void account;
    // 768 px de alto es de las resoluciones más comunes; el modal de personaje
    // es el más alto de todos y se salía de la pantalla.
    await page.setViewportSize({ width: 1366, height: 768 });

    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña alta" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    await page.goto(`/campaigns/${campaign.id}/characters`);
    await page.getByRole("button", { name: "Añadir el primer personaje" }).click();

    // ratio: 1 exige el botón entero. Sin él, bastaba con que asomaran dos
    // píxeles para dar el test por bueno.
    await expect(page.getByRole("button", { name: "Añadir personaje" })).toBeInViewport({
      ratio: 1,
    });
    await expect(page.getByRole("button", { name: "Cancelar" })).toBeInViewport({ ratio: 1 });
  });

  test("Escape cierra el modal", async ({ page, account }) => {
    void account;

    await page.goto("/voices");
    await page.getByRole("button", { name: "Añadir voz" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
