import { defineConfig, devices } from "@playwright/test";

/**
 * E2E mínimo do shell (ARQUITETURA §3.4 "Playwright smoke"). Localmente usa o Chromium já instalado em
 * /opt/pw-browsers/chromium (nunca rodar `playwright install` aqui, CHROMIUM_PATH sobrescreve); no CI o job `e2e`
 * instala o navegador do Playwright e deixa CHROMIUM_PATH vazio. Sobe `next dev` (ou reaproveita um servidor em :3000).
 */
const executablePath = process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "pt-BR",
    colorScheme: "light",
    ...devices["Desktop Chrome"],
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/mural",
    reuseExistingServer: true,
    timeout: 180_000,
    env: { PORT: "3000", NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:9", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
