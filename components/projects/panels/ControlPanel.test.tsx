// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeMetrics } from "@/lib/projects/metrics";
import { buildDemoProject } from "@/lib/projects/fixtures";
import type { ProjectModel } from "@/lib/projects/types";
import type { PanelProps } from "@/components/projects/shared";
import { PANEL_NOW, renderPanel } from "@/test-utils/projects";
import { ControlPanel } from "./ControlPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/decia-v1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

const value = (id: string) => document.querySelector(`[data-evm="${id}"] [data-value]`)?.textContent;
const metricStatus = (model: ProjectModel, id: string) => [...computeMetrics(model).quality, ...computeMetrics(model).governance].find((m) => m.id === id)?.status;
const changeCard = (code: string) => {
  const el = document.querySelector(`[data-change="${code}"]`);
  if (!(el instanceof HTMLElement)) throw new Error(`mudança ${code} não renderizada`);
  return within(el);
};
const commit = (el: HTMLElement, v: string) => {
  fireEvent.change(el, { target: { value: v } });
  fireEvent.blur(el);
};

describe("ControlPanel — monitoramento e controle (RF22)", () => {
  it("renderiza o DEMO: valor agregado com fórmula e siglas pt/en, indicadores da aba, T08 como scope creep e o histórico", () => {
    const { container } = renderPanel(ControlPanel);
    // EVM do DEMO: VP 29.000 · VA 16.000 · CR 17.900 · ONT 50.000 ⇒ IDC 0,89 e IDP 0,55
    expect(value("pv")).toMatch(/R\$\s29\.000/);
    expect(value("ev")).toMatch(/R\$\s16\.000/);
    expect(value("cpi")).toBe("0,89");
    expect(value("spi")).toBe("0,55");
    expect(screen.getByText("IDP (SPI)")).toBeTruthy();
    expect(screen.getByText("ENT (EAC)")).toBeTruthy();
    expect(container.querySelector('[data-evm="spi"]')!.textContent).toContain("VA ÷ VP = R$");
    expect(screen.getByText("Custo: acima do orçamento")).toBeTruthy();
    expect(screen.getByText("Prazo: atrasado")).toBeTruthy();
    expect(screen.getByText(/Cada R\$\s1,00 gasto agregou R\$\s0,89 de trabalho/)).toBeTruthy();

    // indicadores de computeMetrics com tab "controle", nos mesmos textos do feedback
    const creepMetric = container.querySelector('[data-metric="Q_SCOPE_CREEP"]')!;
    expect(creepMetric.getAttribute("data-status")).toBe("CRITICO");
    expect(creepMetric.textContent).toContain("T08");
    expect(container.querySelector('[data-metric="Q_IDP"]')!.textContent).toContain("IDP 0,55");
    expect(container.querySelector('[data-metric="Q_LICOES"]')).toBeNull();

    // scope creep plantado: T08 criada depois da linha de base sem mudança
    const creep = container.querySelector('[data-creep="T08"]')!;
    expect(creep.textContent).toContain("Ajuste visual pedido por mensagem");
    expect(within(creep as HTMLElement).getByRole("button", { name: "Regularizar: abrir solicitação de mudança" })).toBeTruthy();
    expect(container.querySelector('tr[data-task="T08"]')!.textContent).toContain("fora da linha de base");

    // MUD-01 (normal, solicitada): análise incompleta e o caminho do comitê
    const mud = changeCard("MUD-01");
    expect(mud.getByText("Análise incompleta: faltam 4 dos 7 Rs.")).toBeTruthy();
    expect(mud.getByRole("button", { name: "Iniciar análise de impacto" })).toBeTruthy();
    expect(mud.queryByRole("button", { name: /^Aprovar/ })).toBeNull(); // normal não pula a análise
    expect(mud.getByRole("button", { name: "Levar ao comitê (CCB/CAB) no DECIA" })).toBeTruthy();

    // lições e histórico de versões (mais nova primeiro)
    expect(screen.getByRole("progressbar", { name: "Lições em 1 de 3 fases já vividas" })).toBeTruthy();
    expect(screen.getByText("Fases já vividas sem lição: Planejamento, Elaboração.")).toBeTruthy();
    const history = screen.getByRole("list", { name: "Histórico de versões" });
    const items = within(history).getAllByRole("listitem");
    expect(items[0]!.textContent).toContain("Atividade T03 alterada");
    expect(items[0]!.textContent).toContain("Carla Exemplo");
    expect(within(history).getByText("Linha de base aprovada (14 dias)")).toBeTruthy();
  });

  it("atualizar o % concluído e o custo real recalcula o valor agregado do topo na hora", () => {
    const h = renderPanel(ControlPanel);
    commit(screen.getByLabelText("% concluído de T03"), "100");
    expect(h.state.model.tasks.find((t) => t.code === "T03")!.percentComplete).toBe(100);
    expect(h.commands.at(-1)).toEqual({ type: "TASK_UPDATE", id: "tB", patch: { percentComplete: 100 } });
    // VA 22.000 / VP 29.000 ⇒ IDP 0,76; VA 22.000 / CR 17.900 ⇒ IDC 1,23 (abaixo do orçamento)
    expect(value("spi")).toBe("0,76");
    expect(value("cpi")).toBe("1,23");
    expect(screen.getByText("Custo: abaixo do orçamento")).toBeTruthy();

    commit(screen.getByLabelText("Custo real de T03"), "11000");
    expect(h.state.model.tasks.find((t) => t.code === "T03")!.actualCost).toBe(11_000);
    expect(value("ac")).toMatch(/R\$\s21\.900/);

    fireEvent.change(screen.getByLabelText("Status de T04"), { target: { value: "CONCLUIDA" } });
    expect(h.state.model.tasks.find((t) => t.code === "T04")).toMatchObject({ status: "CONCLUIDA", percentComplete: 100 });

    // data de status: o VP passa a ser medido no dia 10
    fireEvent.change(screen.getByLabelText("Data de status"), { target: { value: "2026-11-12" } });
    expect(h.state.model.statusDate).toBe("2026-11-12");
    expect(value("pv")).toMatch(/R\$\s37\.000/);
  });

  it("mudança padrão: solicitar → analisar → aprovar → implementar cria a atividade ligada e atualiza a linha de base", () => {
    const h = renderPanel(ControlPanel);
    fireEvent.change(screen.getByLabelText("O que muda?"), { target: { value: "Atualizar biblioteca de gráficos" } });
    const form = screen.getByRole("button", { name: "Solicitar mudança" }).closest("form")!;
    fireEvent.change(within(form).getByLabelText("Tipo"), { target: { value: "PADRAO" } });
    fireEvent.click(within(form).getByRole("button", { name: "Solicitar mudança" }));
    const created = h.state.model.changes.at(-1)!;
    expect(created).toMatchObject({ code: "MUD-02", title: "Atualizar biblioteca de gráficos", type: "PADRAO", status: "SOLICITADA" });
    expect((screen.getByLabelText("O que muda?") as HTMLInputElement).value).toBe("");

    // padrão é pré-aprovada: pode ir direto; aqui segue o fluxo completo com análise
    expect(changeCard("MUD-02").getByRole("button", { name: "Aprovar (padrão, pré-aprovada)" })).toBeTruthy();
    fireEvent.click(changeCard("MUD-02").getByRole("button", { name: "Iniciar análise de impacto" }));
    expect(h.state.model.changes.at(-1)!.status).toBe("EM_ANALISE");
    commit(changeCard("MUD-02").getByLabelText("Prazo (dias)"), "2");
    commit(changeCard("MUD-02").getByLabelText("Razão"), "Biblioteca sem suporte de segurança");
    expect(h.state.model.changes.at(-1)!.impact.scheduleDays).toBe(2);
    expect(h.state.model.changes.at(-1)!.sevenRs.reason).toBe("Biblioteca sem suporte de segurança");

    fireEvent.click(changeCard("MUD-02").getByRole("button", { name: "Aprovar" }));
    expect(h.state.model.changes.at(-1)!.status).toBe("APROVADA");
    const before = h.state.model.baseline!.setAt;
    fireEvent.click(changeCard("MUD-02").getByRole("button", { name: "Implementar" }));
    const m = h.state.model;
    const task = m.tasks.find((t) => t.changeId === created.id)!;
    expect(task).toMatchObject({ code: "T09", title: "Atualizar biblioteca de gráficos", phase: "ELABORACAO", durationDays: 2 });
    expect(m.changes.at(-1)!.status).toBe("IMPLEMENTADA");
    expect(m.baseline!.setAt).not.toBe(before);
    expect(m.baseline!.setAt).toBe(PANEL_NOW.toISOString());
    expect(changeCard("MUD-02").getByText("Atividades criadas por esta mudança: T09")).toBeTruthy();
    expect(changeCard("MUD-02").getByText("Estado final: nada mais a fazer nesta solicitação.")).toBeTruthy();
  });

  it("scope creep: regularizar T08 abre mudança normal; aprovada e implementada, a nova linha de base a incorpora", () => {
    const h = renderPanel(ControlPanel);
    fireEvent.click(screen.getByRole("button", { name: "Regularizar: abrir solicitação de mudança" }));
    const reg = h.state.model.changes.at(-1)!;
    expect(reg).toMatchObject({ code: "MUD-02", type: "NORMAL", status: "SOLICITADA" });
    expect(reg.title).toContain("T08");
    expect(reg.sevenRs.relationship).toContain("T08");
    expect(document.querySelector('[data-creep="T08"]')!.textContent).toContain("Regularização em andamento: MUD-02 (Solicitada)");

    // o comitê pelo DECIA: a área de trabalho abre a decisão
    fireEvent.click(changeCard("MUD-02").getByRole("button", { name: "Levar ao comitê (CCB/CAB) no DECIA" }));
    expect(h.deciaCalls).toContainEqual({ kind: "change", arg: reg.id });

    fireEvent.click(changeCard("MUD-02").getByRole("button", { name: "Iniciar análise de impacto" }));
    expect(changeCard("MUD-02").getByText(/Mudança normal é decisão do comitê/)).toBeTruthy();
    fireEvent.click(changeCard("MUD-02").getByRole("button", { name: "Aprovar" }));
    expect(changeCard("MUD-02").getByText("Decidida sem registro no DECIA: o porquê da decisão não ficou rastreável.")).toBeTruthy();
    const tasksBefore = h.state.model.tasks.length;
    fireEvent.click(changeCard("MUD-02").getByRole("button", { name: "Implementar: incorporar T08 à linha de base" }));

    const m = h.state.model;
    expect(m.tasks.length).toBe(tasksBefore); // o trabalho já existia: nada duplicado
    expect(m.changes.at(-1)!.status).toBe("IMPLEMENTADA");
    expect(h.commands.at(-1)).toEqual({ type: "BASELINE_SET" });
    expect(m.tasks.find((t) => t.code === "T08")!.addedAfterBaseline).toBeUndefined();
    expect(metricStatus(m, "Q_SCOPE_CREEP")).toBe("OK");
    expect(document.querySelector('[data-creep="T08"]')).toBeNull();
    expect(screen.getByText("Nenhuma atividade fora da linha de base sem mudança aprovada.")).toBeTruthy();
  });

  it("mudança normal já levada ao DECIA: link e estado da decisão; aguarda o comitê em vez de aprovar aqui", () => {
    const base = buildDemoProject();
    const model: ProjectModel = { ...base, changes: base.changes.map((c) => ({ ...c, status: "EM_ANALISE", decisionId: "dec-9" })) };
    const WithStatus = (p: PanelProps) => <ControlPanel {...p} decia={{ ...p.decia!, decisionStatus: () => "AGUARDANDO_DECISAO" }} />;
    const h = renderPanel(WithStatus, { model });
    const mud = changeCard("MUD-01");
    expect(mud.getByRole("link", { name: "Abrir no DECIA" }).getAttribute("href")).toBe("/decia/decisoes/dec-9");
    expect(mud.getByText("Aguardando decisão")).toBeTruthy();
    expect(mud.getByText(/Aguardando a decisão do comitê no DECIA/)).toBeTruthy();
    for (const name of ["Aprovar", "Rejeitar", "Levar ao comitê (CCB/CAB) no DECIA"]) expect(mud.queryByRole("button", { name })).toBeNull();
    // a análise de impacto continua editável enquanto o comitê não decide
    commit(mud.getByLabelText("Retorno esperado"), "Relatórios gerenciais sem planilha paralela");
    fireEvent.change(mud.getByLabelText("Qualidade"), { target: { value: "2" } });
    expect(h.state.model.changes[0]!.sevenRs.returnExpected).toBe("Relatórios gerenciais sem planilha paralela");
    expect(h.commands.map((c) => c.type)).toEqual(["CHANGE_UPDATE", "CHANGE_UPDATE"]);
    expect(h.state.model.changes[0]!.impact).toMatchObject({ quality: 2, cost: 8_000 });
  });

  it("nova linha de base pede confirmação e avisa que legalizaria o scope creep", () => {
    const h = renderPanel(ControlPanel);
    fireEvent.click(screen.getByRole("button", { name: "Aprovar nova linha de base" }));
    const dialog = screen.getByRole("dialog", { name: "Aprovar a linha de base?" });
    expect(within(dialog).getByRole("alert").textContent).toContain("T08");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(h.commands).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Aprovar nova linha de base" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Aprovar" }));
    expect(h.commands).toEqual([{ type: "BASELINE_SET" }]);
    expect(h.state.model.baseline!.setAt).toBe(PANEL_NOW.toISOString());
  });

  it("lições ao longo do projeto: registrar numa fase já vivida aumenta a cobertura", () => {
    const h = renderPanel(ControlPanel);
    const form = within(screen.getByRole("button", { name: "Registrar lição" }).closest("form")!);
    fireEvent.change(form.getByLabelText("Lição aprendida"), { target: { value: "Estimar com três pontos evitou prometer prazo otimista" } });
    fireEvent.change(form.getByLabelText("Tipo"), { target: { value: "NEGATIVA" } });
    fireEvent.change(form.getByLabelText("Fase"), { target: { value: "PLANEJAMENTO" } });
    // só fases já vividas (até a atual, Elaboração) aparecem
    expect(within(form.getByLabelText("Fase")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Demanda", "Planejamento", "Elaboração"]);
    fireEvent.click(form.getByRole("button", { name: "Registrar lição" }));
    const lesson = h.state.model.lessons.at(-1)!;
    expect(h.state.model.lessons).toHaveLength(2);
    expect(lesson).toMatchObject({ phase: "PLANEJAMENTO", kind: "NEGATIVA", text: "Estimar com três pontos evitou prometer prazo otimista", authorId: "u-pessoa" });
    expect(document.querySelector('[data-lesson-phase="PLANEJAMENTO"]')!.textContent).toContain("Não funcionou");
    expect(screen.getByRole("progressbar", { name: "Lições em 2 de 3 fases já vividas" })).toBeTruthy();
    expect((screen.getByLabelText("Lição aprendida") as HTMLTextAreaElement).value).toBe("");
  });

  it("recusa sem quebrar: título vazio e lição vazia mostram o erro do núcleo e não mudam o modelo", () => {
    const h = renderPanel(ControlPanel);
    fireEvent.change(screen.getByLabelText("O que muda?"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar mudança" }));
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "TEXTO_VAZIO" });
    expect(h.state.model.changes).toHaveLength(1);
    expect(screen.getAllByRole("alert").some((a) => a.textContent === "Escreva um texto antes de salvar.")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Registrar lição" }));
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "TEXTO_VAZIO" });
    expect(h.state.model.lessons).toHaveLength(1);
    // o painel continua funcionando depois da recusa
    commit(screen.getByLabelText("% concluído de T03"), "60");
    expect(h.state.model.tasks.find((t) => t.code === "T03")!.percentComplete).toBe(60);
  });

  it("readOnly (ou projeto arquivado): nenhum controle de edição e nada despachado", () => {
    const h = renderPanel(ControlPanel, { readOnly: true });
    expect(screen.getByText("Somente leitura: projeto arquivado ou perfil sem permissão de edição.")).toBeTruthy();
    expect(document.querySelectorAll("input:not([disabled]), select:not([disabled]), textarea:not([disabled])")).toHaveLength(0);
    for (const name of ["Solicitar mudança", "Registrar lição", "Aprovar nova linha de base", "Regularizar: abrir solicitação de mudança", "Iniciar análise de impacto", "Levar ao comitê (CCB/CAB) no DECIA"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    // ver a análise continua possível (não edita)
    fireEvent.click(changeCard("MUD-01").getByRole("button", { name: "Ocultar a análise de impacto" }));
    expect(h.commands).toEqual([]);
    h.unmount();

    const archived = { ...buildDemoProject(), closure: { ...buildDemoProject().closure, archived: true } };
    const a = renderPanel(ControlPanel, { model: archived });
    expect(screen.getByText("Projeto arquivado: somente leitura. Para editar, reabra na aba Encerramento.")).toBeTruthy();
    expect(document.querySelectorAll("input:not([disabled]), select:not([disabled]), textarea:not([disabled])")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Abrir em Encerramento" }));
    expect(a.visited).toEqual(["encerramento"]);
    expect(a.commands).toEqual([]);
  });

  it("histórico de versões: mostra as 15 mais recentes e 'ver todas'", () => {
    const base = buildDemoProject();
    const versions = Array.from({ length: 20 }, (_, i) => ({ number: i + 1, at: `2026-11-0${1 + (i % 9)}T10:00:00Z`, actorId: i % 2 ? "u-ana" : "u-pessoa", key: "taskUpdated", vars: { code: `T${String(i + 1).padStart(2, "0")}` } }));
    renderPanel(ControlPanel, { model: { ...base, versions, version: 20 } });
    const list = () => screen.getByRole("list", { name: "Histórico de versões" });
    expect(within(list()).getAllByRole("listitem")).toHaveLength(15);
    expect(within(list()).getAllByRole("listitem")[0]!.textContent).toContain("Atividade T20 alterada");
    fireEvent.click(screen.getByRole("button", { name: "Ver todas (20)" }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: "Ver só as 15 mais recentes" }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(15);
  });
});
