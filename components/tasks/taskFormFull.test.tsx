// @vitest-environment jsdom
/**
 * Criador completo de tarefas (RF4/RF20, 12/11/2026): seções com índice e preenchimento, validação por campo com foco no primeiro erro,
 * regras condicionais (sigiloso exige justificativa, origem externa exige remetente e documento), campos do Acervo gravados em
 * `extensions`, prazo legal gravado logo depois de criar, "salvar e criar outra" e o seletor de tipo/formato com ícone de arquivo.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test-utils/render";
import { TaskForm } from "./TaskForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks/new",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const ME = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const RULE = "33333333-3333-4333-8333-333333333333";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fetchMock = vi.fn<typeof fetch>();
const posts: Record<string, unknown>[] = [];
const legal: Record<string, unknown>[] = [];

beforeEach(() => {
  posts.length = 0;
  legal.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, init) => {
    const u = String(url);
    if (u.endsWith("/api/me")) return json(200, { id: ME });
    if (u.endsWith("/api/legal-deadlines")) return json(200, [{ id: RULE, category: "OFICIO_MEMORANDO", subcategory: "Pedido LAI", days: 20, businessDays: false, legalBasis: "Lei 12.527/2011, art. 11" }]);
    if (u.endsWith("/api/tasks") && init?.method === "POST") {
      const b = JSON.parse(String(init.body)) as Record<string, unknown>;
      posts.push(b);
      return json(201, { ...b, id: ID, version: 1, state: "RASCUNHO" });
    }
    if (u.endsWith(`/api/tasks/${ID}/legal-deadline`)) {
      legal.push(JSON.parse(String(init!.body)));
      return json(200, { id: ID, version: 2, title: "x" });
    }
    return json(404, { code: "NAO_ENCONTRADO" });
  });
  window.localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

const fill = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("criador completo de tarefas", () => {
  it("mostra as seções com índice e preenchimento; o tipo escolhido troca o ícone do seletor", () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    const nav = screen.getByTestId("task-form-nav");
    expect(within(nav).getAllByRole("listitem").map((li) => li.getAttribute("data-section"))).toEqual(["ident", "goal", "frame", "people", "dates", "deliver", "refs", "access", "origin"]);
    expect(within(nav).getByRole("progressbar")).toBeTruthy();
    const icon = () => screen.getByTestId("task-type-icon").querySelector("svg")!;
    expect(icon().getAttribute("data-file-kind")).toBe("generic");
    fill(/^Tipo/, "PLANILHA");
    expect(icon().getAttribute("data-file-kind")).toBe("sheet");
    expect(icon().getAttribute("aria-hidden")).toBe("true");
    fill(/^Tipo/, "APRESENTACAO");
    expect(icon().getAttribute("data-file-kind")).toBe("slides");
    fill(/Título/, "Relatório");
    expect(nav.querySelector('[data-section="ident"]')!.getAttribute("data-state")).toBe("done");
  });

  it("valida com foco no primeiro erro e aplica as regras condicionais (sigiloso, origem externa)", async () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    fill(/Título/, "Resposta ao ofício do TCE");
    fill(/^Tipo/, "DOCUMENTO");
    fill(/^Classificação/, "SIGILOSO");
    fill(/^Origem/, "ORGAO_EXTERNO");
    fireEvent.click(screen.getByTestId("task-submit"));
    expect(await screen.findByText("Sigiloso exige a justificativa da classificação.")).toBeTruthy();
    expect(screen.getByText("Informe quem enviou (origem externa).")).toBeTruthy();
    expect(screen.getByText("Origem externa exige o documento de origem.")).toBeTruthy();
    expect(screen.getByTestId("task-errors").textContent).toContain("3 campos");
    const reason = screen.getByLabelText(/Justificativa da classificação/) as HTMLTextAreaElement;
    await waitFor(() => expect(document.activeElement).toBe(reason));
    // a mensagem está ligada ao campo
    expect(reason.getAttribute("aria-describedby")).toContain(reason.id);
    expect(reason.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByTestId("task-form-nav").querySelector('[data-section="origin"]')!.getAttribute("data-state")).toBe("error");
    expect(posts).toHaveLength(0);
  });

  it("envia os campos do Acervo (categoria na coluna; o resto em extensions) e grava o prazo legal depois de criar", async () => {
    const onSaved = vi.fn();
    renderWithProviders(<TaskForm mode="create" onSaved={onSaved} />);
    fill(/Título/, "Resposta ao pedido de informação");
    fill(/^Tipo/, "DOCUMENTO");
    fill(/Categoria documental/, "OFICIO_MEMORANDO");
    fill(/^Subcategoria/, "Pedido LAI");
    fireEvent.click(screen.getByRole("checkbox", { name: "Jurídica" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Administrativa" }));
    expect((screen.getByRole("checkbox", { name: "Técnica" }) as HTMLButtonElement).disabled).toBe(true); // no máximo 2
    fill(/Horas estimadas/, "30");
    expect(screen.getByText("Pelas horas estimadas, o tamanho sugerido é M (médio).")).toBeTruthy();
    fill(/^Origem/, "CIDADAO");
    fill(/Cidadão remetente/, "Maria da Silva");
    fill(/Documento de origem/, "Requerimento 7/2026");
    fill(/Nº do protocolo/, "SEI 0001");
    fireEvent.click(screen.getByRole("checkbox", { name: /^Tem prazo legal/ }));
    const rule = await screen.findByRole("option", { name: /Pedido LAI — 20 dias corridos/ });
    fireEvent.change(screen.getByLabelText(/Regra de prazo legal/), { target: { value: (rule as HTMLOptionElement).value } });
    fill(/Data de início/, "2026-11-10");
    expect(screen.getByTestId("task-legal-preview").textContent).toContain("Vencimento calculado");
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(posts[0]).toMatchObject({ category: "OFICIO_MEMORANDO", type: "DOCUMENTO" });
    const ext = posts[0]!.extensions as Record<string, string>;
    expect(ext.subcategory).toBe("Pedido LAI");
    expect(new URLSearchParams(ext.taxonomy).get("nature")).toBe("JURIDICA,ADMINISTRATIVA");
    expect(new URLSearchParams(ext.origin).get("kind")).toBe("CIDADAO");
    expect(new URLSearchParams(ext.origin).get("doc")).toBe("Requerimento 7/2026");
    expect(new URLSearchParams(ext.effort).get("hours")).toBe("30");
    expect(legal).toEqual([{ ruleId: RULE, startDate: "2026-11-10", version: 1 }]);
    expect(onSaved.mock.calls[0]![0]).toMatchObject({ version: 2 });
  });

  it("formato família → variante: só os campos da variante, aviso ao trocar, critérios sugeridos e gravação nas colunas de formato", async () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    fill(/Título/, "Base de dados de imóveis");
    fill(/^Tipo/, "PLANILHA");
    fill(/Formato da entrega/, "PLANILHA");
    expect(screen.getByTestId("task-format-family-icon").querySelector("svg")!.getAttribute("data-file-kind")).toBe("sheet");
    fill(/^Variante/, "CSV");
    expect(screen.getByTestId("task-format-variant-icon").querySelector("svg")!.getAttribute("data-file-abbr")).toBe("CSV");
    fill(/^Codificação/, "UTF8");
    fill(/^Delimitador/, "SEMICOLON");
    fireEvent.click(screen.getByRole("checkbox", { name: "Cabeçalho na linha 1" }));
    const sug = screen.getByTestId("task-format-suggestions");
    expect(sug.textContent).toContain("Entregue em CSV");
    expect(sug.textContent).toContain("Codificação UTF-8");
    fireEvent.click(within(sug).getByRole("button", { name: "Acrescentar aos critérios" }));
    expect([...screen.getByTestId("criteria").querySelectorAll("input")].map((i) => (i as HTMLInputElement).value)).toContain("Cabeçalho na linha 1");
    fill(/^Variante/, "XLSX");
    expect(screen.getByTestId("task-format-dropped").textContent).toContain("Delimitador");
    expect(screen.queryByLabelText(/^Delimitador/)).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Cabeçalho na linha 1" }).getAttribute("data-state")).toBe("checked");
    fireEvent.click(screen.getByTestId("task-submit"));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toMatchObject({ formatFamily: "PLANILHA", formatVariant: "XLSX" });
    expect(JSON.parse(posts[0]!.formatDetailsJson as string)).toMatchObject({ headerRow: "true" });
    expect(JSON.parse(posts[0]!.formatDetailsJson as string)).not.toHaveProperty("delimiter");
    expect((posts[0]!.extensions as Record<string, string>).fileFormat).toBeUndefined();
  });

  it("anexo escolhido no criador mostra o formato estimado e avisa quando difere do pedido", () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    fill(/Formato da entrega/, "PLANILHA");
    fill(/^Variante/, "XLSX");
    const input = screen.getByLabelText(/^Anexos/) as HTMLInputElement;
    // PDF é aceito pelo servidor, mas não é a planilha pedida: entra na lista com o aviso já na escolha
    fireEvent.change(input, { target: { files: [new File(["%PDF"], "dados.pdf", { type: "application/pdf" })] } });
    const line = screen.getByTestId("task-files").querySelector('[data-file="dados.pdf"]')!;
    const fmt = within(line as HTMLElement).getByTestId("attachment-format");
    expect(fmt.getAttribute("data-variant")).toBe("PDF");
    expect(fmt.getAttribute("data-estimated")).toBe("true");
    expect(within(fmt).getByTestId("format-mismatch").textContent).toContain("Planilha · XLSX");
    expect(within(line as HTMLElement).getByTestId("file-format-advice").textContent).toBe("! Você pediu Planilha (XLSX) e anexou PDF.");
  });

  it("anexo de tipo que o servidor recusa não entra: accept no input e mensagem com o que enviar", () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    fill(/Formato da entrega/, "DESENHO_TECNICO");
    const input = screen.getByLabelText(/^Anexos/) as HTMLInputElement;
    expect(input.getAttribute("accept")).toContain(".dwg");
    expect(input.getAttribute("accept")).not.toContain(".mp4");
    expect(input.multiple).toBe(true);
    fireEvent.change(input, { target: { files: [new File(["x"], "visita.mp4", { type: "video/mp4" }), new File(["x"], "notas.txt", { type: "text/plain" })] } });
    const box = screen.getByTestId("task-files");
    expect(box.querySelector('[data-file="visita.mp4"]')).toBeNull();
    expect(box.textContent).toContain("Não será aceito pelo servidor e ficou de fora: visita.mp4. Envie em DWG, DXF, IFC, GLB, PDF");
    // TXT é aceito, mas diverge do desenho técnico pedido: entra, com o aviso já na escolha
    const txt = box.querySelector('[data-file="notas.txt"]') as HTMLElement;
    expect(within(txt).getByTestId("file-format-advice").textContent).toContain("Você pediu Desenho técnico (DWG/DXF/IFC/GLB/PDF) e anexou TXT.");
    // câmera do celular: input só de imagem com capture
    const cam = screen.getByTestId("task-files-drop-camera");
    expect(cam.getAttribute("capture")).toBe("environment");
    expect(cam.getAttribute("accept")).toContain("image/png");
  });

  it("arrastar e soltar vários arquivos de uma vez entra na lista", () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    const zone = screen.getByTestId("task-files-drop");
    const files = [new File(["%PDF"], "a.pdf", { type: "application/pdf" }), new File(["x"], "b.png", { type: "image/png" })];
    fireEvent.dragOver(zone, { dataTransfer: { files } });
    expect(zone.getAttribute("data-dragging")).toBe("true");
    fireEvent.drop(zone, { dataTransfer: { files } });
    const box = screen.getByTestId("task-files");
    expect(box.querySelector('[data-file="a.pdf"]')).toBeTruthy();
    expect(box.querySelector('[data-file="b.png"]')).toBeTruthy();
  });

  it("prazo no passado ou antes do início vira atenção no campo e no feedback", async () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    fill(/^Prazo/, "2020-01-10");
    expect(screen.getByTestId("due-warning").getAttribute("data-kind")).toBe("PASSADO");
    expect(document.querySelector('[data-check="prazoPassado"]')?.getAttribute("data-status")).toBe("AVISO");
    fill(/^Início previsto/, "2099-01-01");
    fill(/^Prazo/, "2098-12-01");
    expect(screen.getByTestId("due-warning").getAttribute("data-kind")).toBe("ANTES_INICIO");
    expect(screen.getByTestId("due-warning").textContent).toContain("anterior ao início");
  });

  it("sem sessão (DEMO/sem API) avisa logo no topo que salvar exige conta, com link para entrar", async () => {
    fetchMock.mockImplementation(async () => json(401, { code: "NAO_AUTENTICADO" }));
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    const banner = await screen.findByTestId("task-no-session");
    expect(banner.textContent).toContain("Salvar uma tarefa exige entrar na sua conta");
    expect(within(banner).getByRole("link").getAttribute("href")).toBe("/login?next=%2Ftasks%2Fnew");
  });

  it("com sessão não mostra o aviso de conta", async () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("task-no-session")).toBeNull();
  });

  it("salvar e criar outra: mantém o enquadramento, limpa o resto e não sai do criador", async () => {
    const onSaved = vi.fn();
    renderWithProviders(<TaskForm mode="create" onSaved={onSaved} />);
    fill(/Título/, "Primeira");
    fill(/^Tipo/, "DOCUMENTO");
    fill(/Categoria documental/, "PARECER_TECNICO");
    fill(/^Objetivo/, "Opinar sobre o contrato");
    fireEvent.click(screen.getByTestId("task-save-another"));
    await waitFor(() => expect(posts).toHaveLength(1));
    await waitFor(() => expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe(""));
    expect(onSaved).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/^Tipo/) as HTMLSelectElement).value).toBe("DOCUMENTO");
    expect((screen.getByLabelText(/Categoria documental/) as HTMLSelectElement).value).toBe("PARECER_TECNICO");
    expect((screen.getByLabelText(/^Objetivo/) as HTMLInputElement).value).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Título/)));
  });

  it("rascunho dispensa os obrigatórios condicionais", async () => {
    renderWithProviders(<TaskForm mode="create" onSaved={vi.fn()} />);
    fill(/Título/, "Rascunho sigiloso");
    fill(/^Tipo/, "DOCUMENTO");
    fill(/^Classificação/, "SIGILOSO");
    fireEvent.click(screen.getByTestId("task-draft"));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toMatchObject({ draft: true, accessClass: "SIGILOSO" });
  });
});
