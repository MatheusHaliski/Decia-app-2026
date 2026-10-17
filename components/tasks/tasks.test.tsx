// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { criteriaProgress } from "@/lib/tasks/client";
import { MyTasks, PersistedTaskDetail } from "./PersistedTasks";
import { TaskForm } from "./TaskForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks/new",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const ME = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const view = (over: Record<string, unknown> = {}) => ({
  id: ID, version: 3, ownerId: ME, title: "Relatório de vistoria", type: "DOCUMENTO", priority: "ALTA", state: "DISPONIVEL", dueAt: "2026-11-01",
  accessClass: "INTERNO", visibility: "EMPRESA", objective: "Registrar as condições da obra", area: "ENGENHARIA",
  deliverables: [{ text: "PDF assinado" }], acceptanceCriteria: [{ text: "Fotos anexadas", done: true }, { text: "Revisado", done: false }],
  references: [{ label: "NBR", url: "https://example.org/nbr" }], extensions: { discipline: "Civil" }, editable: true, ...over,
});

describe("progresso pelos critérios (regra explícita, nunca decorativo)", () => {
  it("atendidos ÷ total; sem critérios não há percentual", () => {
    expect(criteriaProgress([{ text: "a", done: true }, { text: "b", done: false }])).toEqual({ done: 1, total: 2, percent: 50 });
    expect(criteriaProgress([])).toEqual({ done: 0, total: 0, percent: null });
  });
});

describe("criador e edição de tarefa (RF4/RF12)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("valida localmente, mostra só os campos da área e envia o briefing", async () => {
    const bodies: unknown[] = [];
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/api/me")) return json(200, { id: ME });
      if (u.endsWith("/api/tasks") && init?.method === "POST") { bodies.push(JSON.parse(String(init.body))); return json(201, view()); }
      return json(404, { code: "NAO_ENCONTRADO" });
    });
    const onSaved = vi.fn();
    renderWithProviders(<TaskForm mode="create" onSaved={onSaved} />);
    fireEvent.click(screen.getByTestId("task-submit"));
    expect(await screen.findByText("Informe um título.")).toBeTruthy();
    expect(screen.getByText("Escolha o tipo.")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/api/tasks"))).toBe(false);

    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Peça para campanha" } });
    fireEvent.change(screen.getByLabelText(/^Tipo/), { target: { value: "IMAGEM_EDITADA" } });
    expect(screen.queryByTestId("area-fields")).toBeNull();
    fireEvent.change(screen.getByLabelText(/Área profissional/), { target: { value: "DESIGN" } });
    const area = screen.getByTestId("area-fields");
    expect(within(area).getByLabelText("Formato")).toBeTruthy();
    expect(within(area).queryByLabelText("Repositório")).toBeNull(); // nada de software para design
    fireEvent.change(within(area).getByLabelText("Formato"), { target: { value: "1080×1080" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar critério/ }));
    fireEvent.change(screen.getByLabelText("Critérios de conclusão 1"), { target: { value: "Aprovada pela comunicação" } });
    expect(screen.getByTestId("task-dirty").textContent).toBe("Alterações não salvas");
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(bodies[0]).toMatchObject({
      title: "Peça para campanha", type: "IMAGEM_EDITADA", area: "DESIGN", extensions: { format: "1080×1080" },
      acceptanceCriteria: [{ text: "Aprovada pela comunicação", done: false }],
    });
  });

  it("editar antes de /api/me responder não apaga o responsável", async () => {
    const bodies: Record<string, unknown>[] = [];
    let releaseMe: (r: Response) => void = () => {};
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/api/me")) return new Promise<Response>((r) => { releaseMe = r; });
      if (init?.method === "PUT") { bodies.push(JSON.parse(String(init.body))); return json(200, view({ responsibleId: ME, version: 4 })); }
      return json(404, {});
    });
    const onSaved = vi.fn();
    renderWithProviders(<TaskForm mode="edit" initial={view({ responsibleId: ME }) as never} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Editado rápido" } });
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(bodies[0]).toMatchObject({ title: "Editado rápido", responsibleId: ME });
    releaseMe(json(200, { id: ME }));
  });

  it("422 do servidor aparece junto do campo; 409 mantém o texto e oferece recarregar", async () => {
    let call = 0;
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/api/me")) return json(200, { id: ME });
      if (u.endsWith(`/api/tasks/${ID}`) && init?.method === "PUT") {
        call += 1;
        return call === 1
          ? json(422, { status: 422, code: "VALIDACAO", message: "x", details: { fields: { references: "Endereço http(s) inválido." } } })
          : json(409, { status: 409, code: "EDICAO_CONCORRENTE", message: "Outra edição" });
      }
      if (u.endsWith(`/api/tasks/${ID}`)) return json(200, view({ title: "Título do servidor", version: 4 }));
      return json(404, {});
    });
    renderWithProviders(<TaskForm mode="edit" initial={view() as never} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Meu texto local" } });
    fireEvent.click(screen.getByTestId("task-submit"));
    expect(await screen.findByText("Endereço http(s) inválido.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("task-submit"));
    const conflict = await screen.findByTestId("task-conflict");
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe("Meu texto local");
    fireEvent.click(within(conflict).getByRole("button", { name: "Recarregar versão atual" }));
    await waitFor(() => expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe("Título do servidor"));
  });
});

