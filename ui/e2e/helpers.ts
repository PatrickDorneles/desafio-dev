import { expect, type Page } from "@playwright/test";

/**
 * Shared helpers for the UI e2e suite (SC-005).
 *
 * Isolation strategy: every test registers a UNIQUE user (random email), so
 * tests never collide on the shared dev database.
 */

/** Random, unique email per call — guarantees a fresh user per test. */
export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Local `YYYY-MM-DD` for `<input type="date">` (mirrors `todayISODate`). */
export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Register on the landing and wait for the dashboard. */
export async function registerUser(
  page: Page,
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Login on the landing and wait for the dashboard. */
export async function loginUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Logout via the user menu and wait to land back on `/`. */
export async function logout(page: Page): Promise<void> {
  await page.locator('[data-slot="dashboard-user-menu"]').click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Header "Nova movimentação" button (the empty-state one is excluded). */
export function newTransactionButton(page: Page) {
  return page
    .locator("header")
    .getByRole("button", { name: "Nova movimentação" });
}

/** Summary cards region (`<section aria-label="Resumo financeiro">`). */
export function summaryRegion(page: Page) {
  return page.getByRole("region", { name: "Resumo financeiro" });
}

/**
 * The value container of a specific summary card ("Receitas" | "Despesas" |
 * "Saldo"). Scopes assertions to one card — the same amount can legitimately
 * appear on several cards (e.g. only an income: Receitas = Saldo = R$ 100,50).
 */
export function summaryCard(page: Page, label: string) {
  return summaryRegion(page).getByText(label, { exact: true }).locator("..");
}

/** Table row containing the given description text. */
export function transactionRow(page: Page, description: string) {
  return page.getByRole("row").filter({ hasText: description });
}

/**
 * Create a category through the "Gerenciar categorias" modal.
 * Assumes the modal is already open.
 */
export async function createCategory(
  page: Page,
  name: string,
  color?: string,
): Promise<void> {
  await page.getByLabel("Nome").fill(name);
  if (color) {
    await page.getByRole("button", { name: `Usar cor ${color}` }).click();
  }
  await page.getByRole("button", { name: "Adicionar categoria" }).click();
  await expect(
    page.getByRole("list", { name: "Suas categorias" }),
  ).toContainText(name);
}

/**
 * Create a transaction through the "Nova movimentação" modal.
 * Assumes the modal is already open.
 */
export async function createTransaction(
  page: Page,
  options: {
    type: "Receita" | "Despesa";
    amount: string;
    description: string;
    date?: string;
    category?: string;
  },
): Promise<void> {
  await page.getByRole("radio", { name: options.type }).click();
  await page.getByLabel("Valor").fill(options.amount);
  await page.getByLabel("Descrição").fill(options.description);
  await page.getByLabel("Data").fill(options.date ?? todayISO());
  if (options.category) {
    await page.getByRole("combobox", { name: "Categoria" }).click();
    await page.getByRole("option", { name: options.category }).click();
  }
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}