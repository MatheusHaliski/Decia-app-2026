import { defineConfig, devices } from "@playwright/test";

/**
 * E2E mínimo do shell (ARQUITETURA §3.4 "Playwright smoke"). Localmente usa o Chromium já instalado em
 * /opt/pw-browsers/chromium (nunca rodar `playwright install` aqui, CHROMIUM_PATH sobrescreve); no CI o job `e2e`
 * instala o navegador do Playwright e deixa CHROMIUM_PATH vazio. Sobe o BUILD DE PRODUÇÃO (`next build && next start`) ou
 * reaproveita um servidor em :3000. Não `next dev`: lá cada rota compila sob demanda e cada compilação dispara um evento HMR
 * ("[Fast Refresh] rebuilding" / "had to perform a full reload") em TODAS as páginas abertas pelos dois workers — a página
 * em teste recarrega ou demora a hidratar no meio do passo (sino sem contagem, tema perdido no reload, repositório DEMO em
 * memória zerado). Reproduzido também no main anterior ao Bloco 4 (4/55 com --repeat-each=5); o Bloco 4 aumentou a chance
 * porque a sessão simulada faz cada página chamar o BFF e a API (mais rotas compiladas durante os testes).
 */
const executablePath = process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

/**
 * Sessão SIMULADA para as specs do lab (Bloco 4, D-60): o middleware só deixa entrar nas rotas protegidas com o cookie-sinal
 * `ws_rt_h=1`, e o BFF só tenta renovar com um `ws_rt` presente (sem backend, a API responde 502 e a sessão fica como está).
 * Valores fictícios, sem segredo. `e2e/sessao.spec.ts` zera isto para provar o redirecionamento sem sessão.
 */
export const E2E_SESSION_COOKIES = [
  { name: "ws_rt_h", value: "1", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Strict" as const },
  { name: "ws_rt", value: "e2e-sessao-simulada", domain: "localhost", path: "/bff/auth", expires: -1, httpOnly: true, secure: false, sameSite: "Strict" as const },
];

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
    storageState: { cookies: E2E_SESSION_COOKIES, origins: [] },
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/mural",
    reuseExistingServer: true,
    timeout: 300_000, // inclui o `next build` (o tempo de cada teste não muda)
    // as specs exercitam o laboratório (repositório DEMO e seletor de perfis), que só existe com NEXT_PUBLIC_WS_LAB=on (D-146)
    env: { PORT: "3000", NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:9", NEXT_PUBLIC_WS_LAB: "on", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
