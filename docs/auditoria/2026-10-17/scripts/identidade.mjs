#!/usr/bin/env node
// Jornada real de identidade (17/10/2026, RF1–RF3, D-143–D-146): UI → BFF → API Java → MySQL, sem IA. Conta sintética JÁ ATIVA por
// variável de ambiente (nunca versionada). Cobre: aba anônima = visitante, cadastro com tipo e aceite dos termos da Velion, páginas
// /termos e /privacidade, login sem "manter conectado" = cookie de sessão, ativar 2FA, login com código e com código de recuperação,
// logout em uma aba encerra as outras, excluir conta com modal e reativar, desligar o 2FA no fim (a conta volta ao estado inicial).
//   WS_AUDIT_USER=… WS_AUDIT_PASSWORD=… node docs/auditoria/2026-10-17/scripts/identidade.mjs <pasta-de-saída-vazia>
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2];
const USER = process.env.WS_AUDIT_USER;
const PASSWORD = process.env.WS_AUDIT_PASSWORD;
if (!OUT || !USER || !PASSWORD) { console.error("uso: WS_AUDIT_USER=… WS_AUDIT_PASSWORD=… node identidade.mjs <pasta-vazia>"); process.exit(2); }
if (fs.existsSync(OUT) && fs.readdirSync(OUT).length) { console.error(`destino não vazio: ${OUT}`); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const executablePath = process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const result = { base: BASE, startedAt: new Date().toISOString(), steps: [], consoleErrors: [], overflow: [] };
const step = (name, ok, extra = {}) => { result.steps.push({ name, ok, ...extra }); console.log(`${ok ? "✓" : "✗"} ${name}`); };
const shot = (page, file, full = false) => page.screenshot({ path: path.join(OUT, file), fullPage: full, animations: "disabled" });

// TOTP (RFC 6238, SHA-1, 6 dígitos, 30 s) — o mesmo algoritmo do aplicativo autenticador
function base32(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, val = 0; const out = [];
  for (const c of s.replace(/\s/g, "").toUpperCase()) { val = (val << 5) | A.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
function totp(secret, at = Date.now()) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const h = crypto.createHmac("sha1", base32(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}
/** Espera o próximo passo de 30 s (o mesmo código não entra duas vezes). */
const nextWindow = async () => { const ms = 30_000 - (Date.now() % 30_000) + 1_500; await new Promise((r) => setTimeout(r, ms)); };

async function newPage(browser, viewport = DESKTOP) {
  const ctx = await browser.newContext({ viewport, locale: "pt-BR" }); // cada contexto é uma janela anônima: sem cookies
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") result.consoleErrors.push(m.text().slice(0, 300)); });
  return { ctx, page };
}
async function overflow(page, label) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (o > 1) result.overflow.push({ label, px: o });
}
async function login(page, { code } = {}) {
  await page.goto(`${BASE}/login?next=/settings?tab=conta`);
  await page.locator('input[name="identifier"]').fill(USER);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  if (code !== undefined) {
    await page.getByTestId("login-2fa-code").waitFor();
    await page.getByTestId("login-2fa-code").fill(code);
    await page.getByRole("button", { name: "Entrar" }).click();
  }
  await page.waitForURL((u) => new URL(u).pathname === "/settings");
  // no celular o @usuário fica oculto na barra (só o avatar): confere o texto, não a visibilidade
  await page.waitForFunction((u) => document.querySelector('[data-testid="user-panel-handle"]')?.textContent === `@${u}`, USER);
}

const browser = await chromium.launch({ executablePath });
let secret = null;
let recovery = [];
try {
  // 1. aba anônima: visitante e rota protegida vai para o login
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/mural`);
    const handle = await page.getByTestId("user-panel-handle").textContent({ timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('[data-testid="user-panel-handle"]')?.textContent === "Visitante");
    step("aba anônima mostra Visitante (sem conta de demonstração)", true, { handle });
    await page.goto(`${BASE}/settings`);
    step("rota protegida sem sessão leva ao login", /\/login\?next=%2Fsettings/.test(page.url()), { url: page.url() });
    await shot(page, "id-01-anonima-login-desktop.png");
    await ctx.close();
  }
  // 2. cadastro: tipo de usuário e aceite dos termos da Velion (conta descartável; para em /verify-email)
  {
    const { ctx, page } = await newPage(browser, MOBILE);
    await page.goto(`${BASE}/register`);
    const terms = page.getByTestId("register-terms");
    const ok = await terms.getByText(/Velion, dona da Orange Social/).isVisible() && (await terms.getByRole("link", { name: "Termos de Uso" }).getAttribute("href")) === "/termos";
    await page.getByText("Empresa ou órgão", { exact: false }).first().click().catch(() => {});
    await shot(page, "id-02-cadastro-tipo-termos-celular.png", true);
    await overflow(page, "cadastro-celular");
    const u = `sint.${crypto.randomBytes(3).toString("hex")}`;
    await page.getByRole("radio").first().click();
    await page.locator('input[name="fullName"]').fill("Conta Sintética Descartável");
    await page.locator('input[name="username"]').fill(u);
    await page.locator('input[name="email"]').fill(`${u}@exemplo.invalid`);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="confirm"]').fill(PASSWORD);
    await page.getByRole("button", { name: /Criar conta|Cadastrar/ }).click();
    const blocked = await page.getByText("É preciso aceitar os Termos de Uso e a Política de Privacidade.").first().waitFor({ timeout: 10000 }).then(() => true, () => false);
    await terms.getByRole("checkbox").click();
    await page.getByRole("button", { name: /Criar conta|Cadastrar/ }).click();
    await page.waitForURL(/\/verify-email/, { timeout: 20000 });
    step("cadastro exige aceitar os termos da Velion e escolhe o tipo de usuário", ok && blocked, { blockedWithoutTerms: blocked });
    await ctx.close();
  }
  // 3. termos públicos com as tags a preencher
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/termos`);
    const tags = await page.locator("mark[data-legal-tag]").count();
    step("/termos público, rascunho da Velion com as tags destacadas", (await page.getByTestId("legal-draft-note").isVisible()) && tags > 0, { tags });
    await shot(page, "id-03-termos-desktop.png");
    await page.goto(`${BASE}/privacidade`);
    step("/privacidade público", await page.getByTestId("legal-document").isVisible());
    await ctx.close();
  }
  // 4. login sem "manter conectado" → cookies de sessão; ativar 2FA
  const A = await newPage(browser);
  await login(A.page);
  const cookies = await A.ctx.cookies();
  const rt = cookies.find((c) => c.name === "ws_rt");
  step("sem 'manter conectado' o refresh é cookie de sessão (fechar o navegador encerra)", !!rt && rt.expires === -1 && rt.httpOnly, { expires: rt?.expires });
  await A.page.getByTestId("two-factor-enable-open").click();
  await A.page.getByRole("dialog").locator('input[name="currentPassword"]').fill(PASSWORD);
  await A.page.getByRole("dialog").getByRole("button", { name: "Continuar" }).click();
  secret = (await A.page.getByTestId("two-factor-secret").textContent()).replace(/\s/g, "");
  const otpauth = await A.page.getByTestId("two-factor-otpauth").getAttribute("href");
  await shot(A.page, "id-04-2fa-configurar-desktop.png");
  await A.page.getByTestId("two-factor-code").fill(totp(secret));
  await A.page.getByRole("button", { name: "Confirmar e ativar" }).click();
  await A.page.getByTestId("recovery-codes").waitFor();
  recovery = (await A.page.getByTestId("recovery-codes").locator("li").allTextContents()).map((s) => s.trim());
  await shot(A.page, "id-05-2fa-codigos-desktop.png");
  await A.page.getByTestId("recovery-codes-done").click();
  step("2FA ativado: segredo, link otpauth e 10 códigos de recuperação", recovery.length === 10 && /^otpauth:\/\/totp\//.test(otpauth ?? ""), { otpauthScheme: otpauth?.slice(0, 15) });

  // 5. outro aparelho: senha sozinha não entra; código de recuperação entra uma vez
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/login?next=/settings?tab=conta`);
    await page.locator('input[name="identifier"]').fill(USER);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByTestId("login-2fa-asked").waitFor();
    await shot(page, "id-06-login-pede-codigo-desktop.png");
    await page.getByTestId("login-2fa-code").fill(recovery[0]);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((u) => new URL(u).pathname === "/settings");
    const summary = await page.getByTestId("two-factor-summary").textContent();
    step("login com código de recuperação; restam 9", /restantes: 9/.test(summary ?? ""), { summary });
    await ctx.close();
  }
  // 6. logout em uma aba encerra a outra aba do mesmo navegador
  {
    const second = await A.ctx.newPage();
    await second.goto(`${BASE}/settings?tab=sessoes`);
    await second.getByTestId("user-panel-handle").filter({ hasText: `@${USER}` }).waitFor();
    await A.page.getByTestId("user-panel").click();
    await A.page.getByRole("button", { name: "Sair" }).click();
    await A.page.waitForURL(/\/login/);
    await second.waitForURL(/\/login\?.*reason=signed-out/, { timeout: 15000 });
    await shot(second, "id-07-logout-outra-aba-desktop.png");
    step("logout encerra a sessão em todas as abas", true, { url: second.url() });
    await second.close();
  }
  // 7. login com o código do aplicativo; excluir conta com modal; reativar
  await nextWindow();
  await login(A.page, { code: totp(secret) });
  step("login com o código do aplicativo", true);
  await A.page.goto(`${BASE}/settings?tab=dados`);
  await A.page.getByTestId("delete-account-open").click();
  const dialog = A.page.getByTestId("delete-account-dialog");
  const consequences = await dialog.getByTestId("delete-consequences").locator("li").count();
  const disabledBefore = await dialog.getByTestId("delete-account-confirm").isDisabled();
  await shot(A.page, "id-08-excluir-modal-desktop.png");
  await dialog.locator('input[name="currentPassword"]').fill(PASSWORD);
  await dialog.getByRole("checkbox").click();
  await dialog.getByTestId("delete-confirm-word").fill("EXCLUIR");
  await dialog.getByTestId("delete-account-confirm").click();
  await A.page.getByTestId("deletion-banner").waitFor();
  await A.page.reload();
  await A.page.getByTestId("deletion-banner").waitFor();
  await shot(A.page, "id-09-exclusao-agendada-desktop.png");
  step("exclusão agendada com modal de consequências e confirmação", consequences >= 6 && disabledBefore);
  await A.page.getByTestId("reactivate-account").click();
  await A.page.getByTestId("deletion-banner").waitFor({ state: "detached" });
  step("conta reativada dentro do prazo", true);
  // 8. celular: conta e modal
  {
    const { ctx, page } = await newPage(browser, MOBILE);
    await nextWindow();
    await login(page, { code: totp(secret) });
    await shot(page, "id-10-conta-2fa-celular.png", true);
    await overflow(page, "conta-celular");
    await page.goto(`${BASE}/settings?tab=dados`);
    await page.getByTestId("delete-account-open").click();
    await shot(page, "id-11-excluir-modal-celular.png");
    await overflow(page, "excluir-celular");
    await ctx.close();
  }
  // 9. limpeza: desliga o 2FA com um código de recuperação
  await A.page.goto(`${BASE}/settings?tab=conta`);
  await A.page.getByTestId("two-factor-disable-open").click();
  await A.page.getByRole("dialog").locator('input[name="currentPassword"]').fill(PASSWORD);
  await A.page.getByRole("dialog").locator('input[name="code"]').fill(recovery[1]);
  await A.page.getByRole("dialog").getByRole("button", { name: "Desativar" }).click();
  await A.page.getByTestId("two-factor-enable-open").waitFor();
  step("2FA desativado com código de recuperação (conta volta ao estado inicial)", true);
  await A.ctx.close();
} catch (e) {
  step(`falha: ${String(e).slice(0, 300)}`, false);
} finally {
  await browser.close();
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, "IDENTIDADE.json"), JSON.stringify(result, null, 2));
  console.log(`${result.steps.filter((s) => s.ok).length}/${result.steps.length} passos ✓`);
}
