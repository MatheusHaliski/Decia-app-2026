import { expect, test, type Page } from "@playwright/test";

/**
 * Perfil + rede social (RF6, RF14–RF19, RF27; lib/social DEMO em memória): perfil de terceiros, curtir, comentar e
 * remixar uma tarefa e ver a cópia no meu Acervo; delegar e aceitar trocando o perfil de visualização; 404; celular.
 * A navegação entre telas é pelo próprio app (links), porque o repositório DEMO vive só na memória da aba.
 */
const ready = async (page: Page) => { await expect(page.getByTestId("bell")).toHaveAttribute("aria-label", /\(/); };

test("terceiros: curtir, comentar e remixar a tarefa da Ana → a cópia aparece no meu Acervo", async ({ page }) => {
  await page.goto("/u/ana.exemplo");
  await ready(page);
  await expect(page.getByTestId("profile-name")).toHaveText("Ana Exemplo");
  await expect(page.getByTestId("follow-button")).toHaveAttribute("aria-pressed", "true");
  const tabs = page.getByRole("tablist").first().getByRole("tab");
  await expect(tabs).toHaveCount(5);

  const card = page.locator("[data-task-id='t-ana-etp']");
  const like = card.getByTestId("action-like");
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect(like).toContainText("Curtir (3)");

  // remix de SIGILOSO: desabilitado com motivo
  const sig = page.locator("[data-task-id='t-ana-parecer-sigiloso']").getByTestId("action-remix");
  await expect(sig).toHaveAttribute("aria-disabled", "true");
  await expect(sig).toContainText("SIGILOSO");

  await card.getByTestId("action-comment").click();
  await expect(page).toHaveURL(/\/tasks\/t-ana-etp#comentarios/);
  await expect(page.getByTestId("task-detail")).toBeVisible();
  await expect(page.getByTestId("action-like").first()).toHaveAttribute("aria-pressed", "true"); // mesmo estado em memória
  await page.getByTestId("comment-new-text").fill("Vou reaproveitar no programa de vistorias, @ana.exemplo.");
  await page.getByTestId("comment-new-submit").click();
  await expect(page.getByTestId("comment").filter({ hasText: "Vou reaproveitar no programa de vistorias" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comentários (4)" })).toBeVisible();

  await page.getByTestId("action-remix").click();
  const dialog = page.getByRole("dialog", { name: /Remixar/ });
  await expect(dialog.getByTestId("remix-copies")).toContainText("título");
  await dialog.getByTestId("remix-confirm").click();
  await expect(dialog.getByTestId("remix-done")).toBeVisible();
  await dialog.getByTestId("remix-go-acervo").click();
  await expect(page).toHaveURL(/\/profile\?tab=acervo/);
  const copy = page.locator("[data-task-id^='t-remix-']");
  await expect(copy).toHaveCount(1);
  await expect(copy).toContainText("Estudo técnico preliminar — calçadas acessíveis no centro");
  await expect(copy.getByTestId("credit-line")).toContainText("remix de Ana Exemplo");
  await expect(copy).toHaveAttribute("data-variant", /RASCUNHO/);
});

test("delegar: Pessoa delega o cronograma ao Chefe; com o perfil CHEFE, aceita e o item entra no Acervo dele", async ({ page }) => {
  await page.goto("/tasks/t-pessoa-cronograma");
  await ready(page);
  await page.getByTestId("action-delegate").click();
  const dialog = page.getByTestId("delegate-dialog");
  await dialog.getByTestId("delegate-search").fill("@chefe");
  await dialog.getByRole("option", { name: /Chefe Exemplo/ }).click();
  await dialog.getByTestId("delegate-message").fill("Pode revisar as datas?");
  await dialog.getByTestId("delegate-confirm").click();
  await expect(page.getByTestId("delegation-line")).toContainText("Delegada a Chefe Exemplo · aguardando");

  await page.getByTestId("user-panel").click();
  const center = page.getByRole("dialog", { name: "Central de Perfil" });
  await center.getByTestId("viewer-select").selectOption("CHEFE");
  await center.getByRole("link", { name: /Meu perfil/ }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByTestId("profile-name")).toHaveText("Chefe Exemplo");
  const row = page.getByTestId("assignment-row").filter({ hasText: "Cronograma de obras do segundo semestre" });
  await expect(row).toHaveAttribute("data-status", "PROPOSTA");
  await expect(row).toContainText("Pode revisar as datas?");
  await row.getByTestId("assignment-accept").click();
  await expect(row).toHaveAttribute("data-status", "ACEITA");
  const acervo = page.locator("[data-task-id='t-pessoa-cronograma']");
  await expect(acervo).toBeVisible();
  await expect(acervo.getByTestId("delegation-line")).toContainText("Delegada por Pessoa Exemplo · aceita por Chefe Exemplo");
});

test("visitante lê tarefa PUBLICA (ações pedem login) e recebe 403 numa tarefa da empresa", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("ws.lab.viewer", "VISITANTE"); } catch { /* ignore */ } });
  await page.goto("/tasks/t-ana-etp");
  await expect(page.getByTestId("task-detail")).toBeVisible();
  await expect(page.getByTestId("action-like").first()).toHaveAttribute("aria-disabled", "true");
  await page.goto("/tasks/t-ana-planilha");
  await expect(page.getByRole("alert").filter({ hasText: "403 ACESSO_NEGADO" })).toBeVisible();
  await expect(page.getByTestId("task-detail")).toHaveCount(0);
});

test("username desconhecido → 404", async ({ page }) => {
  const res = await page.goto("/u/nao.existe");
  expect(res?.status()).toBe(404);
});

test.describe("celular", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("perfil de terceiros e Mural sem rolagem horizontal", async ({ page }) => {
    for (const route of ["/u/ana.exemplo", "/mural", "/tasks/t-ana-etp", "/profile"]) {
      await page.goto(route);
      await ready(page);
      await expect(page.locator("[data-testid='task-card'], [data-testid='project-card']").first()).toBeVisible();
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, route).toBeLessThanOrEqual(390);
    }
  });
});
