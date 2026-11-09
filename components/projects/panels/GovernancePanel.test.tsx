// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { deciaStub, renderPanel } from "@/test-utils/projects";
import { renderWithProviders } from "@/test-utils/render";
import { GovernancePanel } from "./GovernancePanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/decia-v1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

/** Texto sem a variação de espaços (o Intl usa espaço inseparável em "R$ 50.000"). */
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const metric = (id: string) => document.querySelector(`[data-metric="${id}"]`) as HTMLElement | null;

describe("GovernancePanel — DEMO", () => {
  it("mostra os indicadores da aba e deixa visíveis os problemas de governança do DEMO", () => {
    renderPanel(GovernancePanel);
    expect(metric("G_ALINHAMENTO")?.dataset.status).toBe("ATENCAO");
    expect(norm(metric("G_GUT")?.textContent)).toContain("G × U × T = 48 (alta)");
    expect(metric("G_DECISOES_PORTAO")?.dataset.status).toBe("CRITICO");
    expect(metric("G_ISO38500")?.dataset.status).toBe("ATENCAO");
    expect(norm(metric("G_RUN_GROW_TRANSFORM")?.textContent)).toContain("Run 16% · Grow 74% · Transform 10%");
    expect(norm(metric("G_AUTORIDADE_GP")?.textContent)).toContain("Matricial balanceada");
    // participação nas decisões depende das decisões do DECIA, que o painel não recebe
    expect(metric("W_PARTICIPACAO_DECISOES")).toBeNull();

    // cascata: 1 de 2 objetivos ligados; o2 sem objetivo estratégico
    expect(norm(screen.getByTestId("cascade-levels").textContent)).toContain("Objetivos do projeto: 1 de 2 ligados");
    const o2 = document.querySelector('tr[data-objective="o2"]') as HTMLElement;
    expect(within(o2).getByText("Sem objetivo estratégico", { selector: "span" })).toBeTruthy();
    // GUT pelo motor: produto, nunca soma
    expect(norm(screen.getByTestId("gut-result").textContent)).toContain("G × U × T = 4 × 4 × 3 = 48");
    expect(screen.getByText("Prioridade alta")).toBeTruthy();
    // Run/Grow/Transform: total das linhas × orçamento resumido do TAP
    expect(norm(screen.getByTestId("lines-total").textContent)).toBe("R$ 50.000");
    expect(norm(screen.getByTestId("rgt-vs-tap").textContent)).toContain("Dentro do orçamento do TAP (folga de R$ 10.000)");
    expect(screen.getByRole("progressbar", { name: /^Grow · ampliar o negócio atual — R\$\s50\.000|^Grow/ })).toBeTruthy();
    // estrutura × autoridade do GP
    expect(norm(screen.getByTestId("org-result").textContent)).toContain("autoridade do GP: moderada; quem controla o orçamento: compartilhado");
    // ISO 38500: 3 de 6, comportamento humano esquecido
    expect(screen.getByText("3 de 6")).toBeTruthy();
    expect(screen.getByText(/Comportamento humano não marcado/)).toBeTruthy();
    // portões aprovados sem registro no DECIA (erro plantado)
    const gates = screen.getByTestId("decided-gates");
    expect(within(gates).getAllByText("Sem registro no DECIA")).toHaveLength(2);
    expect(screen.getByText(/Há portão decidido fora do DECIA/)).toBeTruthy();
    // quem decide o quê
    expect(norm(document.querySelector('[data-row="gate"]')?.textContent)).toContain("Governança · EDM");
    expect(norm(document.querySelector('[data-row="work"]')?.textContent)).toContain("Gestão · APO, BAI, DSS, MEA");
  });
});

