// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskForm } from "@/components/tasks/TaskForm";
import { browserNav } from "@/lib/connectors/client";
import { renderWithProviders } from "@/test-utils/render";
import { ImportFrom } from "./ImportFrom";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/tasks/new",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const ME = "11111111-1111-4111-8111-111111111111";
const TASK = "22222222-2222-4222-8222-222222222222";
const json = (status: number, body: unknown) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const PROVIDERS = [
  { provider: "GOOGLE", enabled: true, mode: "OAUTH", scopes: ["openid", "email", "https://www.googleapis.com/auth/drive.readonly"] },
  { provider: "MICROSOFT", enabled: true, mode: "OAUTH", scopes: ["openid", "email", "offline_access", "User.Read", "Files.Read"] },
  { provider: "APPLE_ICLOUD", enabled: true, mode: "LINK", scopes: [] },
];
const ANA = { id: "acc-g", provider: "GOOGLE", accountEmail: "ana@secid.pr.gov.br", status: "ATIVO", scopes: [], connectedAt: "2026-11-01T12:00:00Z" };
const DOC = {
  externalId: "f-doc", name: "Relatório de vistoria", mimeType: "application/vnd.google-apps.document", sourceKind: "GOOGLE_DOCS", taskType: "DOCUMENTO",
  webUrl: "https://docs.google.com/document/d/f-doc/edit", modifiedAt: "2026-11-07T15:00:00Z", exportFormats: ["PDF", "DOCX"], linkable: true,
};
const SLIDES = { ...DOC, externalId: "f-slides", name: "Apresentação da obra", mimeType: "application/vnd.google-apps.presentation", sourceKind: "GOOGLE_SLIDES", taskType: "APRESENTACAO" };
const PHOTO = { ...DOC, externalId: "f-pdf", name: "Laudo assinado.pdf", mimeType: "application/pdf", sourceKind: "GOOGLE_DRIVE", taskType: "DOCUMENTO", sizeBytes: 1_572_864, exportFormats: [], linkable: false };

type Call = { path: string; query: string; method: string; body: Record<string, unknown> | undefined };
interface Routes {
  accounts?: unknown[];
  providers?: unknown[];
  items?: (q: string) => Response;
  importItem?: (body: Record<string, unknown>) => Response;
  linkImport?: (body: Record<string, unknown>) => Response;
  authorize?: () => Response;
}
const fetchMock = vi.fn<typeof fetch>();
function server(r: Routes) {
  const calls: Call[] = [];
  fetchMock.mockImplementation(async (input, init) => {
    const u = new URL(String(input));
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ path: u.pathname, query: u.search, method, body });
    if (u.pathname === "/api/me") return json(200, { id: ME });
    if (u.pathname === "/api/connectors/providers") return json(200, r.providers ?? PROVIDERS);
    if (u.pathname === "/api/connectors" && method === "GET") return json(200, r.accounts ?? [ANA]);
    if (u.pathname === "/api/connectors/acc-g/items") return r.items?.(u.searchParams.get("q") ?? "") ?? json(200, { items: [DOC, SLIDES, PHOTO] });
    if (u.pathname === "/api/connectors/acc-g/import" && method === "POST") return r.importItem?.(body!) ?? json(201, { id: TASK, title: DOC.name, linkMode: body!.linkMode });
    if (u.pathname === "/api/connectors/link-import" && method === "POST") return r.linkImport?.(body!) ?? json(201, { id: TASK, linkMode: "VINCULADO" });
    if (/^\/api\/connectors\/[A-Z_]+\/authorize$/.test(u.pathname) && method === "POST") return r.authorize?.() ?? json(200, { url: "https://accounts.google.com/o/oauth2/v2/auth?state=s" });
    return json(404, { code: "NAO_ENCONTRADO" });
  });
  return calls;
}

let assign: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  nav.search = "";
  nav.push.mockReset();
  nav.replace.mockReset();
  assign = vi.spyOn(browserNav, "assign").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  assign.mockRestore();
});

async function openDialog() {
  fireEvent.click(screen.getByTestId("import-open"));
  const dialog = await screen.findByRole("dialog", { name: "Importar de…" });
  await within(dialog).findByTestId("import-panel"); // corpo carregado sob demanda
  return dialog;
}

