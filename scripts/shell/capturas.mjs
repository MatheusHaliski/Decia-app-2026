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
  // DECIA — decisão estruturada (RF29; docs/decia/04_DECISION_CARD.md e 05_WORKSPACE_E_NAVEGACAO.md). Dados DEMO.
  { file: "20-decia-precisa-de-atencao.png", route: "/decia", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "DECIA › Precisa de atenção: card HERO (aguardando sua decisão) e grupos da caixa de entrada", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("inbox-hero").waitFor(); } },
  { file: "21-decia-decisoes-grade.png", route: "/decia?tab=decisoes", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "DECIA › Decisões em grade (cards STANDARD) com filtros", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("view-grid").click(); await p.locator("[data-mode='STANDARD']").first().waitFor(); } },
  { file: "22-decia-decisoes-lista.png", route: "/decia?tab=decisoes", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "DECIA › Decisões em lista (cards COMPACT)", prepare: async (p) => { await ready(p); await p.getByTestId("view-list").click(); await p.locator("[data-mode='COMPACT']").first().waitFor(); } },
  { file: "23-decia-card-detail-frente.png", route: "/decia/decisoes/d-arquitetura", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Workspace › Visão geral: card DETAIL (frente) da decisão de arquitetura, prontidão e saúde", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("overview-card").waitFor(); } },
  { file: "24-decia-card-detail-verso.png", route: "/decia/decisoes/d-arquitetura", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Card DETAIL virado pelo teclado (F): verso “Por que esta opção?” com evidência, premissa, trade-off, risco, rejeitada e sensibilidade", prepare: async (p) => { await ready(p); const card = p.getByTestId("overview-card").locator("article"); await card.focus(); await p.keyboard.press("f"); await p.getByTestId("overview-card").locator("[data-face='back'][aria-hidden='false']").waitFor(); await card.scrollIntoViewIfNeeded(); } },
  { file: "25-decia-workspace-comparar.png", route: "/decia/decisoes/d-arquitetura?secao=comparar", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Workspace › Comparar: matriz ponderada (A 3,8 · B 3,75 · C 3,55), contribuições, divergência e sensibilidade", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("sensitivity").waitFor(); } },
  { file: "26-decia-workspace-decisao-guarda.png", route: "/decia/decisoes/d-arquitetura?secao=decisao", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Workspace › Decisão: diálogo Decidir com a guarda pré-decisão (avisos exigem confirmação)", prepare: async (p) => { await ready(p); await p.getByTestId("decide").click(); await p.getByTestId("guard-warnings").waitFor(); await p.getByRole("dialog").getByRole("textbox").fill("Custo e prazo pesam mais agora; revisar segurança em 30 dias."); } },
  { file: "27-decia-workspace-decisao-snapshot.png", route: "/decia/decisoes/d-fornecedor-suporte?secao=decisao", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Workspace › Decisão (fornecedor, DECIDIDA): “No momento da decisão” com SHA-256, separado do estado atual", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("snapshot-hash").waitFor(); } },
  { file: "28-decia-workspace-execucao-revisao.png", route: "/decia/decisoes/d-lancamento?secao=execucao", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Workspace › Execução e revisão (lançamento, REVISADA): resultado PARCIAL, processo ADEQUADO, previsões e Brier", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("quadrant").waitFor(); } },
  { file: "29-decia-decisoes-mobile.png", route: "/decia?tab=decisoes", perfil: "EMPREGADO", tema: "claro", viewport: MOBILE, descricao: "Celular: lista COMPACT de decisões (tocar abre o workspace)", full: true, prepare: async (p) => { await ready(p); await p.locator("[data-mode='COMPACT']").first().waitFor(); } },
  { file: "30-decia-decisao-vazia-ux.png", route: "/decia/decisoes/d-navegacao?secao=comparar", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "Decisão de UX em ENQUADRAMENTO: estados vazios com a próxima ação (alternativas, critérios)", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("alternatives").waitFor(); } },
  // Perfil + rede social (RF6, RF14–RF19, RF27, RF38 cards; lib/social). Dados DEMO em memória.
  { file: "40-perfil-proprio.png", route: "/profile", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF6 — meu perfil: cabeçalho com contadores reais, Delegadas a mim, notificações e Acervo Digital em grade", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("task-card").first().waitFor(); } },
  { file: "41-perfil-terceiros.png", route: "/u/ana.exemplo", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF16 — perfil de terceiros: sub-abas 1–5, Seguir, Hype público, itens filtrados pela visibilidade e barra social inline", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("task-card").first().waitFor(); } },
  { file: "42-perfil-chefe.png", route: "/departments/cpoe?tab=projetos", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF14 — página do departamento (perfil do chefe): chefe com link ao perfil pessoal, contadores, Seguir e projetos publicados", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("department-header").waitFor(); await p.getByTestId("project-card").first().waitFor(); } },
  { file: "43-perfil-empresa.png", route: "/companies/secretaria-exemplo", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF15 — página da empresa: contadores institucionais (sem cargo/Hype/DP), Seguir e projetos publicados", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("company-header").waitFor(); } },
  { file: "44-tarefa-expandida-social.png", route: "/tasks/t-ana-etp", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF19/RF41 — esquema de tarefa no layout ampliado com a barra social completa (curtir, reagir, comentar, salvar, compartilhar, remixar, delegar, retornar)", prepare: async (p) => { await ready(p); await p.getByTestId("task-detail").waitFor(); } },
  { file: "45-comentarios.png", route: "/tasks/t-ana-etp", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF26.CA03 — comentários com resposta de 1 nível, @menção, editar/excluir os próprios e contador de caracteres", prepare: async (p) => { await ready(p); await p.getByTestId("comment-thread").waitFor(); await p.getByTestId("comment-new-text").fill("Ótimo estudo, @bruno.exemplo — dá para usar no programa de vistorias."); await p.getByTestId("comment-new-submit").click(); await p.getByTestId("comment").first().getByTestId("comment-reply").click(); await p.getByTestId("comment-thread").scrollIntoViewIfNeeded(); await p.evaluate(() => { document.getElementById("comentarios")?.scrollIntoView({ block: "start" }); window.scrollBy(0, -90); }); } },
  { file: "46-compartilhar.png", route: "/tasks/t-ana-etp", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF26.CA05 — folha Compartilhar: Mural, sessão DECIA e link externo com validade (canais do ShareChannel)", prepare: async (p) => { await ready(p); await p.getByTestId("task-detail").waitFor(); await p.getByTestId("action-share").click(); await p.getByTestId("share-link").click(); await p.getByTestId("share-link-value").waitFor(); } },
  { file: "47-remixar.png", route: "/u/ana.exemplo", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF26.CA06 — Remixar: original, crédito e o que será copiado × o que fica no original", prepare: async (p) => { await ready(p); const card = p.locator("[data-task-id='t-ana-etp']"); await card.getByTestId("action-remix").click(); await p.getByTestId("remix-confirm").waitFor(); } },
  { file: "48-mural.png", route: "/mural", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF27 — Mural da empresa: compartilhamentos e projetos publicados com a barra social inline (só o que o viewer pode ver)", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("mural-entry").first().waitFor(); } },
  { file: "49-perfil-mobile.png", route: "/u/ana.exemplo", perfil: "EMPREGADO", tema: "claro", viewport: MOBILE, descricao: "Celular: perfil de terceiros sem rolagem horizontal (cards em coluna, barra social compacta)", full: true, prepare: async (p) => { await ready(p); await p.getByTestId("task-card").first().waitFor(); } },
  { file: "50-delegar-dialogo.png", route: "/tasks/t-pessoa-cronograma", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF18.CA03 — Delegar: busca de pessoas da empresa (motivo para quem não pode receber), mensagem e prazo", prepare: async (p) => { await ready(p); await p.getByTestId("task-detail").waitFor(); await p.getByTestId("action-delegate").click(); await p.getByTestId("delegate-search").fill("cpoe"); await p.getByRole("option", { name: /Chefe Exemplo/ }).click(); await p.getByTestId("delegate-message").fill("Pode revisar as datas das medições antes da sessão?"); } },
  { file: "51-delegadas-a-mim.png", route: "/profile", perfil: "EMPREGADO", tema: "claro", viewport: DESKTOP, descricao: "RF18.CA04/CA05 — Delegadas a mim: Aceitar/Recusar a proposta, Devolver a aceita (motivo ≥ 20) e Delegadas por mim", prepare: async (p) => { await ready(p); await p.getByTestId("assignment-inbox").waitFor(); await p.getByTestId("assignment-inbox").scrollIntoViewIfNeeded(); } },
];

export async function capturar(lista = CAPTURAS) {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  // CAPTURAS_SO=regex fotografa só as que casam (o README continua listando todas)
  const so = process.env.CAPTURAS_SO ? new RegExp(process.env.CAPTURAS_SO) : null;
  try {
    for (const c of lista) {
      if (so && !so.test(c.file)) continue;
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
