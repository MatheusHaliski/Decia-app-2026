// @vitest-environment jsdom
/**
 * Acervo por área (RF4 + RF81): escolher a área configura o formulário, os modelos da área e do campo de estudo preenchem a
 * tarefa, e o feedback de qualidade se atualiza e corrige com um clique.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import { renderWithProviders } from "@/test-utils/render";
import { TaskForm } from "./TaskForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks/new",
  useSearchParams: () => new URLSearchParams(),
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
