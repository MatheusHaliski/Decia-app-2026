// @vitest-environment jsdom
/**
 * Tela do Simulador de Cenários (RF31): linha de base, até três cenários lado a lado (?compare=), alavanca editada recalcula na
 * hora, leitura ✦ só a pedido (autonomia "sob solicitação"), salvar e enviar à aprovação pelo caminho existente sem mexer no plano.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useCallback, useReducer } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { createMemoryRepository } from "@/lib/decia/repository";
import { applyCommand, type ProjectCommand } from "@/lib/projects/commands";
import { openChangeDecision } from "@/lib/projects/decia";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { createMemoryProjectRepository, setDemoProjectRepository } from "@/lib/projects/repository";
import { createMemoryScenarioRepository, demoScenarios, setDemoScenarioRepository, type ScenarioRepository } from "@/lib/projects/simulation/store";
import type { ProjectModel } from "@/lib/projects/types";
import { renderWithProviders } from "@/test-utils/render";
import { SimulateClient } from "@/app/(shell)/projects/[id]/simulate/SimulateClient";
import { SimulatorView } from "./SimulatorView";

const nav = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/projects/decia-v1/simulate",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({ id: "decia-v1" }),
}));

const NOW = new Date("2026-11-12T12:00:00Z");

function mount(opts: { compare?: string[]; repo?: ScenarioRepository } = {}) {
  const state = { model: buildDemoProject() as ProjectModel };
  const commands: ProjectCommand[] = [];
  const compareChanges: string[][] = [];
  const decisions = createMemoryRepository([]);
  const scenarios = opts.repo ?? createMemoryScenarioRepository(demoScenarios());
  function Harness() {
    const [, rerender] = useReducer((x: number) => x + 1, 0);
    const dispatch = useCallback((cmd: ProjectCommand) => {
      commands.push(cmd);
      const r = applyCommand(state.model, cmd, { actorId: "u-pessoa", now: NOW });
      if (r.ok && r.model !== state.model) {
        state.model = r.model;
        rerender();
      }
      return r;
    }, []);
    return (
      <SimulatorView
        model={state.model}
        dispatch={dispatch}
        people={DEMO_PEOPLE}
        actorId="u-pessoa"
        readOnly={false}
        scenarios={scenarios}
        initialCompare={opts.compare}
        onCompareChange={(ids) => compareChanges.push(ids)}
        openChange={(m, c) => openChangeDecision(decisions, m, c, "u-pessoa", NOW)}
        decisionHref={(id) => `/decia/decisoes/${id}`}
      />
    );
  }
  return { ...renderWithProviders(<Harness />), state, commands, compareChanges, decisions, scenarios };
}

const panel = () => screen.getByRole("tabpanel");

describe("Simulador de Cenários", () => {
  afterEach(() => {
    nav.search = "";
    setDemoProjectRepository(null);
    setDemoScenarioRepository(null);
  });

  it("abre com a linha de base e os cenários salvos lado a lado, com tabela e gráficos acessíveis", () => {
    mount();
    const base = document.querySelector<HTMLElement>("[data-baseline]")!;
    expect(base.textContent).toContain("dia 14");
    expect(base.textContent).toContain("T01 → T03 → T05 → T06 → T07");
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["A · Corte de 10% no escopo de menor prioridade", "B · Fornecedor de nuvem atrasa 10 dias", "C · Módulo de relatórios (MUD-01) e nuvem 15% mais cara"]);
    const table = document.querySelector<HTMLElement>("[data-compare-table]")!;
    expect(within(table).getByText("Comparação dos cenários com a linha de base")).toBeTruthy();
    const finish = table.querySelector<HTMLElement>('[data-row="finish"]')!;
    expect(finish.textContent).toMatch(/dia 14.*dia 14.*dia 24.*dia 19/);
    expect(table.querySelector('[data-row="shortfall"]')!.textContent).toMatch(/1\.084/);
    const time = screen.getByRole("img", { name: /Término por cenário/ });
    expect(time.getAttribute("aria-label")).toContain("B 24 d");
    expect(screen.getByRole("img", { name: /Custo projetado \(ENT\) por cenário/ })).toBeTruthy();
  });

  it("relatório do cenário: novo término, caminho crítico que mudou, riscos e o porquê de cada número", () => {
    mount({ compare: ["sc-nuvem-atrasa"] });
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    const p = panel();
    expect(p.querySelector('[data-tile="finish"]')!.textContent).toMatch(/dia 24/);
    expect(p.querySelector('[data-tile="finish"]')!.textContent).toMatch(/pior/);
    expect(p.querySelector("[data-critical]")!.textContent).toMatch(/T06.*espera/);
    expect(within(p).getByText(/Saíram do caminho crítico \(ganharam folga\): T01, T03, T05/)).toBeTruthy();
    expect(within(p).getByText(/T06 só começa no dia 17 \(planejado: dia 7\)/)).toBeTruthy();
    expect(p.querySelector('[data-risk="RISCO_REGISTRADO"]')!.textContent).toMatch(/Atraso na contratação de nuvem/);
    expect(p.querySelector('[data-why="probability"]')!.textContent).toMatch(/0 de 2\.000 sorteios do Monte Carlo \(semente 31\)/);
  });

  it("?compare= com id desconhecido avisa e abre só os que existem", () => {
    mount({ compare: ["sc-relatorios", "nao-existe"] });
    expect(screen.getByRole("status").textContent).toMatch(/nao-existe/);
    expect(screen.getAllByRole("tab")).toHaveLength(1);
  });

  it("montar um cenário novo: alavanca inválida mostra o motivo; válida recalcula; salvar põe na URL", async () => {
    const h = mount({ repo: createMemoryScenarioRepository([]) });
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Nome do cenário"), { target: { value: "Corte na reserva" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Corte de orçamento" }));
    const lever = panel().querySelector<HTMLElement>('[data-lever="CORTE_ORCAMENTO"]')!;
    const pct = within(lever).getByLabelText("Percentual do corte");
    fireEvent.change(pct, { target: { value: "150" } });
    expect(within(lever).getByRole("alert").textContent).toMatch(/Valor inválido/);
    fireEvent.change(pct, { target: { value: "10" } });
    expect(within(lever).queryByRole("alert")).toBeNull();
    await waitFor(() => expect(panel().textContent).toMatch(/Corte de R\$\s?7\.000: R\$\s?5\.000 da reserva gerencial e R\$\s?2\.000 da contingência/));
    fireEvent.click(within(panel()).getByRole("button", { name: "Salvar cenário" }));
    const saved = h.scenarios.list("decia-v1");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: "Corte na reserva", projectVersion: 4, levers: [{ kind: "CORTE_ORCAMENTO", value: 10, source: "RESERVA" }] });
    expect(h.compareChanges.at(-1)).toEqual([saved[0]!.id]);
    expect(document.querySelector(`[data-saved="${saved[0]!.id}"]`)).toBeTruthy();
  });

  it("leitura ✦ só a pedido (autonomia padrão: sob solicitação) e só com números do motor", () => {
    mount({ compare: ["sc-nuvem-atrasa"] });
    const reading = document.querySelector<HTMLElement>('[data-ai-reading="scenario"]')!;
    expect(reading.getAttribute("data-mode")).toBe("SOB_SOLICITACAO");
    expect(within(reading).queryByText(/Fornecedor de nuvem atrasa 10 dias: término/)).toBeNull();
    fireEvent.click(within(reading).getByRole("button", { name: "Pedir a leitura da IA" }));
    expect(within(reading).getByText(/Fornecedor de nuvem atrasa 10 dias: término em 26 de nov\..* e custo projetado de R\$\s?55\.935/)).toBeTruthy();
    expect(within(reading).getByText(/Desvantagem: termina 10 d depois\./)).toBeTruthy();
  });

  it("enviar à aprovação abre a mudança e a leva ao comitê no DECIA, sem mexer em atividades nem orçamento", async () => {
    const h = mount({ compare: ["sc-relatorios"] });
    const tasksBefore = JSON.stringify(h.state.model.tasks);
    fireEvent.click(within(panel()).getByRole("button", { name: "Enviar à aprovação" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByDisplayValue("Cenário do Simulador: Módulo de relatórios (MUD-01) e nuvem 15% mais cara")).toBeTruthy();
    expect(dialog.querySelector('[data-impact-key="scheduleDays"]')!.textContent).toMatch(/\+5 d/);
    expect(within(dialog).getByText(/Nada muda no cronograma nem no orçamento agora/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Abrir a mudança e levar ao comitê" }));
    await waitFor(() => expect(h.commands.map((c) => c.type)).toEqual(["CHANGE_REQUEST", "CHANGE_SET_STATUS", "LINK_DECISION"]));
    const change = h.state.model.changes.find((c) => c.code === "MUD-02")!;
    expect(change).toMatchObject({ status: "EM_ANALISE", type: "NORMAL", impact: { scheduleDays: 5, cost: 10_150, scope: 3 } });
    expect(change.sevenRs.reason).toMatch(/Incluir entrega, Reajuste de preço/);
    expect(h.decisions.get(change.decisionId!)?.decision.projectId).toBe("decia-v1");
    expect(JSON.stringify(h.state.model.tasks)).toBe(tasksBefore);
    const sent = document.querySelector<HTMLElement>('[data-submitted="MUD-02"]')!;
    expect(within(sent).getByRole("link", { name: "Abrir no DECIA" }).getAttribute("href")).toBe(`/decia/decisoes/${change.decisionId}`);
    expect(h.scenarios.get("sc-relatorios")?.submission).toMatchObject({ changeCode: "MUD-02", decisionId: change.decisionId });
  });
});

describe("página /projects/[id]/simulate", () => {
  afterEach(() => {
    nav.search = "";
    setDemoProjectRepository(null);
    setDemoScenarioRepository(null);
  });

  it("lê ?compare= da URL e mostra o projeto DEMO com o selo", async () => {
    setDemoProjectRepository(createMemoryProjectRepository([buildDemoProject()]));
    setDemoScenarioRepository(createMemoryScenarioRepository(demoScenarios()));
    nav.search = "compare=sc-nuvem-atrasa,sc-relatorios";
    renderWithProviders(<SimulateClient projectId="decia-v1" />);
    expect(await screen.findByRole("heading", { level: 1, name: /Simulador de Cenários/ })).toBeTruthy();
    expect(screen.getByText("DEMO")).toBeTruthy();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["A · Fornecedor de nuvem atrasa 10 dias", "B · Módulo de relatórios (MUD-01) e nuvem 15% mais cara"]);
  });

  it("projeto que não está na aba: estado vazio com o atalho para o projeto de exemplo", async () => {
    setDemoProjectRepository(createMemoryProjectRepository([buildDemoProject()]));
    renderWithProviders(<SimulateClient projectId="exemplo" />);
    const link = await screen.findByRole("link", { name: "Abrir o projeto de exemplo" });
    expect(link.getAttribute("href")).toBe("/projects/decia-v1/simulate");
  });

  it("visitante recebe 403", async () => {
    setDemoProjectRepository(createMemoryProjectRepository([buildDemoProject()]));
    renderWithProviders(<SimulateClient projectId="decia-v1" />, { profile: "VISITANTE" });
    expect(await screen.findByText("403 ACESSO_NEGADO")).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
  });
});
