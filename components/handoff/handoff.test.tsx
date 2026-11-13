// @vitest-environment jsdom
/**
 * Dossiê de Transição na tela (RF36): o chefe gera o dossiê de alguém que sai, vê as pendências, define os sucessores, envia e
 * registra a ciência; exporta em Markdown, JSON e versão para impressão. O empregado gera o próprio e dá ciência do que recebe;
 * com sessão real, as tarefas vêm da API. Admin só consulta; Curador e Visitante não têm a página.
 */
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "@/lib/api/client";
import { buildDemoDossiers, createMemoryHandoffRepository } from "@/lib/handoff/repository";
import { CurrentUserProvider } from "@/lib/session/CurrentUserProvider";
import { ViewerProvider } from "@/lib/viewer/ViewerProvider";
import { renderWithProviders } from "@/test-utils/render";
import HandoffsPage from "@/app/(shell)/handoffs/page";
import { HandoffWorkspace } from "./HandoffWorkspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/handoffs",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const NOW = new Date("2026-11-12T12:00:00Z");
const now = () => NOW;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const detail = () => screen.getByTestId("handoff-detail");

const blobs: Blob[] = [];
beforeEach(() => {
  blobs.length = 0;
  Object.assign(URL, {
    createObjectURL: vi.fn((b: Blob) => { blobs.push(b); return `blob:dossie-${blobs.length}`; }),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("chefe: gerar, transferir e exportar (RF36.CA01–CA03)", () => {
  it("reúne o dossiê de quem sai, mostra as pendências, define sucessores, envia, registra a ciência e exporta", async () => {
    const repo = createMemoryHandoffRepository([]);
    renderWithProviders(<HandoffWorkspace repo={repo} memory={() => []} now={now} />, { profile: "CHEFE" });
    fireEvent.change(screen.getByLabelText(/^Pessoa/), { target: { value: "u-carla" } });
    fireEvent.click(screen.getByRole("radio", { name: /^Saída/ }));
    fireEvent.click(screen.getByTestId("handoff-generate"));
    await waitFor(() => expect(screen.getByTestId("handoff-detail")).toBeTruthy());
    expect(within(detail()).getByRole("heading", { name: "Dossiê de transição · Carla Exemplo" })).toBeTruthy();
    expect(detail().getAttribute("data-status")).toBe("GERADO");
    expect(within(detail()).getByTestId("handoff-summary").textContent).toContain("Carla Exemplo deixa — projetos: 1");
    expect(repo.list()[0]).toMatchObject({ subjectId: "u-carla", reason: "SAIDA", requestedByProfile: "CHEFE", effectiveDate: "2026-11-26" });

    // pendências: a especificação vencida ontem
    fireEvent.click(within(detail()).getByRole("tab", { name: /Pendências/ }));
    const pend = within(detail()).getByTestId("handoff-section-PENDENCIAS");
    expect(within(pend).getByText("Especificação da API de decisões").closest("[data-item]")!.getAttribute("data-pendency")).toBe("VENCIDA");

    // plano: sucessor padrão para todos, um item com outro sucessor
    expect(screen.getByTestId("handoff-plan-progress").textContent).toMatch(/^0 de \d+ itens/);
    fireEvent.click(screen.getByTestId("handoff-send"));
    expect(within(screen.getByTestId("handoff-ack")).getByRole("alert").textContent).toMatch(/Faltam sucessores em \d+ itens/);
    fireEvent.change(screen.getByLabelText("Sucessor para os itens ainda vazios"), { target: { value: "u-elisa" } });
    fireEvent.click(screen.getByTestId("handoff-apply-default"));
    expect(screen.getByTestId("handoff-plan-progress").textContent).toMatch(/^(\d+) de \1 itens transferíveis com sucessor · 1 sucessores/);
    fireEvent.click(within(detail()).getByRole("tab", { name: /Projetos/ }));
    fireEvent.change(within(detail()).getByLabelText("Sucessor de Plataforma DECIA v1.0"), { target: { value: "u-bruno" } });
    fireEvent.change(within(detail()).getByLabelText("Nota para o sucessor sobre Plataforma DECIA v1.0"), { target: { value: "Protótipo na metade" } });
    expect(screen.getByTestId("handoff-plan-progress").textContent).toContain("· 2 sucessores");
    // checklist manual
    fireEvent.click(within(screen.getByTestId("handoff-checklist")).getByText(/Pendências urgentes \(\d+\) revisadas/));
    expect(screen.getByTestId("handoff-checklist").querySelector("[data-check=PENDENCIAS]")!.getAttribute("data-done")).toBe("true");

    fireEvent.click(screen.getByTestId("handoff-send"));
    expect(detail().getAttribute("data-status")).toBe("AGUARDANDO_SUCESSOR");
    // no laboratório, a ciência de cada sucessor pode ser simulada
    fireEvent.click(screen.getByTestId("handoff-ack-u-elisa"));
    expect(detail().getAttribute("data-status")).toBe("AGUARDANDO_SUCESSOR");
    fireEvent.click(screen.getByTestId("handoff-ack-u-bruno"));
    expect(detail().getAttribute("data-status")).toBe("TRANSFERIDO");
    expect(screen.getByTestId("handoff-transferred")).toBeTruthy();

    // exportação
    fireEvent.click(screen.getByTestId("handoff-export-md"));
    const md = await blobs.at(-1)!.text();
    expect(md).toContain("# Dossiê de transição — Carla Exemplo");
    expect(md).toContain("| Plataforma DECIA v1.0 | Projetos | Bruno Exemplo |");
    expect(md).toContain("Nota: Protótipo na metade");
    fireEvent.click(screen.getByTestId("handoff-export-json"));
    expect(JSON.parse(await blobs.at(-1)!.text())).toMatchObject({ schema: "ws.handoff/1", dossier: { status: "TRANSFERIDO" } });
    const fake = { addEventListener: vi.fn(), focus: vi.fn(), print: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(fake as unknown as Window);
    fireEvent.click(screen.getByTestId("handoff-print"));
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^blob:/), "_blank");
    expect(await blobs.at(-1)!.text()).toContain("<h1>Dossiê de transição — Carla Exemplo</h1>");
    fake.addEventListener.mock.calls[0]![1]();
    expect(fake.print).toHaveBeenCalled();
  });

  it("recusa do sucessor exige motivo e volta o dossiê para a chefia indicar outra pessoa", async () => {
    const repo = createMemoryHandoffRepository(buildDemoDossiers(NOW));
    renderWithProviders(<HandoffWorkspace repo={repo} memory={() => []} now={now} />, { profile: "CHEFE" });
    fireEvent.click(screen.getByRole("button", { name: "Abrir o dossiê de Diego Exemplo" }));
    expect(detail().getAttribute("data-status")).toBe("AGUARDANDO_SUCESSOR");
    fireEvent.click(within(screen.getByTestId("handoff-ack")).getByRole("button", { name: "Simular a recusa de Pessoa Exemplo" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Recusar" }));
    expect(within(dialog).getByRole("alert").textContent).toBe("Informe o motivo.");
    fireEvent.change(within(dialog).getByLabelText(/Motivo da recusa/), { target: { value: "Vou mudar de setor também" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Recusar" }));
    await waitFor(() => expect(detail().getAttribute("data-status")).toBe("RECUSADO"));
    expect(screen.getByTestId("handoff-refusal").textContent).toContain("Pessoa Exemplo recusou: Vou mudar de setor também");
  });
});

describe("empregado, admin e as regras de acesso", () => {
  it("o empregado gera o próprio dossiê e dá ciência do dossiê que recebeu", async () => {
    const repo = createMemoryHandoffRepository(buildDemoDossiers(NOW));
    renderWithProviders(<HandoffWorkspace repo={repo} memory={() => []} now={now} />, { profile: "EMPREGADO" });
    expect(screen.getByTestId("handoff-self").textContent).toBe("Você (Pessoa Exemplo)");
    expect(screen.getByRole("switch", { name: /Incluir os meus itens privados/ })).toBeTruthy();
    // o dossiê de Diego aparece porque ela é a sucessora
    fireEvent.click(screen.getByRole("button", { name: "Abrir o dossiê de Diego Exemplo" }));
    fireEvent.click(screen.getByTestId("handoff-ack-u-pessoa"));
    expect(screen.queryByTestId("handoff-ack-u-pessoa")).toBeNull();
    expect(detail().getAttribute("data-status")).toBe("TRANSFERIDO");
    // e gera o próprio, com os itens privados por consentimento dela
    fireEvent.click(screen.getByRole("switch", { name: /Incluir os meus itens privados/ }));
    fireEvent.click(screen.getByTestId("handoff-generate"));
    await waitFor(() => expect(repo.list()).toHaveLength(2));
    expect(repo.list()[0]).toMatchObject({ subjectId: "u-pessoa", consentForPrivateItems: true, privateExcluded: 0, requestedById: "u-pessoa" });
    expect(repo.list()[0]!.items.some((i) => i.id === "tarefa:t-dossie-anotacoes")).toBe(true);
  });

  it("admin só consulta (sem formulário nem condução); a página é negada a curador e visitante", () => {
    const repo = createMemoryHandoffRepository(buildDemoDossiers(NOW));
    const { unmount } = renderWithProviders(<HandoffWorkspace repo={repo} memory={() => []} now={now} />, { profile: "ADMIN" });
    expect(screen.getByTestId("handoff-readonly").textContent).toContain("Admin consulta os dossiês");
    expect(screen.queryByTestId("handoff-form")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir o dossiê de Diego Exemplo" }));
    expect(within(detail()).queryByRole("button", { name: /Cancelar dossiê/ })).toBeNull();
    unmount();
    const { unmount: u2 } = renderWithProviders(<HandoffsPage />, { profile: "CURADOR" });
    expect(screen.getByText("403 ACESSO_NEGADO")).toBeTruthy();
    expect(screen.queryByTestId("handoff-workspace")).toBeNull();
    u2();
    renderWithProviders(<HandoffsPage />, { profile: "EMPRESA" });
    expect(screen.getByTestId("handoff-workspace")).toBeTruthy();
    expect(screen.getByTestId("handoff-form")).toBeTruthy();
  });
});

describe("com sessão real, as tarefas do próprio dossiê vêm da API do Acervo", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => { act(() => tokenStore.clear()); vi.unstubAllGlobals(); });

  it("lê /api/tasks, marca a fonte API e liga cada tarefa ao Acervo", async () => {
    const ME = { id: "11111111-1111-4111-8111-111111111111", username: "maria.silva", fullName: "Maria da Silva", displayName: "Maria", profileType: "EMPREGADO", role: "USER", status: "ACTIVE" };
    const TASK = { id: "44444444-4444-4444-8444-444444444444", ownerId: ME.id, responsibleId: ME.id, title: "Relatório real do setor", state: "EM_USO", dueAt: "2026-11-10", priority: "ALTA", visibility: "DEPARTAMENTO", accessClass: "INTERNO", extensions: {} };
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/api/me")) return json(200, ME);
      if (u.includes("/api/tasks?limit=100")) return json(200, [TASK]);
      return json(404, {});
    });
    tokenStore.set("jwt-de-teste");
    const repo = createMemoryHandoffRepository([]);
    renderWithProviders(<CurrentUserProvider><ViewerProvider><HandoffWorkspace repo={repo} memory={() => []} now={now} /></ViewerProvider></CurrentUserProvider>);
    await waitFor(() => expect(screen.getByTestId("handoff-self").textContent).toBe("Você (Maria)"));
    fireEvent.click(screen.getByTestId("handoff-generate"));
    await waitFor(() => expect(repo.list()).toHaveLength(1));
    const d = repo.list()[0]!;
    expect(d.sources).toContain("API");
    expect(d.items.find((i) => i.id === `tarefa:${TASK.id}`)).toMatchObject({ source: "API", href: `/tasks/${TASK.id}`, pendency: "VENCIDA" });
    fireEvent.click(within(detail()).getByRole("tab", { name: /Tarefas/ }));
    expect(within(detail()).getByRole("link", { name: "Relatório real do setor" }).getAttribute("href")).toBe(`/tasks/${TASK.id}`);
  });
});
