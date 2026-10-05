#!/usr/bin/env node
// Capturas de tela do shell (definição de pronto da etapa (b)): PNGs com nomes fixos em docs/testes/shell/ e o README
// da pasta com uma linha por tela (rota, perfil de visualização, tema, viewport). Reutilizável por aba futura: acrescente
// uma entrada em CAPTURAS. Requisitos: app no ar (`next build && next start` ou `next dev`) em E2E_BASE_URL
// (padrão http://localhost:3000) e o Chromium do Playwright (CHROMIUM_PATH, padrão /opt/pw-browsers/chromium; vazio =
// o navegador instalado pelo próprio Playwright, como no CI). Uso: node scripts/shell/capturas.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "docs/testes/shell");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const executablePath = process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** Preferências/perfil gravados antes da primeira pintura (mesmas chaves do app: ws.prefs, ws.lab.viewer, ws.sidebar). */
const seed = (page, { theme = "claro", viewer = "EMPREGADO", sidebar = "open" } = {}) =>
  page.addInitScript(({ theme, viewer, sidebar }) => {
    try {
      localStorage.setItem("ws.prefs", JSON.stringify({ theme, language: "pt-BR", density: "normal", fontScale: 100, reduceMotion: true, deskSkin: "papel", backgroundId: "sem-arte" }));
      localStorage.setItem("ws.lab.viewer", viewer);
      localStorage.setItem("ws.sidebar", sidebar);
      localStorage.setItem("ws.lab.notifications", "padrao");
    } catch { /* ignore */ }
  }, { theme, viewer, sidebar });

/** Espera a hidratação (o sino só ganha a contagem depois que o React carregou o mock). */
const ready = (page) => page.getByTestId("bell").first().waitFor({ state: "visible" }).then(() => page.waitForFunction(() => /\(/.test(document.querySelector('[data-testid="bell"]')?.getAttribute("aria-label") ?? "")));

/** Uma captura: rota, perfil, tema, viewport e o que fazer antes de fotografar. */
export const CAPTURAS = [
  { file: "01-shell-mural-desktop.png", route: "/mural", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Shell completo: sidebar expandida, top bar e conteúdo do Mural", prepare: ready },
  { file: "02-shell-mobile.png", route: "/mural", perfil: "EMPREGADO", tema: "claro", viewport: MOBILE, descricao: "Celular: barra inferior (Mural · Buscar · + · Acervo · Perfil)", prepare: ready },
  { file: "03-sidebar-rail.png", route: "/mural", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, seed: { sidebar: "collapsed" }, descricao: "Sidebar recolhida (rail 72 px com tooltips)", prepare: ready },
  { file: "04-criar-sheet.png", route: "/mural", perfil: "EMPREGADO", tema: "claro", viewport: MOBILE, descricao: "Folha “+ Criar” aberta (Tarefa · Projeto · Plano · Sessão DECIA)", prepare: async (p) => { await ready(p); await p.getByTestId("bottom-create").click(); await p.getByRole("dialog", { name: "Criar" }).waitFor(); } },
  { file: "05-login.png", route: "/login", perfil: "VISITANTE", tema: "claro", viewport: DESKTOP, descricao: "RF2 — entrar (BFF /bff/auth/login)", prepare: (p) => p.getByRole("button", { name: "Entrar" }).waitFor() },
  { file: "06-cadastro.png", route: "/register", perfil: "VISITANTE", tema: "claro", viewport: DESKTOP, descricao: "RF1 — cadastro com tipo de perfil, campos e aceite dos termos", full: true, prepare: (p) => p.getByRole("checkbox").waitFor() },
  { file: "07-rf23-preferencias.png", route: "/settings?tab=aparencia", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF3/RF23 — tema, idioma, densidade, fonte, movimento, skin da Mesa e as 6 artes de fundo", full: true, prepare: async (p) => { await ready(p); await p.getByRole("radio", { name: /^Aura Geometry 6/ }).waitFor(); } },
  { file: "08-notificacoes-popover.png", route: "/mural", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Sino aberto com os itens mock (D-36)", prepare: async (p) => { await ready(p); await p.getByTestId("bell").click(); await p.getByRole("dialog", { name: "Notificações" }).getByRole("listitem").first().waitFor(); } },
  { file: "09-notificacoes-pagina.png", route: "/notifications", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Lista completa de notificações com simulação de estados", prepare: async (p) => { await ready(p); await p.getByRole("main").getByRole("listitem").first().waitFor(); } },
  { file: "10-central-perfil.png", route: "/mural", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Central de Perfil aberta (avatar, perfil, empresa/departamento, links, seletor do lab)", prepare: async (p) => { await ready(p); await p.getByTestId("user-panel").click(); await p.getByRole("dialog", { name: "Central de Perfil" }).waitFor(); } },
  { file: "11-tema-escuro.png", route: "/mural", perfil: "EMPREGADO", tema: "escuro", viewport: DESKTOP, descricao: "Shell no tema escuro", prepare: ready },
  { file: "12-tema-terminal.png", route: "/mural", perfil: "EMPREGADO", tema: "terminal", viewport: DESKTOP, descricao: "Shell no tema terminal (corpo em mono)", prepare: ready },
  { file: "13-lab-design-system.png", route: "/lab/design-system", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "/lab/design-system — tokens, glifos e componentes reais", full: true, prepare: async (p) => { await ready(p); await p.locator("code", { hasText: "--ws-accent" }).first().waitFor(); } },
];

export async function capturar(lista = CAPTURAS) {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  try {
    for (const c of lista) {
      const context = await browser.newContext({ viewport: c.viewport, locale: "pt-BR", colorScheme: "light", deviceScaleFactor: 1 });
      const page = await context.newPage();
      await seed(page, { theme: c.tema, viewer: c.perfil, ...(c.seed ?? {}) });
      await page.goto(`${BASE}${c.route}`, { waitUntil: "networkidle" });
      if (c.prepare) await c.prepare(page);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, c.file), fullPage: !!c.full, animations: "disabled" });
      console.log(`✓ ${c.file}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const linhas = lista.map((c) => `| [\`${c.file}\`](${c.file}) | \`${c.route}\` | ${c.perfil} | ${c.tema} | ${c.viewport.width}×${c.viewport.height} | ${c.descricao} |`);
  const readme = `# Capturas do shell (etapa (b))

Geradas por \`node scripts/shell/capturas.mjs\` (Playwright + Chromium em \`/opt/pw-browsers/chromium\`; app em \`next build && next start\`), perfil de visualização do lab (D-35) e tema gravados antes da primeira pintura. Para uma aba nova, acrescente uma entrada em \`CAPTURAS\` e rode o script de novo.

| Captura | Rota | Perfil | Tema | Viewport | O que mostra |
|---|---|---|---|---|---|
${linhas.join("\n")}

Capturas do smoke E2E (\`npx playwright test\`, \`e2e/shell.spec.ts\`) ficam em [\`e2e/\`](e2e/).
`;
  fs.writeFileSync(path.join(OUT, "README.md"), readme);
  console.log(`README em ${path.relative(ROOT, path.join(OUT, "README.md"))}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await capturar();
}
