// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserNav } from "@/lib/connectors/client";
import { renderWithProviders } from "@/test-utils/render";
import { ConnectorsPanel } from "./ConnectorsPanel";

const nav = vi.hoisted(() => ({ search: "tab=conectores", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const json = (status: number, body: unknown) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/drive.readonly"];
const MS_SCOPES = ["openid", "email", "offline_access", "User.Read", "Files.Read"];
const PROVIDERS = [
  { provider: "GOOGLE", enabled: true, mode: "OAUTH", scopes: GOOGLE_SCOPES },
  { provider: "MICROSOFT", enabled: true, mode: "OAUTH", scopes: MS_SCOPES },
  { provider: "APPLE_ICLOUD", enabled: true, mode: "LINK", scopes: [] },
];
const ANA = { id: "acc-g", provider: "GOOGLE", accountEmail: "ana@secid.pr.gov.br", status: "ATIVO", scopes: GOOGLE_SCOPES, connectedAt: "2026-11-01T12:00:00Z", lastUsedAt: "2026-11-08T09:30:00Z" };
const BRUNO = { id: "acc-m", provider: "MICROSOFT", accountEmail: "bruno@secid.pr.gov.br", status: "EXPIRADO", scopes: MS_SCOPES, connectedAt: "2026-10-20T08:00:00Z", lastError: "invalid_grant" };

type Call = { path: string; method: string; body: unknown };
function server(routes: { providers?: () => Response; accounts?: () => Response; authorize?: (provider: string) => Response; remove?: (id: string) => Response }) {
  const calls: Call[] = [];
  fetchMock.mockImplementation(async (input, init) => {
    const u = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ path: u.pathname, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (u.pathname === "/api/connectors/providers") return routes.providers?.() ?? json(200, PROVIDERS);
    if (u.pathname === "/api/connectors" && method === "GET") return routes.accounts?.() ?? json(200, []);
    const auth = /^\/api\/connectors\/([A-Z_]+)\/authorize$/.exec(u.pathname);
    if (auth && method === "POST") return routes.authorize?.(auth[1]!) ?? json(404, { code: "NAO_ENCONTRADO" });
    const del = /^\/api\/connectors\/([^/]+)$/.exec(u.pathname);
    if (del && method === "DELETE") return routes.remove?.(del[1]!) ?? json(404, { code: "NAO_ENCONTRADO" });
    return json(404, { code: "NAO_ENCONTRADO" });
  });
  return calls;
}

const fetchMock = vi.fn<typeof fetch>();
let assign: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  nav.search = "tab=conectores";
  nav.replace.mockReset();
  assign = vi.spyOn(browserNav, "assign").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  assign.mockRestore();
});

/** Configurações › Conectores (RF4, RF20.CA07, RF23, RF34; contrato de 09/11/2026). */
describe("Configurações › Conectores", () => {
  it("lista os provedores com estado, conta, escopos explicados e finalidade (LGPD); Apple pelo link; catálogo por ecossistema", async () => {
    server({ accounts: () => json(200, [ANA]) });
    renderWithProviders(<ConnectorsPanel />);
    const google = await screen.findByTestId("provider-GOOGLE");
    expect(within(google).getByText("Conectado")).toBeTruthy();
    const account = within(google).getByTestId("connector-account");
    expect(account.getAttribute("data-status")).toBe("ATIVO");
    expect(account.textContent).toContain("ana@secid.pr.gov.br");
    expect(account.textContent).toContain("Ativa");
    expect(account.textContent).toMatch(/Conectada em .*último uso em/);
    const scopes = within(google).getByTestId("provider-scopes");
    expect(scopes.textContent).toContain("https://www.googleapis.com/auth/drive.readonly");
    expect(scopes.textContent).toContain("ver e baixar os arquivos do seu Drive, sem alterar nada");
    expect(google.textContent).toContain("Para quê: ler e exportar os arquivos do Google Drive que você escolher");
    expect(google.textContent).toContain("escopo restrito do Google");
    expect(within(google).getByTestId("connect-GOOGLE").textContent).toBe("Conectar outra conta");

    const ms = screen.getByTestId("provider-MICROSOFT");
    expect(within(ms).getByText("Não conectado")).toBeTruthy();
    expect(within(ms).getByTestId("provider-scopes").textContent).toContain("manter o acesso sem pedir login a cada uso");
    expect(within(ms).getByTestId("connect-MICROSOFT").textContent).toBe("Conectar Microsoft");
    expect(screen.getByTestId("connectors-lgpd").textContent).toContain("Finalidade: listar os arquivos que você buscar");

    const apple = screen.getByTestId("provider-APPLE_ICLOUD");
    expect(apple.textContent).toContain("A Apple não oferece API pública");
    expect(apple.textContent).toContain("Arquivo exportado.");
    expect(within(apple).queryByRole("button", { name: /Conectar/ })).toBeNull(); // não há conta Apple para conectar
    const appleRules = within(apple).getByTestId("link-rules");
    expect(appleRules.textContent).toContain("www.icloud.com/pages/");
    expect(appleRules.textContent).toContain("Apple Pages · Documento");
    expect(appleRules.textContent).toContain("Freeform (Apple) · Quadro branco");
    expect(within(apple).getByRole("link", { name: "Colar um link do iCloud" }).getAttribute("href")).toBe("/tasks/new?importar=link");

    // catálogo: Google por padrão; Apple mostra os 15 itens; o filtro encontra pelo app
    const catalog = screen.getByTestId("source-catalog");
    expect(within(catalog).getAllByTestId("catalog-item")).toHaveLength(25);
    const docs = within(catalog).getAllByTestId("catalog-item").find((el) => el.getAttribute("data-source-kind") === "GOOGLE_DOCS")!;
    expect(docs.textContent).toContain("Vira:");
    expect(docs.textContent).toContain("Documento");
    expect(docs.textContent).toContain("Pela conta conectada");
    expect(docs.textContent).toContain("Por link");
    expect(docs.textContent).toContain("Vínculo: sim");
    expect(docs.textContent).toContain("DOCX · ODT");
    fireEvent.click(within(catalog).getByRole("tab", { name: /Apple/ }));
    expect(within(catalog).getAllByTestId("catalog-item")).toHaveLength(15);
    fireEvent.change(within(catalog).getByTestId("catalog-filter"), { target: { value: "keynote" } });
    const only = within(catalog).getAllByTestId("catalog-item");
    expect(only).toHaveLength(1);
    expect(only[0]!.textContent).toContain("Apresentação");
    expect(within(catalog).getByTestId("catalog-count").textContent).toBe("1 de 15 itens");
  });

  it("conectar pede a URL ao servidor (returnTo = esta aba) e leva o navegador ao provedor; URL insegura é recusada", async () => {
    const msUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=ws&state=abc&code_challenge=x";
    let next = msUrl;
    const calls = server({ authorize: () => json(200, { url: next }) });
    renderWithProviders(<ConnectorsPanel />);
    fireEvent.click(await screen.findByTestId("connect-MICROSOFT"));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(msUrl));
    expect(calls.find((c) => c.method === "POST")).toEqual({ path: "/api/connectors/MICROSOFT/authorize", method: "POST", body: { returnTo: "/settings?tab=conectores" } });

    next = "javascript:alert(1)";
    fireEvent.click(screen.getByTestId("connect-GOOGLE"));
    const google = screen.getByTestId("provider-GOOGLE");
    expect((await within(google).findByTestId("connector-error")).textContent).toContain("não é seguro");
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("conta expirada: estado e motivo à vista; reconectar refaz a autorização", async () => {
    const calls = server({ accounts: () => json(200, [BRUNO]), authorize: () => json(200, { url: "https://login.microsoftonline.com/x" }) });
    renderWithProviders(<ConnectorsPanel />);
    const ms = await screen.findByTestId("provider-MICROSOFT");
    expect(within(ms).getByText("Precisa reconectar")).toBeTruthy();
    const row = within(ms).getByTestId("connector-account");
    expect(row.textContent).toContain("Expirada");
    expect(row.textContent).toContain("Último erro: invalid_grant");
    fireEvent.click(within(row).getByTestId("account-reconnect"));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://login.microsoftonline.com/x"));
    expect(calls.some((c) => c.path === "/api/connectors/MICROSOFT/authorize")).toBe(true);
  });

  it("desconectar só depois de confirmar; Microsoft orienta remover o consentimento em myapps", async () => {
    let accounts: unknown[] = [BRUNO, ANA];
    const calls = server({ accounts: () => json(200, accounts), remove: (id) => { accounts = accounts.filter((a) => (a as { id: string }).id !== id); return json(204, null); } });
    renderWithProviders(<ConnectorsPanel />);
    const ms = await screen.findByTestId("provider-MICROSOFT");
    fireEvent.click(within(ms).getByRole("button", { name: "Desconectar bruno@secid.pr.gov.br" }));
    const dialog = await screen.findByRole("dialog", { name: "Desconectar bruno@secid.pr.gov.br?" });
    expect(dialog.textContent).toContain("A Microsoft não permite revogar por API");
    expect(within(dialog).getByRole("link", { name: /myapps\.microsoft\.com/ }).getAttribute("href")).toBe("https://myapps.microsoft.com");
    expect(calls.some((c) => c.method === "DELETE")).toBe(false); // nada antes de confirmar
    fireEvent.click(within(dialog).getByTestId("disconnect-confirm"));
    await waitFor(() => expect(within(screen.getByTestId("provider-MICROSOFT")).queryByTestId("connector-account")).toBeNull());
    expect(calls.filter((c) => c.method === "DELETE").map((c) => c.path)).toEqual(["/api/connectors/acc-m"]);
    expect(within(screen.getByTestId("provider-MICROSOFT")).getByText("Nenhuma conta conectada.")).toBeTruthy();
    expect(within(screen.getByTestId("provider-GOOGLE")).getAllByTestId("connector-account")).toHaveLength(1);

    // Google: a confirmação diz que revoga no Google
    fireEvent.click(within(screen.getByTestId("provider-GOOGLE")).getByRole("button", { name: "Desconectar ana@secid.pr.gov.br" }));
    expect((await screen.findByRole("dialog", { name: "Desconectar ana@secid.pr.gov.br?" })).textContent).toContain("Revogamos o acesso no Google");
  });

  it("volta do provedor: conector=ok confirma; conector=erro explica o motivo e dispensar limpa a URL", async () => {
    server({ accounts: () => json(200, [ANA]) });
    nav.search = "tab=conectores&conector=ok";
    const { unmount } = renderWithProviders(<ConnectorsPanel />);
    const ok = await screen.findByTestId("connector-return");
    expect(ok.getAttribute("role")).toBe("status");
    expect(ok.textContent).toContain("Conta conectada");
    expect(within(ok).getByRole("link", { name: "Importar agora" }).getAttribute("href")).toBe("/tasks/new?importar=conta");
    unmount();

    nav.search = "tab=conectores&conector=erro&motivo=ACESSO_NEGADO";
    renderWithProviders(<ConnectorsPanel />);
    const err = await screen.findByTestId("connector-return");
    expect(err.getAttribute("role")).toBe("alert");
    expect(err.textContent).toContain("A conexão não foi concluída");
    expect(err.textContent).toContain("Você não autorizou o acesso, ou a organização bloqueou o aplicativo.");
    fireEvent.click(within(err).getByRole("button", { name: "Dispensar" }));
    expect(nav.replace).toHaveBeenCalledWith("/settings?tab=conectores", { scroll: false });
  });

  it("motivo que não é código não é refletido na tela", async () => {
    server({});
    nav.search = "tab=conectores&conector=erro&motivo=%3Cimg%20src%3Dx%3E";
    renderWithProviders(<ConnectorsPanel />);
    const err = await screen.findByTestId("connector-return");
    expect(err.textContent).toContain("O provedor não informou o motivo");
    expect(err.textContent).not.toContain("img");
  });

  it("desabilitado: o cartão explica que a TI precisa configurar e não deixa conectar; 503 CONECTOR_DESABILITADO no authorize também", async () => {
    server({
      providers: () => json(200, [{ ...PROVIDERS[0], enabled: false }, PROVIDERS[1], PROVIDERS[2]]),
      authorize: () => json(503, { status: 503, code: "CONECTOR_DESABILITADO", message: "Conectores desabilitados" }),
    });
    renderWithProviders(<ConnectorsPanel />);
    const google = await screen.findByTestId("provider-GOOGLE");
    expect(google.getAttribute("data-enabled")).toBe("false");
    expect(within(google).getByText("Desabilitado neste ambiente")).toBeTruthy();
    expect(within(google).getByTestId("provider-disabled").textContent).toContain("A equipe de TI precisa configurá-lo");
    expect(within(google).getByTestId("connect-GOOGLE").hasAttribute("disabled")).toBe(true);

    const ms = screen.getByTestId("provider-MICROSOFT");
    expect(ms.getAttribute("data-enabled")).toBe("true");
    fireEvent.click(within(ms).getByTestId("connect-MICROSOFT"));
    await waitFor(() => expect(screen.getByTestId("provider-MICROSOFT").getAttribute("data-enabled")).toBe("false"));
    expect(within(screen.getByTestId("provider-MICROSOFT")).getByTestId("provider-disabled").textContent).toContain("O conector Microsoft está desabilitado neste ambiente.");
    expect(assign).not.toHaveBeenCalled();
  });

  it("sem chave de cifra o servidor desliga tudo (503 na lista de contas): a tela continua e explica", async () => {
    server({
      providers: () => json(503, { code: "CONECTOR_DESABILITADO" }),
      accounts: () => json(503, { code: "CONECTOR_DESABILITADO" }),
    });
    renderWithProviders(<ConnectorsPanel />);
    for (const p of ["GOOGLE", "MICROSOFT"]) {
      const card = await screen.findByTestId(`provider-${p}`);
      expect(card.getAttribute("data-enabled")).toBe("false");
      expect(within(card).getByTestId(`connect-${p}`).hasAttribute("disabled")).toBe(true);
    }
    expect(screen.getByTestId("source-catalog")).toBeTruthy();
  });

  it("API fora do ar: erro com tentar de novo, e o catálogo continua disponível", async () => {
    fetchMock.mockRejectedValue(new TypeError("ECONNREFUSED"));
    renderWithProviders(<ConnectorsPanel />);
    expect(await screen.findByText("Não foi possível carregar os conectores")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
    expect(screen.getAllByTestId("catalog-item").length).toBeGreaterThan(0);
  });
});