describe("Minhas tarefas e detalhe (RF41)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("card mostra tipo, objetivo, estado padronizado, progresso e próxima ação; filtro por estado", async () => {
    fetchMock.mockResolvedValue(json(200, [view(), view({ id: "33333333-3333-4333-8333-333333333333", title: "Em curso", state: "EM_USO", acceptanceCriteria: [] })]));
    renderWithProviders(<MyTasks />);
    const cards = await screen.findAllByTestId("persisted-task-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]!.textContent).toContain("A realizar");
    expect(cards[0]!.textContent).toContain("1 de 2 critérios atendidos");
    expect(cards[0]!.textContent).toContain("Iniciar");
    expect(cards[1]!.textContent).toContain("Sem critérios de conclusão: sem percentual");
    fireEvent.click(screen.getByRole("button", { name: /Em andamento/ }));
    expect(screen.getAllByTestId("persisted-task-card")).toHaveLength(1);
  });

  it("sem sessão explica o motivo em vez de mostrar exemplos", async () => {
    fetchMock.mockResolvedValue(json(401, { code: "NAO_AUTENTICADO" }));
    renderWithProviders(<MyTasks />);
    expect(await screen.findByText(/Entre na sua conta para ver e salvar tarefas/)).toBeTruthy();
  });

  it("próxima ação transiciona com a versão atual e o bloqueio exige motivo", async () => {
    const posts: unknown[] = [];
    fetchMock.mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/transitions")) { posts.push(JSON.parse(String(init!.body))); return json(200, view({ state: "EM_USO", version: 4, responsibleId: ME })); }
      return json(200, view({ responsibleId: ME }));
    });
    renderWithProviders(<PersistedTaskDetail id={ID} />);
    fireEvent.click(await screen.findByTestId("next-action"));
    await waitFor(() => expect(posts).toEqual([{ to: "EM_USO", version: 3 }]));
    await waitFor(() => expect(screen.getByTestId("next-action").textContent).toBe("Concluir"));
    fireEvent.click(screen.getByRole("button", { name: "Bloquear" }));
    const block = screen.getAllByRole("button", { name: "Bloquear" }).at(-1)!;
    expect(block.hasAttribute("disabled") || block.getAttribute("aria-disabled") === "true").toBe(true);
    fireEvent.change(screen.getByLabelText("Motivo do bloqueio"), { target: { value: "Aguardando parecer" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Bloquear" }).at(-1)!);
    await waitFor(() => expect(posts.at(-1)).toEqual({ to: "BLOQUEADA", version: 4, reason: "Aguardando parecer", blockedByUserId: ME }));
  });

  it("404 diz que não existe ou não há acesso (sem revelar qual)", async () => {
    fetchMock.mockResolvedValue(json(404, { code: "NAO_ENCONTRADO", message: "Tarefa não encontrado(a)" }));
    renderWithProviders(<PersistedTaskDetail id={ID} />);
    expect(await screen.findByText("Ela não existe ou você não tem acesso a ela.")).toBeTruthy();
  });
});
