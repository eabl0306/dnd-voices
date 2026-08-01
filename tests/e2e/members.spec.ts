import { type APIRequestContext, type Browser, expect, test } from "@playwright/test";
import { type Account, createCampaign, signUpViaApi, uniqueAccount } from "./fixtures";

/** Dos sesiones distintas: cada contexto lleva su propia cookie. */
async function twoUsers(browser: Browser, prefix: string) {
  const ownerContext = await browser.newContext();
  const guestContext = await browser.newContext();

  const owner = uniqueAccount(`${prefix}-dm`);
  const guest = uniqueAccount(`${prefix}-pj`);
  await signUpViaApi(ownerContext.request, owner);
  await signUpViaApi(guestContext.request, guest);

  return { ownerContext, guestContext, owner, guest };
}

async function invite(
  request: APIRequestContext,
  campaignId: string,
  guest: Account,
): Promise<number> {
  const response = await request.post(`/api/campaigns/${campaignId}/members`, {
    data: { email: guest.email },
  });
  return response.status();
}

test.describe("mesa de la campaña", () => {
  test("un invitado pasa de no ver la campaña a trabajar en ella", async ({ browser }) => {
    const { ownerContext, guestContext, guest } = await twoUsers(browser, "mesa");
    const campaign = await createCampaign(ownerContext.request, "Campaña compartida");

    const scene = await ownerContext.request
      .post(`/api/campaigns/${campaign.id}/scenes`, {
        data: { title: "Escena de la mesa", rawText: "El puente cruje." },
      })
      .then((response) => response.json() as Promise<{ id: string }>);

    // Antes de invitarle es un desconocido: 404 en todo, no 403.
    for (const path of [
      `/api/campaigns/${campaign.id}/summary`,
      `/api/campaigns/${campaign.id}/characters`,
      `/api/scenes/${scene.id}`,
    ]) {
      expect((await guestContext.request.get(path)).status(), path).toBe(404);
    }

    expect(await invite(ownerContext.request, campaign.id, guest)).toBe(200);

    // Ya en la mesa: ve la campaña y su contenido, y puede escribir en él.
    for (const path of [
      `/api/campaigns/${campaign.id}/summary`,
      `/api/campaigns/${campaign.id}/characters`,
      `/api/scenes/${scene.id}`,
    ]) {
      expect((await guestContext.request.get(path)).status(), path).toBe(200);
    }

    const created = await guestContext.request.post(`/api/campaigns/${campaign.id}/characters`, {
      data: { name: "Personaje del invitado", voiceStrategy: "POOL" },
    });
    expect(created.status(), await created.text()).toBe(200);

    // Y la campaña le aparece en su propio listado.
    const listed = await guestContext.request
      .get("/api/campaigns")
      .then((response) => response.json() as Promise<{ id: string }[]>);
    expect(listed.map((entry) => entry.id)).toContain(campaign.id);

    await ownerContext.close();
    await guestContext.close();
  });

  test("la mesa la gestiona sólo el dueño, y borrar la campaña también", async ({ browser }) => {
    const { ownerContext, guestContext, owner, guest } = await twoUsers(browser, "gestion");
    const campaign = await createCampaign(ownerContext.request, "Campaña con jerarquía");
    expect(await invite(ownerContext.request, campaign.id, guest)).toBe(200);

    // El invitado ve quién está en la mesa pero no la toca.
    const members = await guestContext.request
      .get(`/api/campaigns/${campaign.id}/members`)
      .then((response) => response.json() as Promise<{ email: string; isOwner: boolean }[]>);
    expect(members.map((member) => member.email).sort()).toEqual(
      [owner.email, guest.email].sort(),
    );
    expect(members.find((member) => member.email === owner.email)?.isOwner).toBe(true);

    const tercero = uniqueAccount("gestion-otro");
    await signUpViaApi(await browser.newContext().then((c) => c.request), tercero);
    expect(await invite(guestContext.request, campaign.id, tercero)).toBe(404);

    // Borrar la campaña se lleva por delante el trabajo de toda la mesa.
    expect((await guestContext.request.delete(`/api/campaigns/${campaign.id}`)).status()).toBe(
      404,
    );

    await ownerContext.close();
    await guestContext.close();
  });

  test("quien ya no juega puede salirse solo, y el dueño no", async ({ browser }) => {
    const { ownerContext, guestContext, guest } = await twoUsers(browser, "salir");
    const campaign = await createCampaign(ownerContext.request, "Campaña que se abandona");
    expect(await invite(ownerContext.request, campaign.id, guest)).toBe(200);

    const own = await ownerContext.request
      .get(`/api/campaigns/${campaign.id}/members`)
      .then((response) => response.json() as Promise<{ userId: string; isOwner: boolean }[]>);
    const ownerId = own.find((member) => member.isOwner)?.userId;
    const guestId = own.find((member) => !member.isOwner)?.userId;

    // El dueño no puede quedarse fuera de su propia campaña.
    expect(
      (await ownerContext.request.delete(`/api/campaigns/${campaign.id}/members/${ownerId}`))
        .status(),
    ).toBe(400);

    expect(
      (await guestContext.request.delete(`/api/campaigns/${campaign.id}/members/${guestId}`))
        .status(),
    ).toBe(200);

    // Fuera de la mesa, vuelve a ser un desconocido.
    expect((await guestContext.request.get(`/api/campaigns/${campaign.id}/summary`)).status()).toBe(
      404,
    );

    await ownerContext.close();
    await guestContext.close();
  });

  test("invitar a alguien sin cuenta lo dice en vez de fallar en silencio", async ({ browser }) => {
    const { ownerContext, guestContext } = await twoUsers(browser, "sincuenta");
    const campaign = await createCampaign(ownerContext.request, "Campaña con invitación fallida");

    const response = await ownerContext.request.post(`/api/campaigns/${campaign.id}/members`, {
      data: { email: "nadie-usa-esto@example.test" },
    });
    expect(response.status()).toBe(404);
    expect((await response.json()).error).toContain("cree su cuenta");

    await ownerContext.close();
    await guestContext.close();
  });
});
