import { expect, test } from "@playwright/test";
import {
  createCategory,
  createTransaction,
  newTransactionButton,
  registerUser,
  summaryCard,
  todayISO,
  transactionRow,
  uniqueEmail,
} from "./helpers";

const PASSWORD = "senha12345";

test.describe("transactions (FR-016..FR-022, CA-006/007)", () => {
  test("jornada completa: criar receita e despesa, editar, excluir", async ({
    page,
  }) => {
    await registerUser(page, "Ana Souza", uniqueEmail(), PASSWORD);

    // --- create a category first (CA-008) ---
    await page.getByRole("button", { name: "Gerenciar categorias" }).click();
    await createCategory(page, "Alimentação", "#34d399");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // --- income transaction (CA-006) ---
    await newTransactionButton(page).click();
    await createTransaction(page, {
      type: "Receita",
      amount: "100,50",
      description: "Salário mensal",
      date: todayISO(),
      category: "Alimentação",
    });

    const incomeRow = transactionRow(page, "Salário mensal");
    await expect(incomeRow).toContainText("R$ 100,50");
    await expect(summaryCard(page, "Receitas")).toContainText(
      /R\$\s*100,50/,
    );

    // --- expense transaction ---
    await newTransactionButton(page).click();
    await createTransaction(page, {
      type: "Despesa",
      amount: "25,00",
      description: "Café da manhã",
      date: todayISO(),
    });

    const expenseRow = transactionRow(page, "Café da manhã");
    await expect(expenseRow).toContainText("R$ 25,00");
    await expect(summaryCard(page, "Saldo")).toContainText(/R\$\s*75,50/);

    // --- edit the expense (FR-019) ---
    await page
      .getByRole("button", { name: "Editar Café da manhã" })
      .click();
    await page.getByLabel("Valor").fill("30,00");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(transactionRow(page, "Café da manhã")).toContainText(
      "R$ 30,00",
    );
    await expect(summaryCard(page, "Saldo")).toContainText(/R\$\s*70,50/);

    // --- delete the expense (CA-007) ---
    await page
      .getByRole("button", { name: "Excluir Café da manhã" })
      .click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "Café da manhã",
    );
    await page
      .getByRole("button", { name: "Excluir", exact: true })
      .click();

    await expect(transactionRow(page, "Café da manhã")).toHaveCount(0);
    await expect(summaryCard(page, "Saldo")).toContainText(/R\$\s*100,50/);

    // --- category select exposes the created category (CA-008) ---
    await newTransactionButton(page).click();
    await page.getByRole("combobox", { name: "Categoria" }).click();
    await page.getByRole("option", { name: "Alimentação" }).click();
    // Select the option (closes the dropdown) and dismiss via "Cancelar" —
    // a bare Escape would only close the still-open combobox popover.
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});