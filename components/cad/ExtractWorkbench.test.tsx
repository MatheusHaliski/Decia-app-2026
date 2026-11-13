// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadTaskDraft } from "@/lib/tasks/drafts";
import { renderWithProviders } from "@/test-utils/render";
import { ExtractWorkbench } from "./ExtractWorkbench";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, refresh: vi.fn() }),
  usePathname: () => "/tasks/extrair",
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({}),
}));

/* ── DXF montado no teste: sala 5 × 4 m (mm), paredes em linha dupla (18 m de linhas), 3 portas ── */
type V = string | number;
const g = (...pairs: [number, V][]) => pairs.map(([c, v]) => `${String(c).padStart(3, " ")}\n${v}`).join("\n");
const rect = (x: number, y: number, w: number, h: number) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] as const;
const PLANTA_DXF = [
  g([0, "SECTION"], [2, "HEADER"], [9, "$INSUNITS"], [70, 4], [0, "ENDSEC"]),
  g([0, "SECTION"], [2, "ENTITIES"]),
  g([0, "LWPOLYLINE"], [8, "ARQ-AMBIENTE"], [90, 4], [70, 1], ...rect(0, 0, 5000, 4000).flatMap(([x, y]) => [[10, x], [20, y]] as [number, V][])),
  g([0, "TEXT"], [8, "ARQ-AMBIENTE"], [10, 2500], [20, 2000], [40, 200], [1, "SALA"]),
  g([0, "LINE"], [8, "ARQ-PAREDE"], [10, 0], [20, 0], [11, 5000], [21, 0]),
  g([0, "LINE"], [8, "ARQ-PAREDE"], [10, 0], [20, 150], [11, 5000], [21, 150]),
  g([0, "LINE"], [8, "ARQ-PAREDE"], [10, 0], [20, 0], [11, 0], [21, 4000]),
  g([0, "LINE"], [8, "ARQ-PAREDE"], [10, 150], [20, 0], [11, 150], [21, 4000]),
  g([0, "INSERT"], [8, "ARQ-PORTAS"], [2, "PORTA 80"], [10, 100], [20, 0]),
  g([0, "INSERT"], [8, "ARQ-PORTAS"], [2, "PORTA 80"], [10, 900], [20, 0]),
  g([0, "INSERT"], [8, "ARQ-PORTAS"], [2, "PORTA 80"], [10, 1800], [20, 0]),
  g([0, "ENDSEC"], [0, "EOF"]),
].join("\n");

const spaced = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const noPlaceholders = () => expect(document.body.textContent ?? "").not.toMatch(/\{[A-Za-z]+\}|cad\.[a-z]+\.[A-Za-z]/);

async function upload(name: string, content: BlobPart) {
  fireEvent.change(screen.getByTestId("cad-input"), { target: { files: [new File([content], name)] } });
}

