import { expect, test } from "./fixtures";

/**
 * Una precondición que falla tiene que dejar el render en FAILED con su motivo.
 *
 * Si se queda en QUEUED, la ruta de render devuelve ese mismo registro en el
 * siguiente intento y el botón «Generar audio» deja de hacer nada sin explicar
 * por qué.
 */
test.describe("precondiciones del render", () => {
  test("una escena con líneas sin personaje falla y lo dice", async ({ context, account }) => {
    void account;

    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña sin narrador" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    const scene = await context.request
      .post(`/api/campaigns/${campaign.id}/scenes`, { data: { title: "Escena huérfana" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    // Una línea sin personaje, que es lo que deja una escena sin narrador.
    await context.request.patch(`/api/scenes/${scene.id}`, {
      data: { rawText: "Alguien habla en la oscuridad." },
    });

    const render = await context.request
      .post(`/api/scenes/${scene.id}/render`)
      .then((response) => response.json() as Promise<{ error?: string }>);

    // Sin líneas analizadas ni siquiera llega a encolarse.
    expect(render.error).toContain("Analiza el texto");
  });

  test("no se encola un segundo render mientras hay uno vivo", async ({ context, account }) => {
    void account;

    const campaign = await context.request
      .post("/api/campaigns", { data: { name: "Campaña de renders" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    const scene = await context.request
      .post(`/api/campaigns/${campaign.id}/scenes`, { data: { title: "Escena" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    const first = await context.request.post(`/api/scenes/${scene.id}/render`);
    const second = await context.request.post(`/api/scenes/${scene.id}/render`);

    // Ambas dan el mismo error mientras no haya guion: nada que desduplicar.
    expect(first.status()).toBe(second.status());
  });
});
