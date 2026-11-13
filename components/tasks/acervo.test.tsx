// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { TaskAcervo } from "./Acervo";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/tasks",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({}),
}));

const ME = "11111111-1111-4111-8111-111111111111";
const A = "22222222-2222-4222-8222-222222222222";
const B = "33333333-3333-4333-8333-333333333333";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const task = (id: string, over: Record<string, unknown> = {}) => ({
  id, version: 1, ownerId: ME, title: `Tarefa ${id.slice(0, 4)}`, type: "DOCUMENTO", priority: "ALTA", state: "EM_USO", accessClass: "INTERNO",
  visibility: "PRIVADA", objective: "Objetivo", acceptanceCriteria: [], editable: true, ...over,
});
const zeros = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, 0]));
const summary = (over: Record<string, unknown> = {}) => ({
  total: 41, scanned: 60, truncated: false, today: "2026-11-12",
  byWorkStatus: { ...zeros(["A_REALIZAR", "EM_ANDAMENTO", "BLOQUEADO", "CONCLUIDO", "ARQUIVADO", "PUBLICADO"]), A_REALIZAR: 7, EM_ANDAMENTO: 41 },
  byPriority: { BAIXA: 2, MEDIA: 5, ALTA: 41, CRITICA: 1 },
  byCategory: { ...zeros(["OFICIO_MEMORANDO", "ETP", "OUTRO"]), OFICIO_MEMORANDO: 3 },
  byDeadline: { COM_PRAZO_LEGAL: 4, VENCE_7_DIAS: 2, ATRASADAS: 1 },
  legalAlerts: [
    { taskId: A, title: "Responder pedido LAI", state: "EM_USO", legalDueAt: "2026-11-10", daysLeft: -2 },
    { taskId: B, title: "Parecer da obra", state: "DISPONIVEL", legalDueAt: "2026-11-12", daysLeft: 0 },
  ],
  legalAlertCount: 3,
  ...over,
});

describe("Acervo de Tarefas com sub-filtros na URL (RF41.CA01/CA04/CA09)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    nav.replace.mockReset();
    nav.search = "filtro=em-andamento&prioridade=alta&page=2";
  });
  afterEach(() => vi.unstubAllGlobals());

  const route = (list: unknown, sum: unknown) => fetchMock.mockImplementation(async (url) => {
    const u = String(url);
    if (u.includes("/api/tasks/summary")) return json(200, sum);
    if (u.includes("/api/tasks?")) return json(200, list);
    return json(404, { code: "NAO_ENCONTRADO" });
  });

  it("lê os filtros da URL, chama a API com o enum e mostra contagens, alertas de prazo legal e página", async () => {
    route([task(A, { legalDueAt: "2026-11-10" }), task(B)], summary());
    renderWithProviders(<TaskAcervo />);
    expect(await screen.findAllByTestId("persisted-task-card")).toHaveLength(2);
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.includes("/api/tasks?filtro=EM_ANDAMENTO&prioridade=ALTA&ordem=ATUALIZACAO&page=2&size=20"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/api/tasks/summary?filtro=EM_ANDAMENTO&prioridade=ALTA"))).toBe(true);

    const banner = screen.getByTestId("legal-banner");
    expect(banner.textContent).toContain("3 tarefas com prazo legal vencido ou vencendo em até 7 dias");
    expect(within(banner).getByRole("link", { name: "Responder pedido LAI" }).getAttribute("href")).toBe(`/tasks/${A}`);
    expect(banner.textContent).toContain("Vencida há 2 dias");
    expect(banner.textContent).toContain("Vence hoje");
    expect(banner.textContent).toContain("e mais 1");
    expect(banner.textContent).toContain("deve ser conferida");

    const prio = screen.getByRole("group", { name: "Prioridade" });
    expect(within(prio).getByRole("button", { name: "Crítica (1)" })).toBeTruthy();
    expect(within(prio).getByRole("button", { name: "Alta (41)" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(screen.getByRole("group", { name: "Estado" })).getByRole("button", { name: "Em andamento (41)" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("acervo-results").textContent).toBe("41 tarefas · Página 2 de 3");

    fireEvent.click(within(screen.getByRole("group", { name: "Prazo" })).getByRole("button", { name: "Atrasadas (1)" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/tasks?filtro=em-andamento&prioridade=alta&prazo=atrasadas", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/tasks?filtro=em-andamento&prioridade=alta&page=3", { scroll: false });
    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "PRAZO" } });
    expect(nav.replace).toHaveBeenLastCalledWith("/tasks?filtro=em-andamento&prioridade=alta&ordem=prazo", { scroll: false });
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "OFICIO_MEMORANDO" } });
    expect(nav.replace).toHaveBeenLastCalledWith("/tasks?filtro=em-andamento&categoria=oficio-memorando&prioridade=alta", { scroll: false });
    fireEvent.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0]!);
    expect(nav.replace).toHaveBeenLastCalledWith("/tasks", { scroll: false });
  });

  it("acervo vazio convida a criar; filtro sem resultado oferece limpar", async () => {
    nav.search = "";
    route([], summary({ total: 0, scanned: 0, legalAlerts: [], legalAlertCount: 0 }));
    const { unmount } = renderWithProviders(<TaskAcervo />);
    expect(await screen.findByText("Você ainda não tem tarefas salvas")).toBeTruthy();
    unmount();

    nav.search = "prazo=atrasadas";
    route([], summary({ total: 0, legalAlerts: [], legalAlertCount: 0 }));
    renderWithProviders(<TaskAcervo />);
    expect(await screen.findByText("Nenhuma tarefa com estes filtros")).toBeTruthy();
    expect(screen.queryByTestId("legal-banner")).toBeNull();
    expect(screen.getByTestId("acervo-results").textContent).toBe("0 tarefas");
  });

  it("sem sessão explica o motivo", async () => {
    fetchMock.mockResolvedValue(json(401, { code: "NAO_AUTENTICADO" }));
    renderWithProviders(<TaskAcervo />);
    expect(await screen.findByText(/Entre na sua conta para ver e salvar tarefas/)).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