beforeEach(() => {
  nav.push.mockReset();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("ExtractWorkbench (RF34 + RF70)", () => {
  it("envia o DXF → quantitativos (20 m² da sala, parede derivada, portas) → planilha com BDI → cronograma → ✦ → cria a tarefa com o rascunho", async () => {
    renderWithProviders(<ExtractWorkbench />);
    expect(screen.getByTestId("cad-formats")).toBeTruthy();
    await upload("planta.dxf", PLANTA_DXF);

    const table = await screen.findByTestId("cad-quantities");
    expect(screen.getByTestId("cad-status").textContent).toBe("planta.dxf lido: 5 linhas de quantitativo.");
    expect(spaced(screen.getByTestId("cad-unit").textContent)).toContain("milímetros · declarada no arquivo");
    expect(within(table).getByText("SALA")).toBeTruthy();
    expect((screen.getByTestId("cad-qty-dxf:room:0") as HTMLInputElement).value).toBe("20");
    expect((screen.getByTestId("cad-qty-dxf:wall:ARQ-PAREDE") as HTMLInputElement).value).toBe("25.2");
    expect((screen.getByTestId("cad-qty-dxf:block:PORTA 80") as HTMLInputElement).value).toBe("3");
    expect(table.querySelector('[data-row="dxf:wall:ARQ-PAREDE"] [data-formula]')!.textContent).toBe("(18,00 m de linhas ÷ 2 + 0,00 m de multilinhas) × 2,80 m de pé-direito");
    expect(screen.getByTestId("cad-alerts").textContent).toContain("3 inserções de bloco entraram como contagem");
    noPlaceholders();

    // ✦ só quando pedido, só com os números calculados
    expect(screen.queryByTestId("cad-ai-notes")).toBeNull();
    fireEvent.click(screen.getByTestId("cad-ai-ask"));
    const notes = await screen.findByTestId("cad-ai-notes");
    expect(notes.textContent).toContain("Li 9 entidades em 3 camadas de planta.dxf: 5 linhas de quantitativo, 3 na planilha.");
    expect(spaced(notes.textContent)).toContain("Total de exemplo: R$ 28.505,00 com BDI de 25% (custo direto R$ 22.804,00).");

    // planilha: valores de exemplo, BDI editável
    fireEvent.click(screen.getByRole("tab", { name: "Planilha orçamentária" }));
    expect(screen.getByTestId("cad-example-note").textContent).toContain("Valores de exemplo — use a tabela de referência vigente do órgão, como SINAPI/SICRO.");
    const budget = screen.getByTestId("cad-budget");
    expect([...budget.querySelectorAll("tbody")].map((b) => b.getAttribute("data-group"))).toEqual(["CANTEIRO", "ALVENARIA", "REVESTIMENTOS", "LIMPEZA"]);
    expect(spaced(budget.querySelector('[data-total="linha:dxf:wall:ARQ-PAREDE"]')!.textContent)).toBe("R$ 2.394,00");
    expect(spaced(screen.getByTestId("cad-total").textContent)).toBe("R$ 28.505,00");
    const bdi = screen.getByTestId("cad-bdi");
    fireEvent.change(bdi, { target: { value: "10" } });
    fireEvent.blur(bdi);
    await waitFor(() => expect(spaced(screen.getByTestId("cad-total").textContent)).toBe("R$ 25.084,40"));
    // preço unitário editado vale para o código
    const price = screen.getByTestId("cad-price-linha:dxf:block:PORTA 80");
    fireEvent.change(price, { target: { value: "1000" } });
    fireEvent.blur(price);
    await waitFor(() => expect(spaced(screen.getByTestId("cad-direct").textContent)).toBe("R$ 22.954,00"));
    noPlaceholders();

    // cronograma
    fireEvent.click(screen.getByRole("tab", { name: "Cronograma" }));
    const schedule = screen.getByTestId("cad-schedule");
    expect(schedule.querySelectorAll("tbody tr")).toHaveLength(8);
    expect(schedule.querySelector('[data-stage="ALVENARIA"]')!.getAttribute("data-status")).toBe("CALCULADA");
    expect(schedule.querySelector('[data-stage="FUNDACAO"]')!.getAttribute("data-status")).toBe("ESTIMADA");
    expect(screen.getByTestId("cad-schedule-total").textContent).toMatch(/^17 dias úteis, de \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}$/);
    noPlaceholders();

    // criar tarefa: rascunho no sessionStorage e navegação para o criador
    fireEvent.click(screen.getByTestId("cad-create-task"));
    expect(nav.push).toHaveBeenCalledTimes(1);
    const href = String(nav.push.mock.calls[0]![0]);
    expect(href).toMatch(/^\/tasks\/new\?rascunho=[a-z0-9]{12}$/);
    const handoff = loadTaskDraft(href.split("=")[1]!)!;
    expect(handoff.origin).toEqual({ kind: "CAD", label: "planta.dxf" });
    expect(handoff.draft).toMatchObject({ title: "Cronograma de obra de planta.dxf", type: "CRONOGRAMA", area: "ENGENHARIA", extensions: { discipline: "Orçamento e planejamento de obras" } });
    expect(handoff.draft.descriptionMd).toContain("| Paredes (alvenaria) — ARQ-PAREDE | Calculada das linhas da camada ARQ-PAREDE | m² | 25,20 | Média | Sim |");
    expect(handoff.draft.descriptionMd).toContain("> Valores de exemplo — use a tabela de referência vigente do órgão, como SINAPI/SICRO.");
    expect(handoff.draft.criteria).toContain("ART (ou RRT) do responsável técnico emitida e anexada à entrega");
  });

  it("corrige uma quantidade (valor original guardado), desfaz, tira da planilha e troca a unidade", async () => {
    renderWithProviders(<ExtractWorkbench />);
    await upload("planta.dxf", PLANTA_DXF);
    await screen.findByTestId("cad-quantities");
    const qty = screen.getByTestId("cad-qty-dxf:room:0");
    fireEvent.change(qty, { target: { value: "21.5" } });
    fireEvent.blur(qty);
    await waitFor(() => expect(screen.getByTestId("cad-q-summary").textContent).toBe("5 linhas · 3 na planilha · 1 corrigidas"));
    expect(screen.getByText("corrigida (era 20,00)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Desfazer a correção de Ambiente (área de piso) — SALA" }));
    await waitFor(() => expect(screen.getByTestId("cad-q-summary").textContent).toBe("5 linhas · 3 na planilha · 0 corrigidas"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Incluir Portas — PORTA 80 na planilha e no cronograma" }));
    await waitFor(() => expect(screen.getByTestId("cad-q-summary").textContent).toBe("5 linhas · 2 na planilha · 0 corrigidas"));
    fireEvent.change(screen.getByTestId("cad-unit-select"), { target: { value: "cm" } });
    await waitFor(() => expect((screen.getByTestId("cad-qty-dxf:room:0") as HTMLInputElement).value).toBe("2000"));
    expect(spaced(screen.getByTestId("cad-unit").textContent)).toContain("centímetros · escolhida por você");
  });

  it("exporta a planilha em CSV no próprio navegador (BOM, ; e vírgula decimal)", async () => {
    const blobs: Blob[] = [];
    Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => { blobs.push(b); return "blob:cad"; }), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderWithProviders(<ExtractWorkbench />);
    await upload("Planta Térreo.dxf", PLANTA_DXF);
    await screen.findByTestId("cad-quantities");
    fireEvent.click(screen.getByRole("tab", { name: "Planilha orçamentária" }));
    fireEvent.click(screen.getByTestId("cad-budget-csv"));
    expect(click).toHaveBeenCalledTimes(1);
    expect([...new Uint8Array(await blobs[0]!.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM UTF-8
    const csv = await blobs[0]!.text();
    expect(csv).toContain("Código;Etapa;Serviço;Origem no arquivo;Unid.;Quant.;Preço unitário (R$);Total (R$)");
    expect(csv).toContain("EX-06;Alvenaria;Alvenaria de vedação;ARQ-PAREDE;m²;25,20;95,00;2394,00");
    expect(csv).toContain(";;Total com BDI;;;;;28505,00");
    expect(await screen.findByText("Planilha exportada em CSV")).toBeTruthy();
  });

  it("recusa formato fora da lista e conteúdo divergente com mensagem clara; DWG só mostra a versão", async () => {
    renderWithProviders(<ExtractWorkbench />);
    await upload("foto.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Formato não aceito");
    expect(alert.textContent).toContain("foto.png — A extensão .png não é de desenho que este leitor mede.");
    await upload("planta.ifc", PLANTA_DXF);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Conteúdo e extensão não batem"));
    expect(screen.getByRole("alert").textContent).toContain("O conteúdo é DXF, mas a extensão é .ifc.");
    await upload("planta.dwg", new Uint8Array([0x41, 0x43, 0x31, 0x30, 0x33, 0x32, 0, 0, 0, 0, 0, 0x1f]));
    const dwg = await screen.findByTestId("cad-dwg");
    expect(dwg.textContent).toContain("Versão AC1032: AutoCAD 2018 ou posterior.");
    expect(dwg.textContent).toContain("Salvar como → DXF");
    expect(screen.queryByTestId("cad-create-task")).toBeNull();
    expect(screen.queryByTestId("cad-quantities")).toBeNull();
  });
});
