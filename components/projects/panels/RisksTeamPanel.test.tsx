// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { evaluateGate } from "@/lib/projects/metrics";
import { raciMatrix } from "@/lib/projects/views";
import { renderPanel } from "@/test-utils/projects";
import { RisksTeamPanel } from "./RisksTeamPanel";

/** Elemento obrigatório por seletor (os painéis marcam linhas/células com data-*). */
function el(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`não encontrado: ${selector}`);
  return found;
}
const commit = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};
const problemsOf = (h: ReturnType<typeof renderPanel>, taskId: string) => raciMatrix(h.state.model).find((r) => r.taskId === taskId)!.problems;

describe("RisksTeamPanel — riscos, reservas, partes interessadas, RACI e carga do projeto DEMO", () => {
  it("mostra o registro com VME, a matriz P × I, exposição × reserva e os erros plantados (RACI, reserva < VME, revisor = responsável)", () => {
    renderPanel(RisksTeamPanel);
    expect(el(document, '[data-metric="Q_RACI"]').dataset.status).toBe("CRITICO");
    expect(el(document, '[data-metric="Q_RESERVA"]').dataset.status).toBe("ATENCAO");
    expect(el(document, '[data-metric="Q_RESERVA"]').textContent).toMatch(/15\.000.*21\.000/);
    expect(el(document, '[data-metric="Q_RISCOS_RESPOSTA"]').dataset.status).toBe("ATENCAO");
    expect(document.querySelector('[data-metric="W_CARGA"]')).not.toBeNull();

    // registro: VME = P × impacto (30 % × 50 mil = 15 mil), ordenado por severidade; k2 sem resposta
    expect(el(document, '[data-emv="k1"]').textContent).toMatch(/15\.000/);
    expect(el(document, '[data-emv="k2"]').textContent).toMatch(/10\.000/);
    expect(el(document, '[data-emv="k3"]').textContent).toMatch(/4\.000/);
    expect([...document.querySelectorAll<HTMLElement>("[data-risk]")].map((r) => r.dataset.risk)).toEqual(["k2", "k1", "k3"]);
    expect(el(document, '[data-risk="k2"]').textContent).toContain("sem resposta");
    expect(el(document, '[data-risk="k1"]').dataset.band).toBe("MEDIA");

    // matriz 5 × 5: contagem por célula e faixa em texto
    expect(el(document, '[data-cell="2-4"]').dataset.count).toBe("1");
    expect(el(document, '[data-cell="3-3"]').dataset.count).toBe("1");
    expect(el(document, '[data-cell="5-5"]').textContent).toContain("Crítica");
    expect(el(document, '[data-cell="1-1"]').textContent).toContain("Baixa");

    // exposição líquida 25 mil − 4 mil = 21 mil > contingência 15 mil
    expect(el(document, '[data-exposure="net"]').textContent).toMatch(/21\.000/);
    expect(el(document, "[data-verdict]").dataset.verdict).toBe("short");
    expect(el(document, "[data-verdict]").textContent).toMatch(/faltam .*6\.000/);

    // RACI: T04 sem A, T06 com dois A, T08 sem A e sem R
    expect(el(document, '[data-raci="tC"]').dataset.problems).toBe("SEM_A");
    expect(el(document, '[data-raci="tD"]').dataset.problems).toBe("MAIS_DE_UM_A");
    expect(el(document, '[data-raci="tX"]').dataset.problems).toBe("SEM_A SEM_R");
    expect(el(document, '[data-raci="tA"]').dataset.problems).toBeUndefined();
    expect(el(document, '[data-check="tD"]').textContent).toContain("mais de um A");

    // Mendelow, equipe, quatro olhos (T02 revisado pelo próprio responsável) e portões
    expect(el(document, '[data-quadrant="GERENCIAR_DE_PERTO"]').textContent).toContain("Diretoria de TI");
    expect(el(document, '[data-quadrant="MANTER_SATISFEITO"]').textContent).toMatch(/Secretário das Cidades.*Controle interno/);
    expect(el(document, "[data-team]").textContent).toContain("Pessoa Exemplo · Gerente do projeto");
    expect(el(document, '[data-assign="tP"]').dataset.fourEyes).toBe("same");
    expect(el(document, '[data-gate="PLANEJAMENTO"]').querySelectorAll('[data-ok="false"]').length).toBe(4);
    expect(el(document, '[data-gate="ANALISE"]').querySelectorAll('[data-ok="true"]').length).toBe(2);
  });

  it("corrige a RACI célula a célula (RACI_SET): exatamente um A em T06 e T04, e R + A em T08", () => {
    const h = renderPanel(RisksTeamPanel);
    fireEvent.change(screen.getByRole("combobox", { name: "RACI de Bruno Exemplo em T06" }), { target: { value: "C" } });
    expect(h.state.model.raci.find((e) => e.taskId === "tD" && e.userId === "u-bruno")!.letters).toEqual(["C"]);
    expect(problemsOf(h, "tD")).toEqual([]);
    expect(el(document, '[data-raci="tD"]').dataset.problems).toBeUndefined();

    fireEvent.change(screen.getByRole("combobox", { name: "RACI de Ana Exemplo em T04" }), { target: { value: "A" } });
    expect(problemsOf(h, "tC")).toEqual([]);

    const t08 = screen.getByRole("combobox", { name: "RACI de Pessoa Exemplo em T08" }) as HTMLSelectElement;
    fireEvent.change(t08, { target: { value: "RA" } });
    expect(h.state.model.raci.find((e) => e.taskId === "tX" && e.userId === "u-pessoa")!.letters).toEqual(["R", "A"]);
    expect(t08.value).toBe("RA");
    expect(raciMatrix(h.state.model).every((r) => r.problems.length === 0)).toBe(true);
    expect(screen.getByText("0 de 7 atividade(s) com problema na RACI")).toBeTruthy();
    expect(el(document, '[data-metric="Q_RACI"]').dataset.status).toBe("OK");
    expect(el(document, '[data-gate="PLANEJAMENTO"]').querySelectorAll('[data-ok="false"]').length).toBe(3);

    // "— (nenhum)" apaga a célula
    fireEvent.change(screen.getByRole("combobox", { name: "RACI de Ana Exemplo em T07" }), { target: { value: "" } });
    expect(h.state.model.raci.some((e) => e.taskId === "tE" && e.userId === "u-ana")).toBe(false);
  });

  it("aumenta a reserva de contingência até cobrir o VME (RESERVES_SET), mantendo a gerencial fora da linha de base", () => {
    const h = renderPanel(RisksTeamPanel);
    commit(screen.getByLabelText("Reserva de contingência (R$)"), "20000");
    expect(h.state.model.reserves).toEqual({ contingency: 20_000, management: 5_000 });
    expect(el(document, "[data-verdict]").dataset.verdict).toBe("short");
    expect(el(document, "[data-verdict]").textContent).toMatch(/faltam .*1\.000/);

    fireEvent.click(screen.getByRole("button", { name: /Ajustar a contingência para/ }));
    expect(h.state.model.reserves).toEqual({ contingency: 21_000, management: 5_000 });
    expect(el(document, "[data-verdict]").dataset.verdict).toBe("covers");
    expect(evaluateGate(h.state.model, "PLANEJAMENTO").find((c) => c.id === "RESERVA_COBRE_VME")!.ok).toBe(true);
    expect(el(document, '[data-metric="Q_RESERVA"]').dataset.status).toBe("OK");
    expect(screen.queryByRole("button", { name: /Ajustar a contingência/ })).toBeNull();

    commit(screen.getByLabelText("Reserva gerencial (R$)"), "8000");
    expect(h.state.model.reserves).toEqual({ contingency: 21_000, management: 8_000 });
    expect(screen.getByText(/orçamento total = linha de base \+ gerencial/).textContent).toMatch(/50\.000.*21\.000.*71\.000.*8\.000.*79\.000/);
  });

  it("registra e analisa um risco: P em %, impacto, resposta conforme o tipo, atividades afetadas; a célula da matriz filtra o registro", () => {
    const h = renderPanel(RisksTeamPanel);
    const form = screen.getByRole("button", { name: "Registrar risco" }).closest("form")!;
    fireEvent.change(within(form).getByLabelText("Novo risco"), { target: { value: "Vazamento de dados pessoais" } });
    fireEvent.click(within(form).getByRole("button", { name: "Registrar risco" }));
    const risk = h.state.model.risks.at(-1)!;
    expect(risk).toMatchObject({ title: "Vazamento de dados pessoais", kind: "AMEACA", status: "ABERTO" });

    const editor = el(document, `[data-editor="${risk.id}"]`);
    commit(within(editor).getByLabelText("Probabilidade"), "60");
    commit(within(editor).getByLabelText("Impacto financeiro (R$)"), "10000");
    fireEvent.change(within(editor).getByLabelText("Impacto qualitativo (1–5)"), { target: { value: "5" } });
    fireEvent.change(within(editor).getByLabelText("Resposta planejada"), { target: { value: "MITIGAR" } });
    fireEvent.click(within(editor).getByRole("checkbox", { name: "T06 Desenvolvimento do módulo de decisões" }));
    const saved = h.state.model.risks.find((r) => r.id === risk.id)!;
    expect(saved).toMatchObject({ probability: 0.6, impact: 10_000, impactLevel: 5, response: "MITIGAR", taskIds: ["tD"] });
    expect(el(document, `[data-risk="${risk.id}"]`).dataset.band).toBe("CRITICA"); // nível 4 × 5 = 20
    expect(el(document, `[data-emv="${risk.id}"]`).textContent).toMatch(/6\.000/);
    expect(el(document, '[data-cell="4-5"]').dataset.count).toBe("1");
    expect(within(editor).getByText(/VME = P × impacto = 60\s?% ×/)).toBeTruthy();

    // oportunidade não usa "mitigar": trocar o tipo limpa a resposta inválida
    fireEvent.change(within(editor).getByLabelText("Tipo"), { target: { value: "OPORTUNIDADE" } });
    expect(h.state.model.risks.find((r) => r.id === risk.id)).toMatchObject({ kind: "OPORTUNIDADE", response: undefined });
    expect([...(within(editor).getByLabelText("Resposta planejada") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["", "EXPLORAR", "COMPARTILHAR", "MELHORAR", "ACEITAR"]);

    // clicar na célula P3 × I3 filtra o registro; "mostrar todos" desfaz
    fireEvent.click(within(el(document, '[data-cell="3-3"]')).getByRole("button"));
    expect([...document.querySelectorAll<HTMLElement>("[data-risk]")].map((r) => r.dataset.risk)).toEqual(["k2"]);
    expect(within(el(document, '[data-cell="3-3"]')).getByRole("button").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar todos" }));
    expect(document.querySelectorAll("[data-risk]")).toHaveLength(4);
  });

  it("partes interessadas: inclui, muda poder/interesse e a estratégia de Mendelow acompanha; remove com confirmação", () => {
    const h = renderPanel(RisksTeamPanel);
    const form = screen.getByRole("button", { name: "Adicionar parte interessada" }).closest("form")!;
    fireEvent.change(within(form).getByLabelText("Nova parte interessada"), { target: { value: "Ouvidoria" } });
    fireEvent.change(within(form).getByLabelText("Papel"), { target: { value: "Canal do cidadão" } });
    fireEvent.click(within(form).getByRole("button", { name: "Adicionar parte interessada" }));
    expect(h.state.model.stakeholders.at(-1)).toMatchObject({ name: "Ouvidoria", role: "Canal do cidadão", power: 3, interest: 3 });
    expect(el(document, '[data-quadrant="GERENCIAR_DE_PERTO"]').textContent).toContain("Ouvidoria");

    expect(el(document, '[data-quadrant="MANTER_INFORMADO"]').textContent).toContain("Servidores usuários");
    fireEvent.change(screen.getByRole("combobox", { name: "Poder de Servidores usuários" }), { target: { value: "4" } });
    expect(h.state.model.stakeholders.find((s) => s.id === "s3")!.power).toBe(4);
    expect(el(document, '[data-stk="s3"] [data-strategy]').dataset.strategy).toBe("GERENCIAR_DE_PERTO");
    expect(el(document, '[data-quadrant="MANTER_INFORMADO"]').textContent).not.toContain("Servidores usuários");

    fireEvent.click(screen.getByRole("button", { name: "Remover Fornecedor de nuvem" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Remover Fornecedor de nuvem" })).getByRole("button", { name: "Remover" }));
    expect(h.state.model.stakeholders.some((s) => s.id === "s5")).toBe(false);
  });

  it("responsável × revisor: revisor diferente fecha os quatro olhos; a carga por pessoa aparece em barras com texto", () => {
    const h = renderPanel(RisksTeamPanel);
    const carla = el(document, '[data-load="u-carla"]');
    expect(within(carla).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50"); // 10 de 20 dias
    expect(carla.textContent).toMatch(/Carla Exemplo · Equipe · 10 d · 3 atividade\(s\)/);

    fireEvent.change(screen.getByRole("combobox", { name: "Revisor de T02" }), { target: { value: "u-ana" } });
    expect(h.state.model.tasks.find((x) => x.id === "tP")!.reviewerId).toBe("u-ana");
    expect(el(document, '[data-assign="tP"]').dataset.fourEyes).toBe("ok");
    expect(el(document, '[data-metric-line="W_QUATRO_OLHOS"]').textContent).toContain("2 de 2");

    fireEvent.change(screen.getByRole("combobox", { name: "Responsável por T07" }), { target: { value: "u-carla" } });
    expect(h.state.model.tasks.find((x) => x.id === "tE")!.responsibleId).toBe("u-carla");
    expect(el(document, '[data-load="u-carla"]').dataset.days).toBe("12");
    expect(el(document, '[data-metric-line="W_CARGA"]').textContent).toContain("Atenção"); // 60 % numa pessoa só
  });

  it("recusa do comando (título de risco vazio): o modelo não muda e o painel avisa sem quebrar", () => {
    const h = renderPanel(RisksTeamPanel);
    fireEvent.click(screen.getByRole("button", { name: "Editar Atraso na contratação de nuvem" }));
    expect(h.selections).toEqual(["RISK:k1"]);
    const before = h.state.model;
    const title = within(el(document, '[data-editor="k1"]')).getByLabelText("Risco") as HTMLInputElement;
    commit(title, "");
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "TEXTO_VAZIO" });
    expect(h.state.model).toBe(before);
    expect(screen.getByRole("alert").textContent).toContain("Escreva um texto antes de salvar.");
    expect(title.value).toBe("Atraso na contratação de nuvem");
    expect(el(document, '[data-risk="k1"]').textContent).toContain("Atraso na contratação de nuvem");
  });

  it("projeto sem riscos, partes interessadas nem atividades: estados vazios sem quebrar", () => {
    const empty = { ...buildDemoProject(), risks: [], stakeholders: [], tasks: [], dependencies: [], raci: [], baseline: undefined };
    const h = renderPanel(RisksTeamPanel, { model: empty });
    expect(screen.getByText("Nenhum risco registrado.")).toBeTruthy();
    expect([...document.querySelectorAll<HTMLElement>("[data-cell]")].every((c) => c.dataset.count === "0")).toBe(true);
    expect(el(document, "[data-verdict]").dataset.verdict).toBe("covers");
    expect(el(document, "[data-verdict]").textContent).toContain("Sem exposição líquida a cobrir");
    expect(el(document, "[data-stakeholders]").textContent).toContain("Nada registrado ainda.");
    expect(document.querySelectorAll("[data-raci]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-load]")).toHaveLength(6); // a equipe continua listada, com 0 d
    expect(h.commands).toEqual([]);
  });

  it("readOnly: sem controles de edição ativos e nada despachado (filtrar a matriz e o destaque cruzado continuam)", () => {
    const h = renderPanel(RisksTeamPanel, { readOnly: true, selected: "RISK:k3" });
    expect(screen.getByText(/Somente leitura/)).toBeTruthy();
    expect(el(document, '[data-risk="k3"]').dataset.selected).toBe("true");
    expect(el(document, '[data-risk="k1"]').dataset.selected).toBeUndefined();
    for (const role of ["textbox", "combobox"] as const) {
      const controls = screen.queryAllByRole(role);
      expect(controls.length).toBeGreaterThan(0);
      expect(controls.every((c) => (c as HTMLInputElement).disabled)).toBe(true);
    }
    expect(screen.queryByRole("button", { name: /^Editar|Registrar risco|Adicionar|Remover|Ajustar a contingência/ })).toBeNull();
    expect(document.querySelector("[data-editor]")).toBeNull();
    fireEvent.click(within(el(document, '[data-cell="2-4"]')).getByRole("button"));
    expect([...document.querySelectorAll<HTMLElement>("[data-risk]")].map((r) => r.dataset.risk)).toEqual(["k1"]);
    expect(h.commands).toEqual([]);
  });
});
