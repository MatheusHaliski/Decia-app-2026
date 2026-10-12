import { expect, test, type Page } from "@playwright/test";

/**
 * DECIA — decisão estruturada (RF29; docs/decia/04_DECISION_CARD.md, 05_WORKSPACE_E_NAVEGACAO.md): caixa de entrada,
 * Decisões, workspace da decisão de arquitetura, flip do card pelo teclado, toque no celular, 404 e "Nova decisão".
 */
const ready = async (page: Page) => { await expect(page.getByTestId("bell")).toHaveAttribute("aria-label", /\(/); };

test("desktop: /decia → Decisões → workspace da arquitetura → flip do card pelo teclado", async ({ page }) => {
  await page.goto("/decia");
  await ready(page);
  await expect(page.getByRole("tab", { name: "Precisa de atenção" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("inbox-hero")).toContainText("Qual funcionalidade entra na Sprint 5?");

  await page.getByRole("tab", { name: "Decisões" }).click();
  await expect(page).toHaveURL(/tab=decisoes/);
  await page.getByTestId("view-grid").click();
  await page.getByRole("link", { name: /Qual infraestrutura devemos usar/ }).click();
  await expect(page).toHaveURL(/\/decia\/decisoes\/d-arquitetura/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Qual infraestrutura devemos usar");

  const card = page.getByTestId("overview-card").locator("article");
  await card.focus();
  await page.keyboard.press("f");
  const back = page.getByTestId("overview-card").locator("[data-face='back']");
  await expect(back).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByRole("heading", { name: "Por que esta opção?" })).toBeFocused();
  await expect(back).toContainText("Custo 20→17 % faz B liderar");
  const flip = page.getByTestId("overview-card").getByTestId("flip");
  await expect(flip).toHaveAttribute("aria-pressed", "true");
  await flip.focus();
  await page.keyboard.press("Enter");
  await expect(flip).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("overview-card").locator("[data-face='front']")).toHaveAttribute("aria-hidden", "false");

  await page.getByTestId("section-comparar").click();
  await expect(page).toHaveURL(/secao=comparar/);
  await expect(page.getByTestId("weight-sum")).toHaveText("Os pesos somam 100 %");
  await page.getByLabel("Peso de Custo (%)").fill("25");
  await expect(page.getByTestId("weight-sum")).toHaveText("Os pesos somam 105 % — ajuste para 100 %");
});

test.describe("celular (toque)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("tocar no card da lista abre o workspace", mobileFlow);
});

async function mobileFlow({ page }: { page: Page }) {
  await page.goto("/decia?tab=decisoes");
  await ready(page);
  const compact = page.locator("[data-mode='COMPACT']").filter({ hasText: "Qual fornecedor de suporte" });
  await expect(compact).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
  await compact.tap();
  await expect(page).toHaveURL(/\/decia\/decisoes\/d-fornecedor-suporte/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Qual fornecedor de suporte devemos contratar?");
}

test("id desconhecido → 404; + Criar → ?acao=nova abre “Nova decisão” e cria no repositório em memória", async ({ page }) => {
  const res = await page.goto("/decia/decisoes/nao-existe");
  expect(res?.status()).toBe(404);

  await page.goto("/decia?acao=nova");
  await ready(page);
  const dialog = page.getByRole("dialog", { name: "Nova decisão" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Pergunta decisória/).fill("Qual ferramenta de chat interno devemos adotar?");
  await dialog.getByLabel("Impacto").selectOption("ALTO");
  await expect(dialog.getByText("Sugerida: Profunda")).toBeVisible();
  await dialog.getByTestId("create-decision").click();
  await expect(page).toHaveURL(/\/decia\/decisoes\/d-nova-/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qual ferramenta de chat interno devemos adotar?");
});
