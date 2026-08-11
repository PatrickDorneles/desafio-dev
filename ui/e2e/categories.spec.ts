import { expect, test } from "@playwright/test";
import {
  createCategory,
  createTransaction,
  newTransactionButton,
  registerUser,
  todayISO,
  transactionRow,
  uniqueEmail,
} from "./helpers";

const PASSWORD = "senha12345";

test.describe("categories (FR-023..FR-025, CA-008/009)", () => {
  test("jornada completa: criar, duplicar, editar, excluir categoria em uso", async ({
    page,
  }) => {
    await registerUser(page, "Ana Souza", uniqueEmail(), PASSWORD);
    const list = page.getByRole("list", { name: "Suas categorias" });

    // --- create a category with a color swatch (CA-008) ---
    await page.getByRole("button", { name: "Gerenciar categorias" }).click();
    await createCategory(page, "Alimentação", "#34d399");
    await expect(list).toContainText("Alimentação");

    // --- duplicate name → 409 shown inline, modal stays open (FR-025) ---
    await page.getByLabel("Nome").fill("Alimentação");
    await page.getByRole("button", { name: "Adicionar categoria" }).click();
    await expect(
      page
        .getByRole("dialog", { name: "Gerenciar categorias" })
        .getByRole("alert"),
    ).toContainText("Category name already exists");
    await expect(page.getByRole("dialog")).toBeVisible();

    // --- edit: rename "Alimentação" → "Mercado" ---
    await page.getByRole("button", { name: "Editar Alimentação" }).click();
    await page.getByLabel("Nome").fill("Mercado");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(list).toContainText("Mercado");
    await expect(list).not.toContainText("Alimentação");

    // --- create a transaction linked to "Mercado" ---
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await newTransactionButton(page).click();
    await createTransaction(page, {
      type: "Despesa",
      amount: "50,00",
      description: "Compra no mercado",
      date: todayISO(),
      category: "Mercado",
    });
    await expect(transactionRow(page, "Compra no mercado")).toContainText(
      "Mercado",
    );

    // --- delete a category in use → transaction keeps "—" (CA-009, FR-024) ---
    await page.getByRole("button", { name: "Gerenciar categorias" }).click();
    await page.getByRole("button", { name: "Excluir Mercado" }).click();
    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toContainText("sem categoria");
    await page
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    // "Mercado" was the only category, so the dialog falls back to the empty
    // state (the <ul> is removed from the DOM entirely).
    await expect(
      page.getByRole("dialog", { name: "Gerenciar categorias" }),
    ).toContainText("Nenhuma categoria ainda");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const row = transactionRow(page, "Compra no mercado");
    await expect(row).toContainText("Compra no mercado");
    await expect(row).toContainText("—");
  });

  test("estado vazio: usuário novo vê “Nenhuma categoria ainda” (FR-015)", async ({
    page,
  }) => {
    await registerUser(page, "Ana Souza", uniqueEmail(), PASSWORD);

    await page.getByRole("button", { name: "Gerenciar categorias" }).click();
    await expect(page.getByText("Nenhuma categoria ainda")).toBeVisible();
  });
});