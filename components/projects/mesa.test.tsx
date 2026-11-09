// @vitest-environment jsdom
/**
 * Telas da Mesa de Trabalho (RF22): quadro por fases, linha do tempo, canvas conectado e feedback — com o dispatch real, para
 * provar que a edição numa área muda o modelo que todas as outras projetam.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { computeMetrics } from "@/lib/projects/metrics";
import type { ProjectModel } from "@/lib/projects/types";
import { renderPanel } from "@/test-utils/projects";
import { renderWithProviders } from "@/test-utils/render";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { FeedbackPanel } from "./FeedbackPanel";
import { PhaseBoard } from "./PhaseBoard";
import { ProjectCanvas } from "./ProjectCanvas";
import { Timeline } from "./Timeline";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/decia-v1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

const column = (id: string) => document.querySelector<HTMLElement>(`[data-column="${id}"]`)!;
const taskCodeIn = (el: HTMLElement) => [...el.querySelectorAll("[data-task]")].map((n) => n.getAttribute("data-task"));

describe("Quadro por fases", () => {
  it("colunas = 7 fases institucionais; a fase atual tem o portão aberto com os critérios verificados", () => {
    renderPanel(PhaseBoard);
    const cols = document.querySelectorAll("[data-column]");
    expect(cols.length).toBe(7);
    const elab = column("ELABORACAO");
    expect(within(elab).getByText("Fase atual")).toBeTruthy();
    expect(within(elab).getByText(/Grupo de processos dominante: Planejamento/)).toBeTruthy();
    const gate = elab.querySelector<HTMLDetailsElement>('[data-gate="ELABORACAO"]')!;
    expect(gate.open).toBe(true);
    expect(gate.querySelectorAll('[data-ok="false"]').length).toBeGreaterThan(0);
    expect(taskCodeIn(column("ELABORACAO"))).toContain("tB");
    // portão da Demanda decidido fora do DECIA
    expect(within(column("DEMANDA")).getByText(/Decidido fora do DECIA/)).toBeTruthy();
  });

  it("modelo PMBOK agrupa as fases do planejamento; Scrum mostra a sprint e só a Execução no híbrido", () => {
    const h = renderPanel(PhaseBoard);
    fireEvent.click(screen.getByRole("tab", { name: /PMBOK/ }));
    expect(h.state.model.boardModel).toBe("PMBOK");
    expect(document.querySelectorAll("[data-column]").length).toBe(4);
    expect(taskCodeIn(column("PLANEJAMENTO")).sort()).toEqual(["tB", "tC", "tM", "tP"]);
    fireEvent.click(screen.getByRole("tab", { name: /Scrum/ }));
    expect(screen.getByLabelText("Scrum: sprint, artefatos e eventos")).toBeTruthy();
    const all = [...document.querySelectorAll("[data-task]")].map((n) => n.getAttribute("data-task"));
    expect(all.sort()).toEqual(["tD", "tX"]);
  });

  it("criar atividade numa coluna e mover pelo menu (alternativa ao arrastar) muda a fase no modelo", () => {
    const h = renderPanel(PhaseBoard);
    const exec = column("EXECUCAO");
    fireEvent.change(within(exec).getByLabelText("Nova atividade em Execução"), { target: { value: "Treinar o comitê" } });
    fireEvent.click(within(exec).getByRole("button", { name: "Adicionar" }));
    const created = h.state.model.tasks.find((t) => t.title === "Treinar o comitê")!;
    expect(created).toMatchObject({ phase: "EXECUCAO", status: "A_FAZER", code: "T09" });
    fireEvent.click(within(column("ANALISE")).getByRole("button", { name: "Mover T04" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Elaboração/ }));
    expect(h.state.model.tasks.find((t) => t.code === "T04")!.phase).toBe("ELABORACAO");
    expect(h.state.model.versions.at(-1)).toMatchObject({ key: "taskPhase", vars: { code: "T04", phase: "ELABORACAO" } });
  });

  it("faixa transversal de monitoramento e controle leva à área certa; revisão do portão abre no DECIA", () => {
    const h = renderPanel(PhaseBoard);
    fireEvent.click(document.querySelector<HTMLElement>('[data-tile="creep"]')!);
    expect(h.visited).toEqual(["controle"]);
    fireEvent.click(within(column("ELABORACAO")).getByRole("button", { name: "Pedir revisão do portão no DECIA" }));
    expect(h.deciaCalls).toEqual([{ kind: "gate", arg: "ELABORACAO" }]);
  });

  it("somente leitura: sem adicionar, sem mover, sem pedir portão", () => {
    renderPanel(PhaseBoard, { readOnly: true });
    expect(screen.queryByRole("button", { name: "Adicionar" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Mover T/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pedir revisão do portão no DECIA" })).toBeNull();
    expect(document.querySelector('[draggable="true"]')).toBeNull();
  });
});

describe("Linha do tempo além do Gantt", () => {
  it("Gantt, rede (atividade no nó), CPM, PERT e curva S a partir do mesmo modelo", () => {
    renderPanel(Timeline);
    expect(screen.getByText(/Caminho crítico: T01 → T03 → T05 → T06 → T07/)).toBeTruthy();
    expect(document.querySelectorAll("[data-row]").length).toBe(8);
    expect(document.querySelectorAll("[data-node]").length).toBe(8);
    expect(screen.getByRole("table", { name: "Tabela do método do caminho crítico (CPM)" })).toBeTruthy();
    expect(screen.getByText("Prazo com 80% de confiança")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Curva S e valor agregado" })).toBeTruthy();
  });

  it("nova dependência pelo formulário entra na rede; ciclo é recusado sem quebrar", () => {
    const h = renderPanel(Timeline);
    const form = screen.getByLabelText("Predecessora").closest("form")!;
    fireEvent.change(within(form).getByLabelText("Predecessora"), { target: { value: "tC" } });
    fireEvent.change(within(form).getByLabelText("Sucessora"), { target: { value: "tD" } });
    fireEvent.click(within(form).getByRole("button", { name: "Adicionar" }));
    expect(h.state.model.dependencies.some((d) => d.from === "tC" && d.to === "tD")).toBe(true);
    fireEvent.change(within(form).getByLabelText("Predecessora"), { target: { value: "tE" } });
    fireEvent.change(within(form).getByLabelText("Sucessora"), { target: { value: "tA" } });
    fireEvent.click(within(form).getByRole("button", { name: "Adicionar" }));
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "CICLO" });
    expect(h.state.model.dependencies.some((d) => d.from === "tE" && d.to === "tA")).toBe(false);
  });

  it("rede com ciclo mostra o alerta com o caminho e o atalho para o canvas", () => {
    const base = buildDemoProject();
    const cyclic: ProjectModel = { ...base, dependencies: [...base.dependencies, { id: "dx", from: "tE", to: "tA", type: "FS", lagDays: 0 }] };
    const h = renderPanel(Timeline, { model: cyclic });
    expect(screen.getByRole("alert").textContent).toMatch(/Ciclo: /);
    fireEvent.click(screen.getByRole("button", { name: "Abrir em Canvas" }));
    expect(h.visited).toEqual(["canvas"]);
  });

  it("clicar numa linha do Gantt abre o inspetor; o PERT da atividade recalcula o caminho", () => {
    const h = renderPanel(Timeline);
    fireEvent.click(document.querySelector('[data-row="T03"]')!);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/T03 · Arquitetura e protótipo/)).toBeTruthy();
    const pess = within(dialog).getByLabelText("Pessimista (P)");
    fireEvent.change(pess, { target: { value: "10" } });
    fireEvent.blur(pess);
    expect(h.state.model.tasks.find((t) => t.code === "T03")!.pert).toEqual({ o: 4, m: 4, p: 10 });
    expect(within(dialog).getByText(/TE = 5 dias/)).toBeTruthy();
  });
});

describe("Monte Carlo na linha do tempo", () => {
  it("simula cenários e mostra percentis e o índice de criticidade das atividades", () => {
    renderPanel(Timeline);
    fireEvent.click(screen.getByRole("button", { name: /^Simular .* cenários$/ }));
    const box = document.querySelector<HTMLElement>("[data-montecarlo]")!;
    expect(within(box).getByText("P80")).toBeTruthy();
    expect(box.querySelector('[data-crit="T06"]')!.textContent).toMatch(/100/);
    expect(box.querySelector('[data-crit="T04"]')).toBeNull();
    expect(screen.getByRole("button", { name: /^Simular de novo/ })).toBeTruthy();
  });
});

describe("Canvas conectado", () => {
  it("mostra o Project Model Canvas, as faixas e os itens do modelo, com as ligações", () => {
    renderPanel(ProjectCanvas);
    expect(screen.getByText("Requisitos")).toBeTruthy();
    expect(document.querySelectorAll('[data-ref^="TASK:"]').length).toBe(8);
    expect(document.querySelectorAll('[data-ref^="REQ:"]').length).toBe(3);
    expect(document.querySelector('[data-ref="NOTE:n1"]')).toBeTruthy();
    expect(document.querySelectorAll("[data-edge]").length).toBeGreaterThan(8);
  });

  it("mover a atividade para outra faixa (alternativa ao arrastar) muda a fase e avisa onde o efeito aparece", () => {
    const h = renderPanel(ProjectCanvas, { selected: "TASK:tC" });
    const inspector = document.querySelector<HTMLElement>('[data-inspector="TASK:tC"]')!;
    fireEvent.change(within(inspector).getByLabelText("Mover para a fase…"), { target: { value: "EXECUCAO" } });
    fireEvent.click(within(inspector).getByRole("button", { name: "Mover" }));
    expect(h.state.model.tasks.find((t) => t.id === "tC")!.phase).toBe("EXECUCAO");
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/Atividade T04 movida para Execução/);
    fireEvent.click(within(status).getByRole("button", { name: "Linha do tempo" }));
    expect(h.visited).toEqual(["cronograma"]);
  });

  it("post-it convertido no bloco Requisitos vira requisito; ligar requisito → entrega completa a rastreabilidade", () => {
    const h = renderPanel(ProjectCanvas, { selected: "NOTE:n1" });
    const inspector = document.querySelector<HTMLElement>('[data-inspector="NOTE:n1"]')!;
    fireEvent.change(within(inspector).getByLabelText("Converter em…"), { target: { value: "REQUISITOS" } });
    fireEvent.click(within(inspector).getByRole("button", { name: "Converter" }));
    const req = h.state.model.requirements.find((r) => r.text === "Integração com o e-Protocolo?")!;
    expect(req.code).toBe("RF-04");
    expect(h.state.model.canvas.notes).toEqual([]);
    expect(h.selections.at(-1)).toBe(`REQ:${req.id}`);
  });

  it("ligar pelo inspetor (teclado): requisito RF-03 → entrega; ligação inválida é recusada sem quebrar", () => {
    const h = renderPanel(ProjectCanvas, { selected: "REQ:r3" });
    const inspector = document.querySelector<HTMLElement>('[data-inspector="REQ:r3"]')!;
    const select = within(inspector).getByLabelText("Ligar a…") as HTMLSelectElement;
    const option = [...select.options].find((o) => o.value === "WBS:w12")!;
    fireEvent.change(select, { target: { value: option.value } });
    fireEvent.click(within(inspector).getByRole("button", { name: "Ligar" }));
    expect(h.state.model.requirements.find((r) => r.id === "r3")!.deliverableIds).toEqual(["w12"]);
    // tecla L inicia a ligação; Enter no destino tenta ligar requisito → risco (não existe essa relação)
    const req = document.querySelector<SVGGElement>('[data-ref="REQ:r1"]')!;
    fireEvent.keyDown(req, { key: "l" });
    fireEvent.keyDown(document.querySelector('[data-ref="RISK:k1"]')!, { key: "Enter" });
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "LIGACAO_INVALIDA" });
  });

  it("criar no canvas pelo diálogo: fora das zonas nasce post-it livre", () => {
    const h = renderPanel(ProjectCanvas);
    fireEvent.click(screen.getByRole("button", { name: "Novo post-it" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/vira post-it livre/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Texto"), { target: { value: "Conversar com o controle interno" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar" }));
    expect(h.state.model.canvas.notes.map((n) => n.text)).toContain("Conversar com o controle interno");
  });

  it("somente leitura: sem ferramentas de edição nem formulários no inspetor", () => {
    renderPanel(ProjectCanvas, { readOnly: true, selected: "TASK:tC" });
    expect((screen.getByRole("button", { name: "Ligar itens" }) as HTMLButtonElement).disabled).toBe(true);
    const inspector = document.querySelector<HTMLElement>('[data-inspector="TASK:tC"]')!;
    expect(within(inspector).queryByLabelText("Mover para a fase…")).toBeNull();
    expect(within(inspector).queryByLabelText("Ligar a…")).toBeNull();
  });
});

describe("Feedback da IA (janela segmentada)", () => {
  it("três grupos separados, leitura do sistema, prioridades com aula e atalho para corrigir", () => {
    const model = buildDemoProject();
    const metrics = computeMetrics(model);
    const goTo = vi.fn();
    renderWithProviders(<FeedbackPanel model={model} metrics={metrics} dispatch={() => ({ ok: false, error: "NAO_ENCONTRADO" })} people={DEMO_PEOPLE} readOnly={false} goTo={goTo} />);
    expect(document.querySelectorAll("[data-group]").length).toBe(3);
    expect(screen.getByText(/O projeto está na fase Elaboração/)).toBeTruthy();
    expect(screen.getByText(/nenhum motor de IA conectado/)).toBeTruthy();
    const first = document.querySelector<HTMLElement>("[data-priority]")!;
    expect(within(first).getByText("Crítico")).toBeTruthy();
    fireEvent.click(within(first).getByRole("button", { name: /^Corrigir em / }));
    expect(goTo).toHaveBeenCalledTimes(1);
    // a carga por pessoa inclui quem não tem atividade e não vira nota de ninguém
    expect(document.querySelector('[data-load="u-bruno"]')!.textContent).toMatch(/0 d/);
  });

  it("o que mudou: a edição de outra aba aparece aqui (reserva passa a cobrir o VME)", () => {
    const before = buildDemoProject();
    const after: ProjectModel = { ...before, reserves: { contingency: 30_000, management: 5_000 }, version: before.version + 1 };
    renderWithProviders(
      <FeedbackPanel model={after} metrics={computeMetrics(after)} previous={computeMetrics(before)} sessionStart={computeMetrics(before)} dispatch={() => ({ ok: false, error: "NAO_ENCONTRADO" })} people={DEMO_PEOPLE} readOnly={false} />,
    );
    const change = document.querySelector<HTMLElement>('[data-change="Q_RESERVA"]')!;
    expect(change.textContent).toMatch(/melhorou/);
    expect(change.textContent).toMatch(/Adequado/);
    expect(screen.getByText(/1 melhoraram, 0 pioraram/)).toBeTruthy();
  });
});
