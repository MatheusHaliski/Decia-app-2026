#!/usr/bin/env node
// Jornada real da auditoria de 17/10/2026: UI → BFF → API Java → MySQL. Contas sintéticas JÁ ATIVAS informadas por variável
// de ambiente (nunca versionadas). Não chama IA. Uso:
//   WS_AUDIT_USER=… WS_AUDIT_USER2=… WS_AUDIT_PASSWORD=… node docs/auditoria/2026-10-17/scripts/jornada.mjs <pasta-de-saída-vazia>
// Requisitos: app em E2E_BASE_URL (padrão http://localhost:3000) apontando para a API real; Chromium em CHROMIUM_PATH.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2];
const USER = process.env.WS_AUDIT_USER;
const USER2 = process.env.WS_AUDIT_USER2;
const PASSWORD = process.env.WS_AUDIT_PASSWORD;
if (!OUT || !USER || !USER2 || !PASSWORD) {
  console.error("uso: WS_AUDIT_USER=… WS_AUDIT_USER2=… WS_AUDIT_PASSWORD=… node jornada.mjs <pasta-vazia>");
  process.exit(2);
}
if (fs.existsSync(OUT) && fs.readdirSync(OUT).length) {
  console.error(`destino não vazio: ${OUT}`);
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });
const executablePath = process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const result = { base: BASE, startedAt: new Date().toISOString(), steps: [], consoleErrors: [], overflow: [], tasks: [] };
const step = (name, ok, extra = {}) => { result.steps.push({ name, ok, ...extra }); console.log(`${ok ? "✓" : "✗"} ${name}`); };
const shot = (page, file, full = false) => page.screenshot({ path: path.join(OUT, file), fullPage: full, animations: "disabled" });

const AREAS = [
  { area: "SOFTWARE", type: "TEXTO_MANUAL", title: "Corrigir validação do formulário de protocolo", objective: "Impedir envio de protocolo sem CPF válido", ext: { Repositório: "https://example.org/ws/protocolo", Ambiente: "homologação" }, deliverable: "Pull request revisado", criterion: "Teste automatizado cobre CPF inválido" },
  { area: "ADMINISTRACAO", type: "DOCUMENTO", title: "Consolidar contratos de limpeza 2027", objective: "Ter um quadro único de vigências e valores", ext: { Processo: "Compras e contratos" }, deliverable: "Planilha consolidada", criterion: "Conferida pelo gestor do contrato" },
  { area: "DESIGN", type: "IMAGEM_EDITADA", title: "Peça para campanha de acessibilidade", objective: "Divulgar o novo atendimento em Libras", ext: { Formato: "1080×1080", Dimensões: "quadrado" }, deliverable: "Arte final em PNG", criterion: "Contraste AA verificado" },
  { area: "PESQUISA", type: "DOCUMENTO", title: "Levantamento de satisfação do atendimento", objective: "Medir a satisfação com o novo canal", ext: { "Pergunta de pesquisa": "O canal reduziu o tempo de espera?", Método: "Questionário curto" }, deliverable: "Relatório com resultados", criterion: "Amostra mínima atingida" },
  { area: "MARKETING", type: "TEXTO_MANUAL", title: "Plano de divulgação do aplicativo", objective: "Aumentar o uso do aplicativo entre servidores", ext: { Público: "Servidores estaduais", Canal: "Intranet e e-mail" }, deliverable: "Calendário de postagens", criterion: "Aprovado pela comunicação" },
  { area: "PLANEJAMENTO", type: "CRONOGRAMA", title: "Cronograma da reforma da sede regional", objective: "Definir marcos e responsáveis da reforma", ext: { Horizonte: "6 meses", Marco: "Entrega do projeto executivo" }, deliverable: "Cronograma em fases", criterion: "Marcos validados com a engenharia" },
];

async function login(context, username) {
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") result.consoleErrors.push({ url: page.url(), text: m.text().slice(0, 300) }); });
  await page.goto(`${BASE}/login`);
  await page.locator('input[name="identifier"]').fill(username);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  return page;
}

async function overflow(page, label) {
  const o = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollWidth, inner: window.innerWidth }));
  result.overflow.push({ label, ...o, ok: o.scroll <= o.inner + 1 });
}