describe("GovernancePanel — edição por comandos", () => {
  it("cascata: cadastrar objetivo estratégico, ligar o objetivo do projeto e remover desliga a referência", () => {
    const h = renderPanel(GovernancePanel);
    const form = screen.getByTestId("goal-form");
    // validação local: código e texto obrigatórios, código único
    fireEvent.submit(form);
    expect(screen.getByText("Informe o código e o texto do objetivo estratégico.")).toBeTruthy();
    fireEvent.change(within(form).getByLabelText("Código"), { target: { value: "OE-03" } });
    fireEvent.change(within(form).getByLabelText("Objetivo estratégico"), { target: { value: "Duplicado" } });
    fireEvent.submit(form);
    expect(screen.getByText("Já existe um objetivo estratégico com o código OE-03.")).toBeTruthy();
    expect(h.commands).toHaveLength(0);

    fireEvent.change(within(form).getByLabelText("Código"), { target: { value: "BSC-02" } });
    fireEvent.change(within(form).getByLabelText("Objetivo estratégico"), { target: { value: "Melhorar a comunicação institucional" } });
    fireEvent.change(within(form).getByLabelText("Fonte"), { target: { value: "BSC" } });
    fireEvent.submit(form);
    const goals = h.state.model.governance.goals;
    expect(goals).toHaveLength(3);
    const added = goals.at(-1)!;
    expect(added).toMatchObject({ code: "BSC-02", text: "Melhorar a comunicação institucional", source: "BSC" });
    expect(added.id).toMatch(/^g-/);

    fireEvent.change(screen.getByLabelText("Objetivo estratégico de: Melhorar a comunicação com as áreas"), { target: { value: added.id } });
    expect(h.state.model.charter.objectives.find((o) => o.id === "o2")?.goalId).toBe(added.id);
    expect(metric("G_ALINHAMENTO")?.dataset.status).toBe("OK");

    fireEvent.click(screen.getByRole("button", { name: "Remover OE-03 Ampliar a transparência e a rastreabilidade das decisões" }));
    expect(h.state.model.governance.goals.map((g) => g.id)).toEqual(["g2", added.id]);
    expect(h.state.model.charter.objectives.find((o) => o.id === "o1")?.goalId).toBeUndefined();
    expect(h.commands.slice(-2).map((c) => c.type)).toEqual(["OBJECTIVE_UPDATE", "GOVERNANCE_UPDATE"]);
  });

  it("GUT e necessidade: cada nota é um comando com o produto completo; sem avaliação, espera as três", () => {
    const h = renderPanel(GovernancePanel);
    fireEvent.change(screen.getByLabelText("Gravidade (G)"), { target: { value: "5" } });
    expect(h.state.model.governance.gut).toEqual({ g: 5, u: 4, t: 3 });
    expect(norm(screen.getByTestId("gut-result").textContent)).toContain("5 × 4 × 3 = 60");
    fireEvent.change(screen.getByLabelText("Tipo de necessidade (inventário do PDTIC)"), { target: { value: "INFRAESTRUTURA" } });
    expect(h.state.model.governance.need).toBe("INFRAESTRUTURA");

    const demo = buildDemoProject();
    const fresh = renderPanel(GovernancePanel, { model: { ...demo, governance: { ...demo.governance, gut: undefined } } });
    const [g, u, t] = ["Gravidade (G)", "Urgência (U)", "Tendência (T)"].map((label) => within(fresh.container).getByLabelText(label));
    expect(within(fresh.container).getByTestId("gut-missing")).toBeTruthy();
    // indicador sem avaliação: sem "{score}" cru no detalhe — aparece a orientação
    const gutMetric = fresh.container.querySelector('[data-metric="G_GUT"]') as HTMLElement;
    expect(gutMetric.textContent).not.toMatch(/\{score\}/);
    expect(gutMetric.textContent).toContain("a prioridade é o produto, não a soma");
    fireEvent.change(g!, { target: { value: "3" } });
    fireEvent.change(u!, { target: { value: "3" } });
    expect(fresh.commands).toHaveLength(0);
    expect(within(fresh.container).getByText("Escolha G, U e T para calcular a prioridade.")).toBeTruthy();
    fireEvent.change(t!, { target: { value: "2" } });
    expect(fresh.commands).toEqual([{ type: "GOVERNANCE_UPDATE", patch: { gut: { g: 3, u: 3, t: 2 } } }]);
    expect(norm(within(fresh.container).getByTestId("gut-result").textContent)).toContain("3 × 3 × 2 = 18");
    expect(within(fresh.container).getByText("Prioridade média")).toBeTruthy();
  });

  it("Run/Grow/Transform: classe do projeto e linhas de orçamento (incluir, alterar, remover) recalculam a distribuição", () => {
    const h = renderPanel(GovernancePanel);
    fireEvent.click(screen.getByRole("radio", { name: /^Transform · criar o negócio novo/ }));
    expect(h.state.model.governance.spend).toBe("TRANSFORM");

    const form = screen.getByTestId("line-form");
    fireEvent.change(within(form).getByLabelText("Novo item de orçamento"), { target: { value: "Licenças de monitoramento" } });
    fireEvent.change(within(form).getByLabelText("Valor (R$)"), { target: { value: "12000" } });
    fireEvent.change(within(form).getByLabelText("Classe"), { target: { value: "RUN" } });
    fireEvent.submit(form);
    expect(h.state.model.budgetLines.at(-1)).toMatchObject({ title: "Licenças de monitoramento", amount: 12_000, spend: "RUN" });
    expect(norm(screen.getByTestId("lines-total").textContent)).toBe("R$ 62.000");
    expect(norm(screen.getByTestId("rgt-vs-tap").textContent)).toContain("Acima do orçamento do TAP em R$ 2.000");

    const amount = screen.getByLabelText("Valor de Nuvem (1º ano)");
    fireEvent.change(amount, { target: { value: "9000" } });
    fireEvent.blur(amount);
    expect(h.state.model.budgetLines.find((b) => b.id === "b2")?.amount).toBe(9_000);
    fireEvent.change(screen.getByLabelText("Classe de Desenvolvimento"), { target: { value: "TRANSFORM" } });
    expect(h.state.model.budgetLines.find((b) => b.id === "b1")?.spend).toBe("TRANSFORM");
    expect(norm(metric("G_RUN_GROW_TRANSFORM")?.textContent)).toContain("Run 33% · Grow 0% · Transform 67%");

    fireEvent.click(screen.getByRole("button", { name: "Remover Capacitação para o novo processo decisório" }));
    expect(h.state.model.budgetLines.map((b) => b.id)).not.toContain("b3");
  });

  it("estrutura organizacional e ISO/IEC 38500: autoridade do GP pelo PM_AUTHORITY e princípios mesclados", () => {
    const h = renderPanel(GovernancePanel);
    fireEvent.click(screen.getByRole("radio", { name: /^Funcional/ }));
    expect(h.state.model.governance.orgStructure).toBe("FUNCIONAL");
    expect(norm(screen.getByTestId("org-result").textContent)).toContain("autoridade do GP: pouca ou nenhuma; quem controla o orçamento: gerente funcional");
    expect(screen.getByText(/o GP coordena sem poder sobre os recursos/)).toBeTruthy();
    expect(metric("G_AUTORIDADE_GP")?.dataset.status).toBe("ATENCAO");

    fireEvent.click(screen.getByRole("checkbox", { name: /^Comportamento humano/ }));
    expect(h.state.model.governance.iso38500).toEqual({ RESPONSABILIDADE: true, ESTRATEGIA: true, CONFORMIDADE: true, COMPORTAMENTO_HUMANO: true });
    fireEvent.click(screen.getByRole("checkbox", { name: /^Conformidade/ }));
    expect(h.state.model.governance.iso38500.CONFORMIDADE).toBe(false);
    expect(screen.getByText(/critério de saída do portão de Análise/)).toBeTruthy();
  });

  it("recusa do comando: linha de orçamento sem título ou com valor inválido não quebra e aparece junto do formulário", () => {
    const h = renderPanel(GovernancePanel);
    const form = screen.getByTestId("line-form");
    fireEvent.submit(form);
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "TEXTO_VAZIO" });
    expect(screen.getByText("Escreva um texto antes de salvar.")).toBeTruthy();
    fireEvent.change(within(form).getByLabelText("Novo item de orçamento"), { target: { value: "Consultoria" } });
    fireEvent.change(within(form).getByLabelText("Valor (R$)"), { target: { value: "abc" } });
    fireEvent.submit(form);
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "VALOR_INVALIDO" });
    expect(screen.getByText("Valor inválido.")).toBeTruthy();
    expect(h.state.model.budgetLines).toHaveLength(3);
    expect((within(form).getByLabelText("Novo item de orçamento") as HTMLInputElement).value).toBe("Consultoria");
  });
});

