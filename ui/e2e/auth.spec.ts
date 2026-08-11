import { expect, test } from "@playwright/test";
import {
  loginUser,
  logout,
  newTransactionButton,
  registerUser,
  uniqueEmail,
} from "./helpers";

const PASSWORD = "senha12345";

test.describe("auth (FR-001..FR-006, CA-001/002/004/012)", () => {
  test("cadastro com dados válidos → redireciona para /dashboard (CA-001)", async ({
    page,
  }) => {
    await registerUser(page, "Ana Souza", uniqueEmail(), PASSWORD);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(newTransactionButton(page)).toBeVisible();
  });

  test("logout → volta para / e /dashboard redireciona para / (CA-012)", async ({
    page,
  }) => {
    await registerUser(page, "Ana Souza", uniqueEmail(), PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);

    await logout(page);
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
  });

  test("login com as mesmas credenciais → /dashboard (FR-003)", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await registerUser(page, "Ana Souza", email, PASSWORD);
    await logout(page);

    await loginUser(page, email, PASSWORD);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(newTransactionButton(page)).toBeVisible();
  });

  test("login com senha errada → erro inline, permanece na landing (CA-002)", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await registerUser(page, "Ana Souza", email, PASSWORD);
    await logout(page);

    await page.goto("/");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(
      page.getByRole("tabpanel", { name: "Entrar" }).getByRole("alert"),
    ).toContainText("Invalid credentials");
    await expect(page).toHaveURL(/\/$/);
  });

  test("cadastro com e-mail já existente → erro 409 inline (FR-004)", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await registerUser(page, "Ana Souza", email, PASSWORD);
    await logout(page);

    await page.getByRole("tab", { name: "Criar conta" }).click();
    await page.getByLabel("Nome").fill("Ana Souza");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(
      page.getByRole("tabpanel", { name: "Criar conta" }).getByRole("alert"),
    ).toContainText("Email already registered");
    await expect(page).toHaveURL(/\/$/);
  });
});