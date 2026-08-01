import { expect, test } from "@playwright/test";
import { signUpViaUi, uniqueAccount } from "./fixtures";

test.describe("autenticación", () => {
  test("la raíz redirige a login sin sesión", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Entra a tu mesa" })).toBeVisible();
  });

  test("alta, cierre y reentrada de un usuario", async ({ page }) => {
    const account = uniqueAccount("auth");
    await signUpViaUi(page, account);
    await expect(page).toHaveURL(/\/campaigns$/);

    // Sin cookie de sesión la raíz vuelve a mandar a login.
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Contraseña").fill(account.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Campañas" })).toBeVisible();
  });

  test("una contraseña incorrecta muestra el error y no navega", async ({ page }) => {
    const account = uniqueAccount("badpass");
    await signUpViaUi(page, account);
    await page.context().clearCookies();

    await page.goto("/login");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Contraseña").fill("contraseña-incorrecta");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("una zona privada sin sesión manda a login", async ({ page }) => {
    await page.goto("/voices");
    await expect(page).toHaveURL(/\/login$/);
  });
});
