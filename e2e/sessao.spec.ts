import { expect, test, type Page } from "@playwright/test";

/**
 * Sessão no front (Bloco 4, D-60–D-62) no navegador de verdade: rota protegida sem sessão → /login?next=; `next` externo ignorado;
 * cabeçalhos de segurança; aba Sessões (API simulada por page.route — sem backend no E2E); logout numa aba sai nas outras.
 */
const API = "http://127.0.0.1:9";
const SESSIONS = [
  { id: "s-atual", deviceName: "Chromium (E2E)", lastActiveAt: "2026-10-06T12:00:00Z", expiresAt: "2026-10-07T12:00:00Z", persistent: false, current: true },
  { id: "s-celular", deviceName: "Chrome no celular", lastActiveAt: "2026-10-05T09:30:00Z", expiresAt: "2026-11-04T09:30:00Z", persistent: true, current: false },
];
const ready = async (page: Page) => { await expect(page.getByTestId("bell")).toHaveAttribute("aria-label", /\(/); };

test.describe("sem sessão", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("rota protegida redireciona para /login?next=<caminho>; rota do visitante continua aberta", async ({ page }) => {
    await page.goto("/settings?tab=sessoes");
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings%3Ftab%3Dsessoes$/);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await page.goto("/mural");
    await expect(page).toHaveURL(/\/mural$/);
  });

  test("next externo é ignorado: depois do login volta ao Mural da própria origem", async ({ page }) => {
    await page.route("**/bff/auth/login", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accessToken: "a.e30.s" }) }));
    await page.goto("/login?next=%2F%2Fevil.example%2Froubar");
    await page.getByLabel(/E-mail ou usuário/).fill("pessoa.exemplo");
    await page.getByLabel(/^Senha/).fill("senha-de-teste-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL("http://localhost:3000/mural");
  });

  test("next interno é respeitado depois do login", async ({ page }) => {
    await page.route("**/bff/auth/login", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accessToken: "a.e30.s" }) }));
    await page.goto("/login?next=%2Fu%2Fana.exemplo");
    await page.getByLabel(/E-mail ou usuário/).fill("pessoa.exemplo");
    await page.getByLabel(/^Senha/).fill("senha-de-teste-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/u\/ana\.exemplo$/);
  });
});

test("cabeçalhos de segurança na resposta: CSP com nonce, frame-ancestors, HSTS, Referrer-Policy e Permissions-Policy", async ({ page }) => {
  const res = (await page.goto("/mural"))!;
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["x-frame-options"]).toBe("DENY");
});

test("Configurações › Sessões: lista com a atual marcada e encerra outra depois de confirmar", async ({ page }) => {
  let list = SESSIONS;
  await page.route(`${API}/api/auth/sessions**`, async (r) => {
    if (r.request().method() === "DELETE") { list = SESSIONS.filter((s) => s.current); return r.fulfill({ status: 204 }); }
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(list) });
  });
  await page.goto("/settings?tab=sessoes");
  await ready(page);
  const items = page.getByTestId("session-item");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText("Esta sessão");
  await items.nth(1).getByTestId("session-revoke").click();
  const dialog = page.getByRole("dialog", { name: "Encerrar esta sessão?" });
  await expect(dialog).toContainText("Chrome no celular");
  await dialog.getByTestId("session-confirm").click();
  await expect(items).toHaveCount(1);
});

test("logout numa aba encerra a sessão nas outras abas (BroadcastChannel)", async ({ context }) => {
  const settings = await context.newPage();
  await settings.route(`${API}/api/auth/sessions**`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSIONS) }));
  await settings.goto("/settings?tab=sessoes");
  await ready(settings);
  const mural = await context.newPage();
  await mural.goto("/mural");
  await ready(mural);
  await mural.getByTestId("user-panel").click();
  await mural.getByRole("dialog", { name: "Central de Perfil" }).getByRole("button", { name: "Sair" }).click();
  await expect(mural).toHaveURL(/\/login/);
  // a outra aba sai sozinha, com o motivo e o caminho de volta
  await expect(settings).toHaveURL(/\/login\?next=%2Fsettings%3Ftab%3Dsessoes&reason=signed-out$/);
  await expect(settings.getByTestId("login-reason")).toContainText("em todas as abas");
  // e o cookie-sinal foi apagado pelo BFF: voltar à rota protegida pede login de novo
  await settings.goto("/tasks");
  await expect(settings).toHaveURL(/\/login\?next=%2Ftasks$/);
});