describe("criador de tarefas: Importar de…", () => {
  it("o botão aparece no topo do formulário ao criar, e não na edição", async () => {
    server({});
    const { unmount } = renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    const form = screen.getByTestId("task-form");
    expect(form.firstElementChild?.getAttribute("data-testid")).toBe("import-from");
    expect(within(form).getByTestId("import-open").textContent).toBe("Importar de…");
    unmount();
    renderWithProviders(<TaskForm mode="edit" initial={{ id: TASK, version: 1, title: "x", type: "DOCUMENTO" } as never} onSaved={vi.fn()} />);
    expect(screen.queryByTestId("import-from")).toBeNull();
  });

  it("conta conectada: mostra os recentes, busca, explica COPIADO × VINCULADO e importa a cópia; abre o detalhe", async () => {
    const calls = server({ items: (q) => json(200, { items: q ? [DOC] : [DOC, SLIDES, PHOTO], nextPageToken: q ? null : "p2" }) });
    renderWithProviders(<ImportFrom />);
    const dialog = await openDialog();
    expect((await within(dialog).findByRole("combobox", { name: "Conta" })).textContent).toContain("Google · ana@secid.pr.gov.br");
    const results = () => within(dialog).getByRole("listbox", { name: "Arquivos encontrados" });
    await waitFor(() => expect(within(results()).getAllByRole("option")).toHaveLength(3)); // recentes, sem digitar
    expect(within(dialog).getByRole("option", { name: /Apresentação da obra/ }).textContent).toContain("Google Slides · vira Apresentação");
    expect(within(dialog).getByRole("option", { name: /Laudo assinado/ }).textContent).toContain("1,5 MB");
    expect(within(dialog).getByTestId("import-more")).toBeTruthy();

    fireEvent.change(within(dialog).getByTestId("import-query"), { target: { value: "relatório" } });
    fireEvent.click(within(dialog).getByTestId("import-search"));
    await waitFor(() => expect(within(results()).getAllByRole("option")).toHaveLength(1));
    const search = calls.filter((c) => c.path === "/api/connectors/acc-g/items").at(-1)!;
    expect(new URLSearchParams(search.query).get("q")).toBe("relatório");
    expect(new URLSearchParams(search.query).get("pageSize")).toBe("20");

    fireEvent.click(within(dialog).getByRole("option", { name: /Relatório de vistoria/ }));
    const options = within(dialog).getByTestId("import-options");
    expect(options.textContent).toContain("Vira Documento · origem Google Docs");
    const copy = within(options).getByRole("radio", { name: /Copiar agora/ });
    expect(copy.getAttribute("aria-checked")).toBe("true"); // padrão
    expect(copy.textContent).toContain("A tarefa fica independente");
    expect(within(options).getByRole("radio", { name: /Vincular ao original/ }).textContent).toContain("Guarda a referência (endereço e id) para sincronizar depois");
    fireEvent.click(within(options).getByTestId("import-submit"));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith(`/tasks/${TASK}`));
    expect(calls.find((c) => c.path === "/api/connectors/acc-g/import")?.body).toEqual({ externalId: "f-doc", linkMode: "COPIADO" });
    expect(await screen.findByText("Tarefa importada")).toBeTruthy();
  });

  it("VINCULADO envia o modo e o título; item sem vínculo só permite cópia", async () => {
    const calls = server({});
    renderWithProviders(<ImportFrom hasDraft />);
    const dialog = await openDialog();
    expect(within(dialog).getByRole("note").textContent).toContain("o que você já digitou neste formulário não é salvo");
    fireEvent.click(await within(dialog).findByRole("option", { name: /Laudo assinado/ }));
    const linked = within(within(dialog).getByTestId("import-options")).getByRole("radio", { name: /Vincular ao original/ });
    expect(linked.hasAttribute("disabled")).toBe(true);
    expect(linked.textContent).toContain("Este item não permite vínculo");

    fireEvent.click(within(dialog).getByRole("option", { name: /Apresentação da obra/ }));
    const options = within(dialog).getByTestId("import-options");
    fireEvent.click(within(options).getByRole("radio", { name: /Vincular ao original/ }));
    fireEvent.change(within(options).getByLabelText("Título da tarefa (opcional)"), { target: { value: "  Apresentação para a reunião  " } });
    expect(within(options).getByTestId("import-submit").textContent).toBe("Importar vinculada");
    fireEvent.click(within(options).getByTestId("import-submit"));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith(`/tasks/${TASK}`));
    expect(calls.find((c) => c.path === "/api/connectors/acc-g/import")?.body).toEqual({ externalId: "f-slides", linkMode: "VINCULADO", title: "Apresentação para a reunião" });
  });

  it("CONECTOR_EXPIRADO: pede para reconectar e a volta do provedor reabre o diálogo aqui", async () => {
    const calls = server({ items: () => json(409, { status: 409, code: "CONECTOR_EXPIRADO", message: "Reconecte" }) });
    renderWithProviders(<ImportFrom />);
    const dialog = await openDialog();
    const box = await within(dialog).findByTestId("import-needs-reconnect");
    expect(box.textContent).toContain("A conexão com ana@secid.pr.gov.br (Google) expirou ou deixou de funcionar. Reconecte a conta");
    expect(within(dialog).getByRole("combobox", { name: "Conta" }).textContent).toContain("Expirada");
    expect(within(dialog).queryByTestId("import-query")).toBeNull();
    fireEvent.click(within(box).getByTestId("import-reconnect"));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth?state=s"));
    expect(calls.find((c) => c.path === "/api/connectors/GOOGLE/authorize")?.body).toEqual({ returnTo: "/tasks/new?importar=conta" });
  });

  it("falha do provedor na importação aparece com a mensagem dos conectores e o código de correlação", async () => {
    server({ importItem: () => json(502, { status: 502, code: "PROVEDOR_INDISPONIVEL", message: "x", correlationId: "c-123" }) });
    renderWithProviders(<ImportFrom />);
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole("option", { name: /Relatório de vistoria/ }));
    fireEvent.click(within(dialog).getByTestId("import-submit"));
    const err = await within(dialog).findByTestId("connector-error");
    expect(err.getAttribute("data-kind")).toBe("PROVEDOR");
    expect(err.textContent).toContain("O provedor não respondeu agora");
    expect(err.textContent).toContain("código c-123");
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("sem conta conectada: oferece conectar (voltando para cá) ou colar link; desabilitado explica que a TI configura", async () => {
    server({ accounts: [], providers: [{ ...PROVIDERS[0], enabled: false }, { ...PROVIDERS[1], enabled: false }, PROVIDERS[2]] });
    renderWithProviders(<ImportFrom />);
    const dialog = await openDialog();
    const empty = await within(dialog).findByTestId("import-no-account");
    expect(within(empty).getByTestId("import-connect-GOOGLE").hasAttribute("disabled")).toBe(true);
    expect(within(empty).getByTestId("import-disabled").textContent).toContain("A equipe de TI precisa configurá-lo");
    fireEvent.click(within(empty).getByRole("button", { name: "Colar um link" }));
    expect(await within(dialog).findByTestId("import-link")).toBeTruthy();
  });

  it("colar link aceito: mostra o que vira antes de enviar (iCloud → Apple Pages · Documento) e importa vinculado", async () => {
    const calls = server({});
    renderWithProviders(<ImportFrom />);
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("tab", { name: "Colar link" }));
    const link = await within(dialog).findByTestId("import-link");
    expect(within(link).getByTestId("link-rules").textContent).toContain("docs.google.com/document");
    expect(within(link).getByTestId("link-rules").textContent).toContain("*.sharepoint.com/…/SitePages/");
    fireEvent.change(within(link).getByTestId("link-url"), { target: { value: " https://www.icloud.com/pages/0aBcD#Relatorio " } });
    const preview = within(link).getByTestId("link-preview");
    expect(preview.getAttribute("data-accepted")).toBe("true");
    expect(preview.textContent).toBe("Vira: Apple Pages → Documento (vinculada)");
    fireEvent.click(within(link).getByTestId("link-submit"));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith(`/tasks/${TASK}`));
    expect(calls.find((c) => c.path === "/api/connectors/link-import")?.body).toEqual({ url: "https://www.icloud.com/pages/0aBcD#Relatorio" });
  });

  it("colar link recusado: fora da lista não envia; recusa do servidor (VALIDACAO) aparece com a explicação", async () => {
    const calls = server({ linkImport: () => json(400, { status: 400, code: "VALIDACAO", message: "O documento não está compartilhado por link." }) });
    renderWithProviders(<ImportFrom />);
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("tab", { name: "Colar link" }));
    const link = await within(dialog).findByTestId("import-link");
    fireEvent.change(within(link).getByTestId("link-url"), { target: { value: "https://example.com/relatorio.docx" } });
    expect(within(link).getByTestId("link-preview").textContent).toContain("Este endereço não está entre os aceitos");
    expect(within(link).getByTestId("link-url").getAttribute("aria-invalid")).toBe("true");
    expect(within(link).getByTestId("link-submit").hasAttribute("disabled")).toBe(true);
    fireEvent.keyDown(within(link).getByTestId("link-url"), { key: "Enter" });
    expect(calls.some((c) => c.path === "/api/connectors/link-import")).toBe(false);

    fireEvent.change(within(link).getByTestId("link-url"), { target: { value: "https://docs.google.com/document/d/1AbC/edit" } });
    expect(within(link).getByTestId("link-preview").textContent).toBe("Vira: Google Docs → Documento (vinculada)");
    fireEvent.click(within(link).getByTestId("link-submit"));
    const err = await within(link).findByTestId("connector-error");
    expect(err.getAttribute("data-kind")).toBe("VALIDACAO");
    expect(err.textContent).toContain("O pedido não foi aceito");
    expect(err.textContent).toContain("O documento não está compartilhado por link.");
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("volta do provedor (?importar=conta&conector=ok) abre o diálogo com a confirmação e limpa a URL", async () => {
    server({});
    nav.search = "modelo=area.software.bug&importar=conta&conector=ok";
    renderWithProviders(<ImportFrom />);
    const dialog = await screen.findByRole("dialog", { name: "Importar de…" });
    const ret = await within(dialog).findByTestId("connector-return");
    expect(ret.textContent).toContain("Conta conectada");
    expect(ret.textContent).toContain("Escolha a conta e busque o arquivo.");
    expect(nav.replace).toHaveBeenCalledWith("/tasks/new?modelo=area.software.bug", { scroll: false });
  });

  it("atalho ?importar=link abre direto em Colar link", async () => {
    server({});
    nav.search = "importar=link";
    renderWithProviders(<ImportFrom />);
    const dialog = await screen.findByRole("dialog", { name: "Importar de…" });
    expect(await within(dialog).findByTestId("import-link")).toBeTruthy();
    expect(within(dialog).getByRole("tab", { name: "Colar link" }).getAttribute("aria-selected")).toBe("true");
    expect(nav.replace).toHaveBeenCalledWith("/tasks/new", { scroll: false });
  });
});
