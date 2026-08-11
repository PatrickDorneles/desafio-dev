import { defineConfig, devices } from "@playwright/test";

/**
 * UI e2e suite (SC-005): main journeys against the real stack.
 *
 * Two dev servers are started/reused by Playwright:
 *   1. API  (NestJS) on :3001 — health-checked via GET /health
 *   2. UI   (Next.js) on :3000 — health-checked via the root page
 *
 * Tests run serially (`fullyParallel: false`) because they share the dev
 * servers and each test registers a UNIQUE user (random email) for isolation.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm --prefix ../api run start:dev",
      url: "http://localhost:3001/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});