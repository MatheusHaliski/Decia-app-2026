// @vitest-environment jsdom
/**
 * Acervo por área (RF4 + RF81): escolher a área configura o formulário, os modelos da área e do campo de estudo preenchem a
 * tarefa, e o feedback de qualidade se atualiza e corrige com um clique. Profissão preferida (D-147): o campo vem pré-selecionado
 * só no criador do dono, marcado e trocável, e só fica gravado na tarefa com confirmação. Rascunho de outra tela (`?rascunho=`):
 * preenche, mostra a origem, descarta e some depois de salvar. D-153: pacote em pesquisa sem status nem versão na tela.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import { loadTaskDraft, saveTaskDraft } from "@/lib/tasks/drafts";
import type { TaskView } from "@/lib/tasks/client";
import { renderWithProviders } from "@/test-utils/render";
import { TaskForm } from "./TaskForm";

const nav = vi.hoisted(() => ({ search: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks/new",
  useSearchParams: () => nav.search,
  useParams: () => ({}),
}));

const ME = "11111111-1111-4111-8111-111111111111";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fetchMock = vi.fn<typeof fetch>();
const bodies: Record<string, unknown>[] = [];

beforeEach(() => {
  bodies.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, init) => {
    const u = String(url);
    if (u.endsWith("/api/me")) return json(200, { id: ME });
    if (u.endsWith("/api/tasks") && init?.method === "POST") {
      const b = JSON.parse(String(init.body)) as Record<string, unknown>;
      bodies.push(b);
      return json(201, { ...b, id: "22222222-2222-4222-8222-222222222222", version: 1, state: "RASCUNHO" });
    }
    return json(404, { code: "NAO_ENCONTRADO" });
  });
  window.localStorage.clear();
  window.sessionStorage.clear();
  nav.search = new URLSearchParams();
});
afterEach(() => vi.unstubAllGlobals());

const assist = () => screen.getByTestId("task-assist");
const quality = () => screen.getByTestId("task-quality");
const check = (id: string) => quality().querySelector<HTMLElement>(`[data-check="${id}"]`);

describe("assistente da área no criador de tarefas", () => {
  it("escolher a área configura o formulário (tipo e acesso) e liga as regras da área", () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    expect(quality().getAttribute("data-readiness")).toBe("INCOMPLETA");
    fireEvent.click(within(assist()).getByRole("button", { name: "Jurídico" }));
    expect((screen.getByLabelText(/Área profissional/) as HTMLSelectElement).value).toBe("JURIDICO");
    expect((screen.getByLabelText(/^Tipo/) as HTMLSelectElement).value).toBe("DOCUMENTO");
    expect((screen.getByLabelText(/^Classificação/) as HTMLSelectElement).value).toBe("RESTRITO");
    expect(check("jurPrazo")!.getAttribute("data-status")).toBe("FALTA");
    // os modelos da área aparecem
    expect(within(assist()).getAllByRole("button", { name: /^Usar o modelo / }).length).toBe(AREA_TEMPLATES.filter((t) => t.area === "JURIDICO").length);
  });

  it("usar um modelo preenche título, objetivo, entregas e critérios; com conteúdo, pede confirmação", () => {
    const tpl = AREA_TEMPLATES.find((t) => t.area === "SOFTWARE")!;
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Meu rascunho" } });
    fireEvent.change(screen.getByLabelText(/Área profissional/), { target: { value: "SOFTWARE" } });
    fireEvent.click(within(assist()).getByRole("button", { name: `Usar o modelo ${tpl.title}` }));
    // já havia conteúdo: confirma antes de substituir
    fireEvent.click(within(assist()).getByRole("button", { name: "Substituir" }));
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe(tpl.title);
    expect(screen.getByTestId("criteria").querySelectorAll("li").length).toBe(tpl.criteria.length);
    expect(screen.getByTestId("deliverables").querySelectorAll("li").length).toBe(tpl.deliverables.length);
  });

  it("correção de um clique: pesquisa com pessoas ganha o critério de consentimento", () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Área profissional/), { target: { value: "PESQUISA" } });
    fireEvent.change(screen.getByLabelText("Amostra"), { target: { value: "120 servidores entrevistados" } });
    const etica = check("pqEtica")!;
    expect(etica.getAttribute("data-status")).toBe("AVISO");
    fireEvent.click(within(etica).getByRole("button", { name: /^Usar critério sugerido: Termo de consentimento/ }));
    const inputs = [...screen.getByTestId("criteria").querySelectorAll("input")].map((i) => (i as HTMLInputElement).value);
    expect(inputs.some((v) => v.startsWith("Termo de consentimento"))).toBe(true);
    // resolvido: sai da lista do que pede atenção e aparece entre o que já está bom
    expect(check("pqEtica")).toBeNull();
    fireEvent.click(within(quality()).getByRole("button", { name: /^Mostrar o que já está bom/ }));
    expect(check("pqEtica")!.getAttribute("data-status")).toBe("OK");
  });

  it("campo de estudo carrega o pacote: modelos do campo, rubrica do campo e o campo vai junto na tarefa", { timeout: 20_000 }, async () => {
    const onSaved = vi.fn();
    renderWithProviders(<TaskForm mode="create" onSaved={onSaved} />);
    fireEvent.change(within(assist()).getByLabelText(/Campo de estudo/), { target: { value: "direito" } });
    expect((screen.getByLabelText(/Área profissional/) as HTMLSelectElement).value).toBe("JURIDICO");
    // o pacote do campo chega por import dinâmico: com a suíte inteira em paralelo pode passar de 1 s
    expect(await within(assist()).findByText(/Do campo · Direito/, {}, { timeout: 8000 })).toBeTruthy();
    await waitFor(() => expect(check("campoRubrica")).not.toBeNull(), { timeout: 8000 });
    const first = within(assist()).getAllByRole("button", { name: /^Usar o modelo / })[0]!;
    fireEvent.click(first);
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(bodies.length).toBe(1), { timeout: 8000 });
    expect((bodies[0]!.extensions as Record<string, string>).studyField).toBe("direito");
    // lembrado por conta, nunca numa chave que a próxima pessoa do mesmo navegador leria
    expect(window.localStorage.getItem(`ws.tasks.studyField:${ME}`)).toBe("direito");
    expect(window.localStorage.getItem("ws.tasks.studyField")).toBeNull();
  });

  it("?modelo= abre o criador já com o modelo aplicado", () => {
    const tpl = AREA_TEMPLATES.find((t) => t.area === "ENGENHARIA")!;
    renderWithProviders(<TaskForm mode="create" templateId={tpl.id} onSaved={vi.fn()} />);
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe(tpl.title);
    expect((screen.getByLabelText(/Área profissional/) as HTMLSelectElement).value).toBe("ENGENHARIA");
  });
});

describe("profissão preferida no criador (RF81, D-147): só para o dono, marcada e trocável", () => {
  const field = () => within(assist()).getByLabelText(/Campo de estudo/) as HTMLSelectElement;

  it("o campo vem da profissão; área, extensões, modelos e checagem se adaptam; o plano aparece; trocar tira a marca", { timeout: 20_000 }, async () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />, { prefs: { preferredOccupation: "engenharia-civil" } });
    await waitFor(() => expect(field().value).toBe("engenharia-civil"));
    expect(screen.getByTestId("lens-from-profession").textContent).toContain("A partir da sua profissão — só você vê");
    expect((screen.getByLabelText(/Área profissional/) as HTMLSelectElement).value).toBe("ENGENHARIA");
    expect(within(screen.getByTestId("area-fields")).getByLabelText("Norma técnica")).toBeTruthy();
    expect(check("engNorma")!.getAttribute("data-status")).toBe("AVISO");
    // D-153: o pacote (em pesquisa) aparece "em revisão por especialistas", sem status nem versão
    await waitFor(() => expect(screen.getByTestId("pack-info").textContent).toContain("em revisão por especialistas"), { timeout: 8000 });
    expect(screen.getByTestId("pack-info").textContent).not.toMatch(/\(pesquisa\)|v\d{4}\./);
    expect(await within(assist()).findByText(/Do campo · Engenharia Civil/, {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.getByTestId("development-plan").textContent).toContain("Seu plano de desenvolvimento · Engenharia Civil");
    fireEvent.change(field(), { target: { value: "arquitetura-e-urbanismo" } });
    expect(field().value).toBe("arquitetura-e-urbanismo");
    expect(screen.queryByTestId("lens-from-profession")).toBeNull();
  });

  it("a lente sugerida só vai para a tarefa depois de confirmada", { timeout: 20_000 }, async () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />, { prefs: { preferredOccupation: "direito" } });
    await waitFor(() => expect(field().value).toBe("direito"));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Parecer sobre o contrato de suporte" } });
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(bodies.length).toBe(1), { timeout: 8000 });
    expect(bodies[0]).toMatchObject({ area: "JURIDICO", type: "DOCUMENTO" });
    expect((bodies[0]!.extensions as Record<string, string>).studyField).toBeUndefined();
    // sem lembrar a profissão como "campo usado" sem confirmação
    expect(window.localStorage.getItem(`ws.tasks.studyField:${ME}`)).toBeNull();
    fireEvent.click(screen.getByTestId("lens-confirm"));
    expect(screen.getByTestId("lens-from-profession").getAttribute("data-confirmed")).toBe("true");
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(bodies.length).toBe(2), { timeout: 8000 });
    expect((bodies[1]!.extensions as Record<string, string>).studyField).toBe("direito");
  });

  it("usar um modelo do plano da profissão confirma a lente e grava a tarefa-guia de origem", { timeout: 20_000 }, async () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />, { prefs: { preferredOccupation: "direito" } });
    await waitFor(() => expect(field().value).toBe("direito"));
    const plan = screen.getByTestId("development-plan");
    fireEvent.click(within(plan).getByText(/Seu plano de desenvolvimento/));
    const create = await within(plan).findAllByRole("button", { name: /^Criar a tarefa / }, { timeout: 8000 });
    // sem códigos internos (L/D/X) no plano
    expect(plan.textContent).not.toMatch(/\b[LDX](10|[1-9])\b/);
    fireEvent.click(create[0]!);
    await waitFor(() => expect(screen.getByTestId("lens-from-profession").getAttribute("data-confirmed")).toBe("true"));
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(bodies.length).toBe(1), { timeout: 8000 });
    const ext = bodies[0]!.extensions as Record<string, string>;
    expect(ext.studyField).toBe("direito");
    expect(ext.guidedTask).toMatch(/^[LDX]\d{1,2}$/);
  });

  it("na edição de uma tarefa existente e para o visitante não há pré-seleção nem plano", async () => {
    const existing: TaskView = { id: "33333333-3333-4333-8333-333333333333", version: 2, ownerId: ME, title: "Relatório", type: "DOCUMENTO", priority: "MEDIA", state: "DISPONIVEL", accessClass: "INTERNO", visibility: "PRIVADA", extensions: {}, editable: true };
    const { unmount } = renderWithProviders(<TaskForm mode="edit" initial={existing} onSaved={vi.fn()} />, { prefs: { preferredOccupation: "direito" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(field().value).toBe("");
    expect(screen.queryByTestId("lens-from-profession")).toBeNull();
    expect(screen.queryByTestId("development-plan")).toBeNull();
    unmount();
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />, { prefs: { preferredOccupation: "direito" }, profile: "VISITANTE" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(field().value).toBe("");
    expect(screen.queryByTestId("development-plan")).toBeNull();
  });

  it("modelo de outra área pedido pela URL não ganha a lente da profissão", async () => {
    const tpl = AREA_TEMPLATES.find((t) => t.area === "SOFTWARE")!;
    renderWithProviders(<TaskForm mode="create" templateId={tpl.id} onSaved={vi.fn()} />, { prefs: { preferredOccupation: "direito" } });
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe(tpl.title);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect((screen.getByLabelText(/Área profissional/) as HTMLSelectElement).value).toBe("SOFTWARE");
    expect(field().value).toBe("");
    expect(screen.queryByTestId("lens-from-profession")).toBeNull();
  });
});

describe("rascunho entregue por outra tela (?rascunho=<id>)", () => {
  it("preenche o formulário, mostra de onde veio e apaga o rascunho depois de salvar", async () => {
    const id = saveTaskDraft({
      draft: { title: "Quantitativo da planta baixa", type: "DESENHO_TECNICO", area: "ENGENHARIA", objective: "Levantar 120 m² de alvenaria até sexta", deliverables: ["Planilha de quantitativos"], criteria: ["Áreas conferem com a planta"], extensions: { standard: "NBR 12721" } },
      origin: { kind: "CAD", label: "planta-terreo.dxf", ref: "Projeto Sede" },
    });
    nav.search = new URLSearchParams({ rascunho: id });
    const onSaved = vi.fn();
    renderWithProviders(<TaskForm mode="create" onSaved={onSaved} />);
    const banner = await screen.findByTestId("task-draft-origin");
    expect(banner.textContent).toContain("Rascunho vindo de planta-terreo.dxf");
    expect(banner.textContent).toContain("Projeto Sede");
    expect(banner.getAttribute("data-origin")).toBe("CAD");
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe("Quantitativo da planta baixa");
    expect((screen.getByLabelText(/Área profissional/) as HTMLSelectElement).value).toBe("ENGENHARIA");
    expect((screen.getByLabelText("Norma técnica") as HTMLInputElement).value).toBe("NBR 12721");
    expect(screen.getByTestId("criteria").querySelectorAll("li").length).toBe(1);
    expect(screen.getByTestId("task-dirty").textContent).toBe("Alterações não salvas");
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(bodies[0]).toMatchObject({ title: "Quantitativo da planta baixa", type: "DESENHO_TECNICO", area: "ENGENHARIA", extensions: { standard: "NBR 12721" } });
    expect(loadTaskDraft(id)).toBeNull();
    expect(screen.queryByTestId("task-draft-origin")).toBeNull();
  });

  it("descartar limpa o formulário e o rascunho; rascunho vencido ou inexistente só avisa", async () => {
    const id = saveTaskDraft({ draft: { title: "Ação da ata de 10/11", criteria: ["Responsável definido"] }, origin: { kind: "ATA", label: "Reunião do comitê" } });
    const { unmount } = renderWithProviders(<TaskForm mode="create" draftId={id} onSaved={vi.fn()} />);
    expect((await screen.findByTestId("task-draft-origin")).textContent).toContain("Reunião do comitê");
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe("Ação da ata de 10/11");
    fireEvent.click(screen.getByTestId("task-draft-discard"));
    expect(screen.queryByTestId("task-draft-origin")).toBeNull();
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe("");
    expect(loadTaskDraft(id)).toBeNull();
    unmount();
    renderWithProviders(<TaskForm mode="create" draftId="abcdefgh99" onSaved={vi.fn()} />);
    expect((await screen.findByTestId("task-draft-missing")).textContent).toContain("não está mais disponível");
  });

  it("conteúdo inválido no rascunho não entra (tipo, área e acesso fora da lista, campos que não são texto)", async () => {
    const id = saveTaskDraft({
      draft: { title: "Ok", type: "HACK" as never, area: "MARTE" as never, accessClass: "TOTAL" as never, criteria: ["válido", 3 as never], extensions: { "bad key": "x", note: "fica" } },
      origin: { kind: "OUTRO", label: "Outra tela" },
    });
    renderWithProviders(<TaskForm mode="create" draftId={id} onSaved={vi.fn()} />);
    await screen.findByTestId("task-draft-origin");
    expect((screen.getByLabelText(/^Tipo/) as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText(/Área profissional/) as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText(/^Classificação/) as HTMLSelectElement).value).toBe("INTERNO");
    expect(screen.getByTestId("criteria").querySelectorAll("li").length).toBe(1);
  });
});