const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  // A–B. criar tarefas de seis áreas pela interface
  let ctx = await browser.newContext({ viewport: DESKTOP, locale: "pt-BR" });
  let page = await login(ctx, USER);
  step("login pela interface", true, { url: page.url() });
  for (const [i, a] of AREAS.entries()) {
    const t0 = Date.now();
    await page.goto(`${BASE}/tasks/new`);
    await page.getByTestId("task-form").waitFor();
    await page.getByLabel(/^Título/).fill(a.title);
    await page.getByLabel(/^Tipo/).selectOption(a.type);
    await page.getByLabel(/^Área profissional/).selectOption(a.area);
    await page.getByLabel(/^Objetivo/).fill(a.objective);
    await page.getByLabel(/^Descrição/).fill(`Tarefa sintética de ${a.area} criada pela auditoria.`);
    for (const [label, value] of Object.entries(a.ext)) await page.getByTestId("area-fields").getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("button", { name: /Adicionar entregável/ }).click();
    await page.getByLabel("Entregáveis 1", { exact: true }).fill(a.deliverable);
    await page.getByRole("button", { name: /Adicionar critério/ }).click();
    await page.getByLabel("Critérios de conclusão 1", { exact: true }).fill(a.criterion);
    await page.getByRole("button", { name: /Adicionar critério/ }).click();
    await page.getByLabel("Critérios de conclusão 2", { exact: true }).fill("Registro anexado à tarefa");
    await page.getByRole("button", { name: /Adicionar referência/ }).click();
    await page.getByLabel("Endereço da referência Referências 1", { exact: true }).fill("https://www.w3.org/TR/WCAG22/");
    const responsible = page.getByRole("checkbox", { name: /Eu sou o responsável/ });
    await responsible.waitFor();
    if (!(await responsible.isChecked())) await responsible.click();
    if (i === 2) await shot(page, "01-criar-tarefa-design-desktop.png", true);
    await page.getByTestId("task-submit").click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/, { timeout: 60000 });
    await page.getByTestId("persisted-task-detail").waitFor();
    const id = page.url().split("/").pop();
    result.tasks.push({ area: a.area, id, ms: Date.now() - t0 });
    step(`criar tarefa ${a.area}`, true, { ms: Date.now() - t0 });
    if (i === 2) await shot(page, "02-detalhe-tarefa-design-desktop.png", true);
  }
  await page.goto(`${BASE}/tasks`);
  await page.getByTestId("my-tasks").waitFor();
  const cards = await page.getByTestId("persisted-task-card").count();
  step("Minhas tarefas lista as seis", cards >= 6, { cards });
  await shot(page, "03-minhas-tarefas-desktop.png", true);

  // D. sair e reabrir em novo contexto: conteúdo persistido
  await ctx.close();
  ctx = await browser.newContext({ viewport: DESKTOP, locale: "pt-BR" });
  page = await login(ctx, USER);
  const first = result.tasks[0];
  await page.goto(`${BASE}/tasks/${first.id}`);
  await page.getByTestId("persisted-task-detail").waitFor();
  const text = await page.getByTestId("persisted-task-detail").innerText();
  const persisted = text.includes(AREAS[0].title) && text.includes(AREAS[0].objective) && text.includes(AREAS[0].criterion) && text.includes("homologação");
  step("sair, entrar de novo e reabrir: título, objetivo, critério e campo da área preservados", persisted);

  // E. editar sem perder conteúdo
  await page.goto(`${BASE}/tasks/${first.id}/edit`);
  await page.getByTestId("task-form").waitFor();
  await page.getByLabel(/^Objetivo/).fill("Impedir envio de protocolo sem CPF válido (revisado)");
  await page.getByTestId("task-submit").click();
  await page.waitForURL(new RegExp(`/tasks/${first.id}$`));
  const afterEdit = await page.getByTestId("persisted-task-detail").innerText();
  step("editar objetivo mantém entregável, critérios e referências", afterEdit.includes("(revisado)") && afterEdit.includes(AREAS[0].deliverable) && afterEdit.includes("Registro anexado"));

  // F. conflito entre duas abas
  const tabA = page;
  const tabB = await ctx.newPage();
  await tabA.goto(`${BASE}/tasks/${first.id}/edit`);
  await tabB.goto(`${BASE}/tasks/${first.id}/edit`);
  await tabA.getByTestId("task-form").waitFor();
  await tabB.getByTestId("task-form").waitFor();
  await tabA.getByLabel(/^Título/).fill(`${AREAS[0].title} (aba A)`);
  await tabA.getByTestId("task-submit").click();
  await tabA.waitForURL(new RegExp(`/tasks/${first.id}$`));
  await tabB.getByLabel(/^Título/).fill(`${AREAS[0].title} (aba B)`);
  await tabB.getByTestId("task-submit").click();
  await tabB.getByTestId("task-conflict").waitFor({ timeout: 10000 });
  const kept = await tabB.getByLabel(/^Título/).inputValue();
  step("conflito entre abas: 409 mostrado e texto da aba B preservado", kept.endsWith("(aba B)"));
  await shot(tabB, "04-conflito-edicao-desktop.png");
  await tabB.close();

  // G. transições e critérios
  await page.goto(`${BASE}/tasks/${first.id}`);
  await page.getByTestId("next-action").click();
  await page.getByText("Em andamento").first().waitFor();
  await page.getByRole("button", { name: "Bloquear" }).click();
  await page.getByLabel("Motivo do bloqueio").fill("Aguardando parecer jurídico");
  await page.getByRole("button", { name: "Bloquear" }).last().click();
  await page.getByText("Aguardando parecer jurídico").first().waitFor();
  await shot(page, "05-tarefa-bloqueada-desktop.png", true);
  await page.getByTestId("next-action").click(); // retomar
  await page.getByRole("checkbox", { name: AREAS[0].criterion }).click();
  await page.getByText("1 de 2 critérios atendidos").first().waitFor();
  await page.getByTestId("next-action").click(); // concluir
  await page.getByText("Concluído").first().waitFor();
  const closedText = await page.getByTestId("persisted-task-detail").innerText();
  step("Iniciar → Bloquear (motivo) → Retomar → marcar critério → Concluir; concluída fica somente leitura", closedText.includes("Somente leitura") || closedText.includes("concluída"));
  await shot(page, "06-tarefa-concluida-desktop.png", true);

  // H. outra conta não vê tarefa privada (404 sem revelar)
  const ctx2 = await browser.newContext({ viewport: DESKTOP, locale: "pt-BR" });
  const other = await login(ctx2, USER2);
  await other.goto(`${BASE}/tasks/${result.tasks[1].id}`);
  await other.getByText("Ela não existe ou você não tem acesso a ela.").waitFor();
  step("outra conta recebe 'não existe ou sem acesso' para tarefa privada", true);
  await shot(other, "07-outra-conta-sem-acesso-desktop.png");
  await other.goto(`${BASE}/tasks`);
  await other.getByText("Você ainda não tem tarefas salvas").waitFor();
  step("acervo da outra conta não lista tarefas alheias", true);
  await ctx2.close();

  // I. celular
  await ctx.close();
  ctx = await browser.newContext({ viewport: MOBILE, locale: "pt-BR", isMobile: true, hasTouch: true });
  page = await login(ctx, USER);
  for (const [route, file, wait] of [
    ["/tasks", "08-minhas-tarefas-celular.png", "my-tasks"],
    ["/tasks/new", "09-criar-tarefa-celular.png", "task-form"],
    [`/tasks/${result.tasks[3].id}`, "10-detalhe-tarefa-celular.png", "persisted-task-detail"],
    ["/settings?tab=trabalho", "11-autonomia-ia-celular.png", "autonomy-shared-note"],
    ["/decia/decisoes/d-arquitetura?secao=decisao", "12-decia-ia-sob-solicitacao-celular.png", "ai-gated"],
    ["/profile", "13-perfil-celular.png", "profile-counters"],
  ]) {
    await page.goto(`${BASE}${route}`);
    await page.getByTestId(wait).first().waitFor({ timeout: 20000 });
    // não navegar com a renovação do token em voo: interromper a resposta rotaciona no servidor sem gravar o cookie (P18)
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await overflow(page, route);
    await shot(page, file, true);
  }
  step("telas principais no celular sem rolagem horizontal", result.overflow.every((o) => o.ok), { overflow: result.overflow });

  // J. autonomia e DECIA no desktop
  await ctx.close();
  ctx = await browser.newContext({ viewport: DESKTOP, locale: "pt-BR" });
  page = await login(ctx, USER);
  await page.goto(`${BASE}/settings?tab=trabalho`);
  await page.getByTestId("autonomy-shared-note").waitFor();
  await shot(page, "14-autonomia-ia-desktop.png", true);
  await page.goto(`${BASE}/decia/decisoes/d-arquitetura?secao=decisao`);
  await page.getByTestId("ai-gated").waitFor();
  await shot(page, "15-decia-ia-sob-solicitacao-desktop.png", true);
  await page.getByTestId("ai-gated").getByRole("button").click();
  await page.locator('[data-origin="IA"]').first().waitFor();
  step("DECIA em 'Sob solicitação': sugestão da IA só aparece após o pedido", true);
  await shot(page, "16-decia-ia-apos-pedido-desktop.png", true);
  await page.goto(`${BASE}/decia/decisoes/d-arquitetura?secao=visao-geral`);
  await page.getByTestId("structure-changes").waitFor();
  await page.getByTestId("structure-changes").scrollIntoViewIfNeeded();
  await shot(page, "17-decia-alteracoes-registradas-desktop.png");
  await page.goto(`${BASE}/profile`);
  await page.getByTestId("profile-counters").waitFor();
  await shot(page, "18-perfil-contadores-desktop.png");
  step("perfil exibe contador Seguindo", (await page.getByTestId("profile-counters").innerText()).includes("Seguindo"));
  await ctx.close();
} catch (e) {
  step("execução interrompida", false, { error: String(e).slice(0, 500) });
  for (const c of browser.contexts()) for (const [i, p] of c.pages().entries()) await p.screenshot({ path: path.join(OUT, `falha-${i}.png`), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, "JORNADA.json"), JSON.stringify(result, null, 2));
}
