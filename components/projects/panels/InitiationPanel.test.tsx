// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { renderPanel } from "@/test-utils/projects";
import { InitiationPanel } from "./InitiationPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/decia-v1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

/** Texto sem a variação de espaços (o Intl usa espaço inseparável em "R$ 6.837"). */
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const metric = (id: string) => document.querySelector(`[data-metric="${id}"]`) as HTMLElement;
const commit = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } });
  fireEvent.blur(el);
};

describe("InitiationPanel — DEMO", () => {
  it("mostra os indicadores da aba, a abordagem, o business case calculado e os erros plantados", () => {
    renderPanel(InitiationPanel);
    // indicadores do Feedback que apontam para a Iniciação
    expect(metric("G_SMART").dataset.status).toBe("ATENCAO");
    expect(norm(metric("G_SMART").textContent)).toContain("1 de 2 objetivo(s)");
    expect(metric("G_TAP_PATROCINADOR").dataset.status).toBe("OK");
    // abordagem híbrida marcada, com quando usar e o efeito na Mesa
    expect(screen.getByRole("radio", { name: /^Híbrido/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/na Execução, o quadro Scrum organiza/)).toBeTruthy();
    // objetivo o2 sem SMART e sem objetivo estratégico (erro plantado), visível na linha e no diagnóstico
    const o2 = document.querySelector('[data-objective="o2"]') as HTMLElement;
    expect(within(o2).getByText("sem SMART")).toBeTruthy();
    expect(within(o2).getByText("sem objetivo estratégico")).toBeTruthy();
    const diag = screen.getByTestId("tap-diagnosis");
    expect(norm(diag.textContent)).toContain("1 objetivo(s) sem os critérios SMART: Melhorar a comunicação com as áreas");
    expect(norm(diag.textContent)).toContain("1 objetivo(s) sem objetivo estratégico");
    // business case pelo motor financeiro: VPL, payback e ROI do exemplo da aula
    expect(norm(screen.getByTestId("bc-npv").textContent)).toMatch(/R\$ 6\.837/);
    expect(norm(screen.getByTestId("bc-payback").textContent)).toContain("2,33 anos");
    expect(norm(screen.getByTestId("bc-dpayback").textContent)).toContain("2,7 anos");
    expect(norm(screen.getByTestId("bc-roi").textContent)).toContain("40%");
    expect(norm(screen.getByTestId("bc-irr").textContent)).toMatch(/16,\d%/);
    expect(within(screen.getByTestId("bc-verdict")).getByText("Viável")).toBeTruthy();
    expect(screen.getByText("VPL = Σ FCₜ / (1 + i)ᵗ")).toBeTruthy();
    // portão da Demanda: critérios atendidos, mas aprovado fora do DECIA (erro plantado)
    expect(screen.getByText(/Todos os critérios de saída atendidos/)).toBeTruthy();
    const decision = screen.getByTestId("gate-decision");
    expect(norm(decision.textContent)).toContain("Decidido sem registro no DECIA");
    expect(norm(decision.textContent)).toContain("Aprovado em reunião, sem registro no DECIA");
    // o que entra no TAP: objetivos mensuráveis ainda pendentes
    expect(screen.getByTestId("tap-content").querySelector('[data-ok="false"]')?.textContent).toContain("Objetivos mensuráveis");
  });
});

describe("InitiationPanel — edição por comandos", () => {
  it("abordagem: escolher Ágil despacha SET_APPROACH, gera versão e aponta o quadro em uso", () => {
    const h = renderPanel(InitiationPanel);
    fireEvent.click(screen.getByRole("radio", { name: /^Ágil/ }));
    expect(h.commands.at(-1)).toEqual({ type: "SET_APPROACH", approach: "AGIL" });
    expect(h.state.model.approach).toBe("AGIL");
    expect(h.state.model.version).toBe(5);
    expect(norm(screen.getByTestId("approach-mismatch").textContent)).toContain("Ágil (adaptativo)");
  });

  it("objetivos: marcar SMART e ligar ao objetivo estratégico mudam o modelo e o indicador", () => {
    const h = renderPanel(InitiationPanel);
    fireEvent.click(screen.getByRole("checkbox", { name: /Atende aos critérios SMART\s*— Melhorar a comunicação/ }));
    expect(h.state.model.charter.objectives.find((o) => o.id === "o2")?.smart).toBe(true);
    expect(metric("G_SMART").dataset.status).toBe("OK");
    fireEvent.change(screen.getByLabelText("Objetivo estratégico de: Melhorar a comunicação com as áreas"), { target: { value: "g2" } });
    expect(h.commands.at(-1)).toEqual({ type: "OBJECTIVE_UPDATE", id: "o2", goalId: "g2" });
    expect(h.state.model.charter.objectives.find((o) => o.id === "o2")?.goalId).toBe("g2");
    expect(screen.getByText(/TAP coerente/)).toBeTruthy();
    // incluir um objetivo novo (lista do TAP)
    const input = screen.getByLabelText("Novo objetivo do projeto");
    fireEvent.change(input, { target: { value: "Reduzir em 50% o tempo de redação das atas até mar/2027" } });
    fireEvent.submit(input.closest("form")!);
    expect(h.state.model.charter.objectives).toHaveLength(3);
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("TAP: patrocinador igual ao gerente vira erro; desfazer e registrar a aprovação pelo patrocinador", () => {
    const h = renderPanel(InitiationPanel);
    fireEvent.change(screen.getByLabelText("Patrocinador"), { target: { value: "u-pessoa" } });
    expect(h.state.model.charter.sponsorId).toBe("u-pessoa");
    const diag = screen.getByTestId("tap-diagnosis");
    expect(norm(diag.textContent)).toContain("Patrocinador e gerente são a mesma pessoa (Pessoa Exemplo)");
    expect(norm(diag.textContent)).toContain("A aprovação registrada não vale");
    expect(metric("G_TAP_PATROCINADOR").dataset.status).toBe("CRITICO");

    fireEvent.click(screen.getByRole("button", { name: "Desfazer aprovação" }));
    expect(h.state.model.charter.approvedBySponsorAt).toBeUndefined();
    const approve = screen.getByRole("button", { name: "Registrar aprovação do patrocinador" }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(screen.getByText(/O patrocinador não pode ser o próprio gerente/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Patrocinador"), { target: { value: "u-ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar aprovação do patrocinador" }));
    expect(h.state.model.charter.approvedBySponsorAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(metric("G_TAP_PATROCINADOR").dataset.status).toBe("OK");
  });

  it("TAP: produto, orçamento resumido, listas, marcos e benefícios confirmam como comandos", () => {
    const h = renderPanel(InitiationPanel);
    commit(screen.getByLabelText("Produto do projeto"), "Plataforma DECIA v1.0 com snapshot imutável");
    expect(h.state.model.charter.product).toBe("Plataforma DECIA v1.0 com snapshot imutável");
    const budget = screen.getByLabelText("Orçamento resumido (R$)");
    fireEvent.change(budget, { target: { value: "70000" } });
    fireEvent.keyDown(budget, { key: "Enter" });
    expect(h.state.model.charter.summaryBudget).toBe(70_000);

    const premise = screen.getByLabelText("Novo item em Premissas");
    fireEvent.change(premise, { target: { value: "Patrocínio garantido até 2027" } });
    fireEvent.submit(premise.closest("form")!);
    expect(h.state.model.charter.premises).toContain("Patrocínio garantido até 2027");
    fireEvent.click(screen.getByRole("button", { name: "Remover Equipe dedicada de 4 pessoas" }));
    expect(h.state.model.charter.premises).not.toContain("Equipe dedicada de 4 pessoas");

    const milestone = screen.getByLabelText("Novo item em Marcos");
    fireEvent.change(milestone, { target: { value: "Homologação com o comitê" } });
    fireEvent.submit(milestone.closest("form")!);
    expect(h.state.model.charter.milestones.at(-1)?.title).toBe("Homologação com o comitê");
    expect(screen.getAllByText("sem data")).toHaveLength(1);

    const benefit = screen.getByLabelText("Novo benefício");
    fireEvent.change(benefit, { target: { value: "  Atas   geradas em minutos " } });
    fireEvent.submit(benefit.closest("form")!);
    expect(h.state.model.businessCase.benefits.at(-1)).toBe("Atas geradas em minutos");
    expect(h.commands.filter((c) => c.type === "CHARTER_LIST_ADD")).toHaveLength(2);
  });

  it("business case: fluxos e taxa recalculam pelo motor e o veredito muda", () => {
    const h = renderPanel(InitiationPanel);
    commit(screen.getByLabelText("Fluxo de caixa do ano 0"), "-80000");
    expect(h.state.model.businessCase.cashflows).toEqual([-80_000, 15_000, 25_000, 30_000]);
    expect(within(screen.getByTestId("bc-verdict")).getByText("Inviável")).toBeTruthy();
    expect(norm(screen.getByTestId("bc-npv").textContent)).toMatch(/-R\$ 23\.163/);
    expect(norm(screen.getByTestId("bc-payback").textContent)).toContain("não se paga no horizonte");

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ano" }));
    expect(h.state.model.businessCase.cashflows).toHaveLength(5);
    commit(screen.getByLabelText("Fluxo de caixa do ano 4"), "40000");
    expect(h.state.model.businessCase.cashflows[4]).toBe(40_000);
    expect(within(screen.getByTestId("bc-verdict")).getByText("Viável")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remover o ano 4" }));
    expect(h.state.model.businessCase.cashflows).toHaveLength(4);

    const rate = screen.getByLabelText("Taxa de desconto (taxa mínima de atratividade)");
    fireEvent.change(rate, { target: { value: "12,5" } });
    fireEvent.keyDown(rate, { key: "Enter" });
    expect(h.state.model.businessCase.rate).toBeCloseTo(0.125);
  });
});

describe("InitiationPanel — recusas, navegação e leitura", () => {
  it("recusa do comando (texto vazio) aparece junto do campo e não muda o modelo", () => {
    const h = renderPanel(InitiationPanel);
    const input = screen.getByLabelText("Novo objetivo do projeto") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "TEXTO_VAZIO" });
    expect(screen.getByText("Escreva um texto antes de salvar.")).toBeTruthy();
    expect(h.state.model.charter.objectives).toHaveLength(2);
    expect(input.value).toBe("   ");
  });

  it("projeto arquivado sem readOnly: o comando é recusado (PROJETO_BLOQUEADO) e o painel continua de pé", () => {
    const demo = buildDemoProject();
    const h = renderPanel(InitiationPanel, { model: { ...demo, closure: { ...demo.closure, archived: true } } });
    fireEvent.click(screen.getByRole("radio", { name: /^Preditivo/ }));
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "PROJETO_BLOQUEADO" });
    expect(h.state.model.approach).toBe("HIBRIDO");
    expect(screen.getByText("Projeto arquivado: reabra para editar.")).toBeTruthy();
    expect(screen.getByTestId("bc-result")).toBeTruthy();
  });

  it("diagnóstico e portão apontam a aba onde corrigir (goTo)", () => {
    const demo = buildDemoProject();
    const h = renderPanel(InitiationPanel, { model: { ...demo, governance: { ...demo.governance, gut: undefined } } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir a cascata em Governança" }));
    expect(h.visited).toEqual(["governanca"]);
    const missing = screen.getByTestId("gate-missing");
    expect(norm(missing.textContent)).toContain("Priorize a demanda pela matriz GUT");
    fireEvent.click(within(missing).getByRole("button", { name: "Abrir em Governança" }));
    expect(h.visited).toEqual(["governanca", "governanca"]);
  });

  it("readOnly: nenhum controle de edição ativo e nada é despachado", () => {
    const h = renderPanel(InitiationPanel, { readOnly: true });
    expect(screen.queryAllByRole("button", { name: "Adicionar" })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /^Remover/ })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Desfazer aprovação" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Adicionar ano" })).toBeNull();
    for (const el of screen.getAllByRole("radio")) expect(el.hasAttribute("disabled")).toBe(true);
    for (const el of screen.getAllByRole("checkbox")) expect(el.hasAttribute("disabled")).toBe(true);
    for (const el of screen.getAllByRole("combobox")) expect((el as HTMLSelectElement).disabled).toBe(true);
    for (const el of screen.queryAllByRole("textbox")) expect((el as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /^Ágil/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Melhorar a comunicação/ }));
    expect(h.commands).toHaveLength(0);
    expect(h.state.model.version).toBe(4);
    // os valores continuam legíveis
    expect(norm(screen.getByTestId("bc-table").textContent)).toMatch(/-R\$ 50\.000/);
  });
});
