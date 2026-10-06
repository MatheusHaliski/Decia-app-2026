import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke do shell (etapa (b)): abre o app, navega por três grupos da sidebar, abre o sino e a Central de Perfil, troca tema
 * e idioma, visita /settings e /lab/design-system. As capturas vão para docs/testes/shell/ (evidência do PR).
 */
const SHOTS = "docs/testes/shell/e2e";
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });

// cada teste roda num contexto novo do navegador (localStorage vazio): preferências e perfil do lab começam do padrão
const alert = (page: Page) => page.getByRole("alert").filter({ hasText: /./ });
/** Espera a hidratação: o badge do sino só ganha a contagem depois que o React carregou o mock (evita clicar antes do JS). */
const ready = async (page: Page) => { await expect(page.getByTestId("bell")).toHaveAttribute("aria-label", /\(/); };

test("shell desktop: sidebar com 5 grupos, navegação por 3 grupos e estado ativo", async ({ page }) => {
  await page.goto("/mural");
  await ready(page);
  await expect(page.getByRole("banner")).toBeVisible();
  const sidebar = page.getByRole("navigation", { name: "Menu principal" });
  await expect(sidebar.getByRole("heading", { level: 2 })).toHaveText(["Descobrir", "Meu trabalho", "Criar", "Jogar e ganhar", "Gestão"]);
  await expect(sidebar.getByRole("link", { name: /^Mural/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mural");
  await expect(page.getByRole("tab", { name: "Mural da empresa" })).toBeVisible();
  await shot(page, "shell-desktop");

  await sidebar.getByRole("link", { name: /Acervo de Tarefas/ }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Acervo de Tarefas");
  await expect(page.getByText("RF41").first()).toBeVisible();

  await sidebar.getByRole("link", { name: "DECIA", exact: true }).click();
  await expect(page).toHaveURL(/\/decia$/);
  await expect(page.getByRole("tab", { name: "Precisa de atenção" })).toBeVisible();

  await sidebar.getByRole("link", { name: /DECIA Points/ }).click();
  await expect(page).toHaveURL(/\/points$/);
  await expect(page.getByText("RF42").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "O que esta aba vai fazer" })).toBeVisible();
});

test("sino de notificações e Central de Perfil (troca de perfil de visualização)", async ({ page }) => {
  await page.goto("/mural");
  await ready(page);
  const bell = page.getByTestId("bell");
  await expect(bell).toHaveAttribute("aria-label", /não lidas/);
  await bell.click();
  const panel = page.getByRole("dialog", { name: "Notificações" });
  await expect(panel.getByRole("listitem").first()).toBeVisible();
  await shot(page, "sino-aberto");
  await panel.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await expect(bell).toHaveAttribute("aria-label", "Notificações");
  await page.keyboard.press("Escape");

  await page.getByTestId("user-panel").click();
  const center = page.getByRole("dialog", { name: "Central de Perfil" });
  await expect(center.getByText("Pessoa Exemplo")).toBeVisible();
  await expect(center.getByRole("link", { name: /Preferências/ })).toHaveAttribute("href", "/settings");
  await shot(page, "central-de-perfil");
  await center.getByTestId("viewer-select").selectOption("ADMIN");
  await expect(page.getByRole("navigation", { name: "Menu principal" }).getByRole("link", { name: /^Admin/ })).toBeVisible();
  await center.getByTestId("viewer-select").selectOption("EMPREGADO");
  await page.keyboard.press("Escape");
  await page.goto("/admin");
  await expect(alert(page)).toContainText("403 ACESSO_NEGADO");
});

test("tema e idioma pelo menu da barra superior e tela /settings (RF3)", async ({ page }) => {
  await page.goto("/mural");
  await ready(page);
  await page.getByTestId("theme-menu").click();
  const menu = page.getByRole("menu", { name: "Tema e idioma" });
  await menu.getByRole("menuitemradio", { name: /Escuro/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "escuro");
  await menu.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("navigation", { name: "Main menu" })).toBeVisible();
  await page.keyboard.press("Escape");
  await shot(page, "tema-escuro-en");

  // a preferência persiste no recarregamento sem flash (script inline do <head>)
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "escuro");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/settings");
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Preferences");
  await page.getByRole("radio", { name: /Português/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await page.getByRole("radio", { name: "Terminal", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "terminal");
  await page.getByRole("radio", { name: "Compacta", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compacta");
  await page.getByRole("radio", { name: /^Aura Geometry 1/ }).click();
  await shot(page, "settings-aparencia");
  await page.goto("/desk");
  await expect(page.locator("[data-background='aura-geometry-01']")).toBeVisible();
  await shot(page, "mesa-arte-de-fundo");
});

test("/lab/design-system renderiza tokens, glifos e componentes", async ({ page }) => {
  await page.goto("/lab/design-system");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Design system");
  await expect(page.locator("code", { hasText: "--ws-accent" }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Glifos" }).click();
  await expect(page.getByRole("img", { name: "Mural" }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Botões" }).click();
  await expect(page.getByRole("button", { name: "Botão" }).first()).toBeVisible();
  await shot(page, "lab-design-system");
});

test("celular: barra inferior, folha + Criar e gaveta do menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mural");
  await ready(page);
  const bottom = page.getByRole("navigation", { name: "Navegação principal (celular)" });
  await expect(bottom).toBeVisible();
  await page.getByTestId("bottom-create").click();
  const sheet = page.getByRole("dialog", { name: "Criar" });
  await expect(sheet.getByRole("link", { name: /Criar Tarefa/ })).toBeVisible();
  await shot(page, "mobile-criar");
  await page.keyboard.press("Escape");
  await page.getByTestId("menu-toggle").click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Descobrir" })).toBeVisible();
  await shot(page, "mobile-menu");
});

test("auth: /login mostra ErrorState amigável sem backend", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/E-mail ou usuário/).fill("pessoa.exemplo");
  await page.getByLabel(/^Senha/).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(alert(page)).toContainText(/API indisponível|Algo deu errado/);
  await shot(page, "login-offline");
});
