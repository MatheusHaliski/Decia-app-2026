// @vitest-environment jsdom
/**
 * Mesa (RF21/RF22): as três visões — quadro por fases, linha do tempo (Gantt) e canvas livre — leem o MESMO modelo; a posição
 * de um cartão do canvas vai para o modelo num comando só, ao soltar o arraste (nunca um por pixel), sem gerar versão, e fica
 * registrada na versão vigente; o teclado é alternativa ao arraste; "voltar a esta versão" devolve estrutura e posições juntas.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { useCallback } from "react";
import { describe, expect, it, vi } from "vitest";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import type { ProjectCommand } from "@/lib/projects/commands";
import { buildDemoProject, DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import { createMemoryProjectRepository, useProject } from "@/lib/projects/repository";
import { EXAMPLE_OFICIO } from "@/lib/projects/autopilot/examples";
import { extractDemand } from "@/lib/projects/autopilot/extract";
import { editProposal, proposalToProject, proposeScheme } from "@/lib/projects/autopilot/proposal";
import { renderPanel } from "@/test-utils/projects";
import { renderWithProviders } from "@/test-utils/render";
import { ProjectWorkspace } from "../ProjectWorkspace";
import { Timeline } from "../Timeline";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/decia-v1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = new Date("2026-11-12T12:00:00Z");

function mount() {
  const repo = createMemoryProjectRepository([buildDemoProject()]);
  const sent: ProjectCommand[] = [];
  function Harness() {
    const model = useProject(DEMO_PROJECT_ID, repo)!;
    const dispatch = useCallback((cmd: ProjectCommand) => {
      sent.push(cmd);
      return repo.dispatch(DEMO_PROJECT_ID, cmd, { actorId: "u-pessoa", now: NOW });
    }, []);
    return (
      <ProjectWorkspace model={model} dispatch={dispatch} people={DEMO_PEOPLE} readOnly={false} initialTab="canvas" initialPane="quadro"
        versionSnapshot={(n) => repo.versionSnapshot!(DEMO_PROJECT_ID, n)} />
    );
  }
  renderWithProviders(<Harness />);
  return { repo, sent, model: () => repo.get(DEMO_PROJECT_ID)! };
}
const left = () => document.querySelector<HTMLElement>('[data-pane="left"]')!;
const right = () => document.querySelector<HTMLElement>('[data-pane="right"]')!;
const column = (phase: string) => right().querySelector<HTMLElement>(`[data-column="${phase}"]`)!;

describe("Mesa: três visões, um modelo; posições e histórico sincronizados", () => {
  it("arrastar confirma UM comando ao soltar (sem versão); teclado move; mudar de fase aparece no quadro e na linha do tempo; voltar à versão traz tudo junto", () => {
    const h = mount();
    const cardOf = () => left().querySelector<SVGGElement>('[data-ref="TASK:tC"]')!;
    const start = cardOf().getAttribute("transform");

    // arraste: vários movimentos, um único CANVAS_MOVE no soltar, e a versão continua a 4
    fireEvent.pointerDown(cardOf(), { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    for (const [x, y] of [[106, 104], [118, 112], [124, 116]] as const) fireEvent.pointerMove(cardOf(), { pointerId: 1, clientX: x, clientY: y });
    expect(h.sent.filter((c) => c.type === "CANVAS_MOVE")).toHaveLength(0); // nada vai ao modelo durante o arraste
    fireEvent.pointerUp(cardOf(), { pointerId: 1, clientX: 130, clientY: 120 });
    const moves = h.sent.filter((c) => c.type === "CANVAS_MOVE");
    expect(moves).toHaveLength(1);
    expect(h.model().version).toBe(4);
    const dropped = h.model().canvas.positions["TASK:tC"]!;
    expect(cardOf().getAttribute("transform")).toBe(`translate(${dropped.x},${dropped.y})`);
    expect(cardOf().getAttribute("transform")).not.toBe(start);
    expect(screen.getByText("Posição salva no projeto, sem versão nova (fica na v4).")).toBeTruthy();

    // teclado como alternativa ao arraste
    cardOf().focus();
    fireEvent.keyDown(cardOf(), { key: "ArrowDown" });
    expect(h.model().canvas.positions["TASK:tC"]).toEqual({ x: dropped.x, y: dropped.y + 10 });
    expect(h.model().versions.at(-1)).toMatchObject({ number: 4, layoutMoves: 2 });
    expect(h.model().version).toBe(4);
    const arranged = h.model().canvas.positions["TASK:tC"];

    // mudança estrutural pelo canvas (inspetor = alternativa ao arraste entre faixas): o quadro ao lado reflete na hora
    expect(column("ANALISE").querySelector('[data-task="tC"]')).toBeTruthy();
    fireEvent.keyDown(cardOf(), { key: "Enter" }); // seleciona pelo teclado (abre o inspetor)
    const inspector = left().querySelector<HTMLElement>('[data-inspector="TASK:tC"]')!;
    fireEvent.change(within(inspector).getByLabelText("Mover para a fase…"), { target: { value: "EXECUCAO" } });
    fireEvent.click(within(inspector).getByRole("button", { name: "Mover" }));
    expect(h.model().version).toBe(5);
    expect(column("EXECUCAO").querySelector('[data-task="tC"]')).toBeTruthy();
    expect(column("ANALISE").querySelector('[data-task="tC"]')).toBeNull();
    // a mesma alteração na linha do tempo (Gantt com barras e caminho crítico)
    fireEvent.change(screen.getByLabelText("O que mostrar ao lado"), { target: { value: "cronograma" } });
    expect(right().querySelector('[data-row="T04"]')).toBeTruthy();
    expect(right().querySelectorAll("[data-row]").length).toBe(h.model().tasks.length);

    // histórico: v4 mostra os ajustes de posição; v1–v3 são anteriores a esta aba (sem retrato)
    fireEvent.click(screen.getByRole("button", { name: "Histórico · v5" }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("atual")).toBeTruthy();
    expect(sheet.querySelector('[data-version="4"] [data-layout-moves]')!.textContent).toBe("2 ajuste(s) de posição no canvas nesta versão");
    expect(within(sheet.querySelector<HTMLElement>('[data-version="2"]')!).getByText("Sem retrato nesta aba (versão anterior à sessão).")).toBeTruthy();
    fireEvent.click(within(sheet).getByRole("button", { name: "Voltar à versão 4" }));
    expect(within(sheet).getByRole("group", { name: "Confirmar a volta à versão 4" }).textContent).toMatch(/A volta vira a v6; nada se perde/);
    fireEvent.click(within(sheet).getByRole("button", { name: "Voltar à v4" }));

    // voltou: nova versão 6, a atividade na Análise outra vez e o canvas como estava (posições sincronizadas com a versão)
    const p = h.model();
    expect(p.version).toBe(6);
    expect(p.versions.at(-1)).toMatchObject({ number: 6, key: "versionRestored", vars: { n: 4 } });
    expect(p.tasks.find((t) => t.id === "tC")!.phase).toBe("ANALISE");
    expect(p.canvas.positions["TASK:tC"]).toEqual(arranged);
    expect(screen.getByText("Projeto de volta à v4 (agora v6).")).toBeTruthy();
    expect(screen.getByText(/Última alteração: Voltou à versão 4/)).toBeTruthy();
  });

  it("somente leitura: o histórico aparece, mas sem voltar versões", () => {
    const repo = createMemoryProjectRepository([buildDemoProject()]);
    function Harness() {
      const model = useProject(DEMO_PROJECT_ID, repo)!;
      return <ProjectWorkspace model={model} dispatch={(c) => repo.dispatch(DEMO_PROJECT_ID, c, { actorId: "u", now: NOW })} people={DEMO_PEOPLE} readOnly versionSnapshot={(n) => repo.versionSnapshot!(DEMO_PROJECT_ID, n)} />;
    }
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Histórico · v4" }));
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: /Voltar à versão/ })).toBeNull();
  });
});

describe("linha do tempo com os prazos do Autopiloto", () => {
  it("cada atividade mostra o prazo (▼) calculado de trás para frente; atividade que passa do prazo é anunciada", () => {
    const now = new Date("2026-11-12T12:00:00");
    const base = proposeScheme(extractDemand(EXAMPLE_OFICIO, { now }), { now, sourceLabel: "Ofício nº 123/2026", sourceKind: "COLAR" });
    const etp = base.tasks.find((t) => /estudo técnico/.test(t.title))!;
    const r = editProposal(base, { op: "TASK_DUE", key: etp.key, date: "2026-11-25" });
    if (!r.ok) throw new Error(r.error);
    const model = proposalToProject(r.proposal, { id: "ap-gantt", actorId: "u-pessoa", now });
    renderPanel(Timeline, { model });
    expect(document.querySelectorAll("[data-due]").length).toBe(model.tasks.length);
    expect(screen.getByText("Prazo da atividade")).toBeTruthy();
    const code = model.tasks.find((t) => /estudo técnico/.test(t.title))!.code;
    const row = document.querySelector(`[data-row="${code}"]`)!;
    expect(row.getAttribute("aria-label")).toMatch(/prazo 25 de nov\./);
    expect(row.getAttribute("aria-label")).toMatch(/passa 5 d do prazo/);
    expect(document.querySelector(`[data-due="${code}"]`)!.getAttribute("class")).toMatch(/fill-ws-danger/);
  });
});
