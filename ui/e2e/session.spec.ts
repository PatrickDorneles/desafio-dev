import { expect, test } from "@playwright/test";
import { registerUser, uniqueEmail } from "./helpers";

const PASSWORD = "senha12345";

test.describe("session (FR-009/FR-010, CA-005)", () => {
  test("token inválido → /auth/me 401 → volta para /", async ({ page }) => {
    await registerUser(page, "Ana Souza", uniqueEmail(), PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);

    // Corrupt the stored token, as an expired/revoked one would be.
    await page.evaluate(() =>
      localStorage.setItem("dsf.auth.token", "invalid"),
    );
    await page.reload();

    // The dashboard must validate via GET /auth/me; a 401 clears the session
    // and redirects to the landing (FR-009/CA-005).
    await expect(page).toHaveURL(/\/$/);
  });
});