describe("GovernancePanel — DECIA, AHP e leitura", () => {
  it("decisões no DECIA: estado, link, levar portão decidido fora do DECIA e seleção de projetos", () => {
    const demo = buildDemoProject();
    const model = {
      ...demo,
      decisionIds: ["dec-gate", "dec-x"],
      gates: demo.gates.map((g) => (g.phase === "PLANEJAMENTO" ? { ...g, decisionId: "dec-gate" } : g)),
    };
    const h = renderPanel(GovernancePanel, { model });
    const linked = screen.getByTestId("linked-decisions");
    expect(within(linked).getByText("Portão de Planejamento")).toBeTruthy();
    expect(within(linked).getByText("Decisão vinculada")).toBeTruthy();
    expect(within(linked).getAllByText("estado não informado")).toHaveLength(2);
    expect(within(linked).getByRole("link", { name: "Abrir no DECIA: Portão de Planejamento" }).getAttribute("href")).toBe("/decia/decisoes/dec-gate");

    const gates = screen.getByTestId("decided-gates");
    expect(within(gates).getAllByText("Registrado")).toHaveLength(1);
    fireEvent.click(within(gates).getByRole("button", { name: "Levar o portão de Demanda ao DECIA" }));
    fireEvent.click(screen.getByRole("button", { name: "Seleção e priorização de projetos no DECIA" }));
    expect(h.deciaCalls).toEqual([{ kind: "gate", arg: "DEMANDA" }, { kind: "selection" }]);
    expect(h.commands).toHaveLength(0);
  });

  it("estado da decisão vem do DECIA; sem a prop decia a seção mostra só o que há no modelo", () => {
    const demo = buildDemoProject();
    const model = { ...demo, decisionIds: ["dec-1"] };
    const calls: { kind: "gate" | "change" | "selection"; arg?: string }[] = [];
    const withDecia = renderWithProviders(
      <GovernancePanel model={model} dispatch={() => ({ ok: false, error: "NAO_ENCONTRADO" })} people={DEMO_PEOPLE} readOnly={false} decia={{ ...deciaStub(calls), decisionStatus: () => "DECIDIDA" }} />,
    );
    expect(within(withDecia.container).getByText("Decidida")).toBeTruthy();
    withDecia.unmount();

    renderWithProviders(<GovernancePanel model={model} dispatch={() => ({ ok: false, error: "NAO_ENCONTRADO" })} people={DEMO_PEOPLE} readOnly={false} />);
    expect(screen.getByTestId("no-decia")).toBeTruthy();
    expect(within(screen.getByTestId("linked-decisions")).getByText("dec-1")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Abrir no DECIA/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Seleção e priorização/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Levar o portão/ })).toBeNull();
    expect(within(screen.getByTestId("decided-gates")).getAllByText("Sem registro no DECIA")).toHaveLength(2);
  });

  it("calculadora AHP: pesos, λmax, IC e RC pelo motor, sem alterar o projeto", () => {
    const h = renderPanel(GovernancePanel);
    const ahp = screen.getByTestId("ahp");
    expect(within(ahp).getByRole("progressbar", { name: "Alinhamento estratégico: 25%" })).toBeTruthy();
    expect(within(ahp).getByText("Consistente")).toBeTruthy();

    fireEvent.change(within(ahp).getByLabelText("Alinhamento estratégico × VPL"), { target: { value: "3" } });
    expect(within(ahp).queryByRole("progressbar", { name: "Alinhamento estratégico: 25%" })).toBeNull();
    expect(norm(within(ahp).getByTestId("ahp-matrix").textContent)).toContain("1/3");

    // 3 critérios com julgamentos circulares (A > B, B > C, C > A): inconsistente
    fireEvent.click(within(ahp).getByRole("button", { name: "Remover o critério Urgência (GUT)" }));
    expect(within(ahp).queryByRole("button", { name: /^Remover o critério/ })).toBeNull();
    fireEvent.change(within(ahp).getByLabelText("Alinhamento estratégico × VPL"), { target: { value: "9" } });
    fireEvent.change(within(ahp).getByLabelText("VPL × Risco"), { target: { value: "9" } });
    fireEvent.change(within(ahp).getByLabelText("Alinhamento estratégico × Risco"), { target: { value: "1/9" } });
    expect(within(ahp).getByText("Inconsistente")).toBeTruthy();
    expect(norm(within(ahp).getByTestId("ahp-verdict").textContent)).toContain("RC ≥ 0,10");
    expect(norm(within(ahp).getByText(/IA = 0,58 para n = 3/).textContent)).toContain("IC = (λmax − n) / (n − 1)");

    fireEvent.change(within(ahp).getByLabelText("Nome do critério 1"), { target: { value: "Impacto no cidadão" } });
    expect(within(within(ahp).getByTestId("ahp-matrix")).getAllByText("Impacto no cidadão").length).toBeGreaterThan(0);
    fireEvent.click(within(ahp).getByRole("button", { name: "Adicionar critério" }));
    expect(within(ahp).getByLabelText("Nome do critério 4")).toBeTruthy();
    expect(h.commands).toHaveLength(0);
  });

  it("readOnly: nenhum controle de edição do projeto ativo e nada é despachado", () => {
    const h = renderPanel(GovernancePanel, { readOnly: true });
    expect(screen.queryByTestId("goal-form")).toBeNull();
    expect(screen.queryByTestId("line-form")).toBeNull();
    expect(screen.queryAllByRole("button", { name: /^Remover (OE|ND|Desenv|Nuvem|Capacit)/ })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Levar o portão/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Seleção e priorização/ })).toBeNull();
    for (const el of screen.getAllByRole("radio")) expect(el.hasAttribute("disabled")).toBe(true);
    for (const el of within(screen.getByTestId("iso")).getAllByRole("checkbox")) expect(el.hasAttribute("disabled")).toBe(true);
    expect((screen.getByLabelText("Gravidade (G)") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("Tipo de necessidade (inventário do PDTIC)") as HTMLSelectElement).disabled).toBe(true);
    // fora da calculadora (estado local), nenhum campo editável
    const ahp = screen.getByTestId("ahp");
    const editable = [...screen.queryAllByRole("textbox"), ...screen.queryAllByRole("combobox")].filter((el) => !ahp.contains(el) && !(el as HTMLInputElement).disabled);
    expect(editable).toHaveLength(0);
    fireEvent.click(screen.getByRole("radio", { name: /^Funcional/ }));
    fireEvent.click(within(screen.getByTestId("iso")).getByRole("checkbox", { name: /^Aquisição/ }));
    // a calculadora segue utilizável na leitura (não altera o projeto)
    fireEvent.change(within(ahp).getByLabelText("Alinhamento estratégico × VPL"), { target: { value: "5" } });
    expect(h.commands).toHaveLength(0);
    expect(h.state.model.version).toBe(4);
    expect(norm(screen.getByTestId("lines-total").textContent)).toBe("R$ 50.000");
  });
});
