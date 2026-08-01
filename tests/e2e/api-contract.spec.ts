import { expect, test } from "@playwright/test";
import { createCampaign, signUpViaApi, uniqueAccount } from "./fixtures";

test.describe("contrato de la API", () => {
  test("sin sesión, todo devuelve 401", async ({ request }) => {
    for (const path of [
      "/api/campaigns",
      "/api/scenes/x",
      "/api/renders/x",
      "/api/renders/x/audio",
      "/api/lines/x/audio",
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
    }

    for (const response of [
      await request.delete("/api/lines/x"),
      await request.post("/api/lines/x/audio"),
    ]) {
      expect(response.status()).toBe(401);
    }
  });

  test("una línea ajena o inexistente devuelve 404, también en su audio", async ({ request }) => {
    await signUpViaApi(request, uniqueAccount("lines"));

    // 404 y no 403: un 403 confirmaría que ese id existe.
    for (const response of [
      await request.get("/api/lines/inexistente/audio"),
      await request.post("/api/lines/inexistente/audio"),
      await request.delete("/api/lines/inexistente"),
    ]) {
      expect(response.status()).toBe(404);
    }
  });

  test("un usuario no puede leer la campaña de otro", async ({ browser }) => {
    // Cada contexto lleva su propia cookie: son dos sesiones distintas.
    const ownerContext = await browser.newContext();
    const intruderContext = await browser.newContext();

    await signUpViaApi(ownerContext.request, uniqueAccount("owner"));
    await signUpViaApi(intruderContext.request, uniqueAccount("intruder"));

    const campaign = await createCampaign(ownerContext.request, "Campaña privada");

    const asOwner = await ownerContext.request.get(`/api/campaigns/${campaign.id}/characters`);
    expect(asOwner.status()).toBe(200);

    // 404 y no 403: un 403 confirmaría que ese id existe.
    for (const path of [
      `/api/campaigns/${campaign.id}/characters`,
      `/api/campaigns/${campaign.id}/scenes`,
    ]) {
      const response = await intruderContext.request.get(path);
      expect(response.status(), path).toBe(404);
    }

    await ownerContext.close();
    await intruderContext.close();
  });

  test("rechaza payloads inválidos con 400 y detalle", async ({ request }) => {
    await signUpViaApi(request, uniqueAccount("validation"));

    const response = await request.post("/api/campaigns", { data: { name: "" } });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Datos inválidos" });
  });

  test("no se renderiza una escena sin líneas", async ({ request }) => {
    await signUpViaApi(request, uniqueAccount("norender"));
    const campaign = await createCampaign(request, "Campaña sin analizar");

    const scene = await request
      .post(`/api/campaigns/${campaign.id}/scenes`, {
        data: { title: "Escena vacía", rawText: "Algo de texto." },
      })
      .then((response) => response.json() as Promise<{ id: string }>);

    const response = await request.post(`/api/scenes/${scene.id}/render`);
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain("Analiza el texto");
  });

  test("editar el texto crudo devuelve la escena a DRAFT", async ({ request }) => {
    await signUpViaApi(request, uniqueAccount("draft"));
    const campaign = await createCampaign(request, "Campaña de borradores");

    const scene = await request
      .post(`/api/campaigns/${campaign.id}/scenes`, { data: { title: "Escena" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    const updated = await request
      .patch(`/api/scenes/${scene.id}`, { data: { rawText: "Texto nuevo." } })
      .then((response) => response.json() as Promise<{ status: string; rawText: string }>);

    expect(updated.status).toBe("DRAFT");
    expect(updated.rawText).toBe("Texto nuevo.");
  });

  test("no se puede asignar una línea a un personaje de otra campaña", async ({ request }) => {
    await signUpViaApi(request, uniqueAccount("crosscast"));
    const first = await createCampaign(request, "Campaña A");
    const second = await createCampaign(request, "Campaña B");

    const scene = await request
      .post(`/api/campaigns/${first.id}/scenes`, { data: { title: "Escena A" } })
      .then((response) => response.json() as Promise<{ id: string }>);

    const outsider = await request
      .get(`/api/campaigns/${second.id}/characters`)
      .then((response) => response.json() as Promise<{ id: string }[]>);

    const response = await request.patch(`/api/scenes/${scene.id}/lines`, {
      data: { lines: [{ id: "inexistente", characterId: outsider[0]?.id }] },
    });
    expect(response.status()).toBe(400);
  });
});
