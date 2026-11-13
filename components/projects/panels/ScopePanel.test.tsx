// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { traceabilityView, wbsView } from "@/lib/projects/views";
import { renderPanel } from "@/test-utils/projects";
import { ScopePanel } from "./ScopePanel";

/** Elemento obrigatório por seletor (os painéis marcam linhas/cartões com data-*). */
function el(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`não encontrado: ${selector}`);
  return found;
}
const node = (id: string) => el(document, `[data-wbs="${id}"]`);
const commit = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe("ScopePanel — EAP, requisitos, rastreabilidade e MoSCoW do projeto DEMO", () => {
  it("mostra a EAP com códigos e consolidado, os indicadores da aba e os erros plantados (verbo na EAP, órfãs, RF-02/RF-03, gold plating)", () => {
    renderPanel(ScopePanel);
    // indicadores que apontam para a aba Escopo — os mesmos do Feedback da IA
    expect(el(document, '[data-metric="Q_EAP_100"]').dataset.status).toBe("ATENCAO");
    expect(el(document, '[data-metric="Q_EAP_SUBSTANTIVOS"]').dataset.status).toBe("ATENCAO");
    expect(el(document, '[data-metric="Q_RASTREABILIDADE"]').dataset.status).toBe("CRITICO");
    expect(el(document, '[data-metric="Q_GOLD_PLATING"]').textContent).toContain("4 entrega(s) sem requisito");

    // árvore: códigos 1, 1.1…; consolidado sobe das atividades (T03 12 mil + T06 20 mil) e o declarado de 1 é 32 mil
    expect(screen.getByRole("button", { name: /^1\.1 Matriz de critérios e protótipo/ })).toBeTruthy();
    expect(el(document, '[data-rollup="w1"]').textContent).toMatch(/32\.000/);
    expect(el(document, '[data-rollup="w0"]').textContent).toMatch(/47\.000/);
    expect((screen.getByRole("textbox", { name: "Orçamento declarado de 1" }) as HTMLInputElement).value).toBe("32000");
    expect(within(node("w11")).getByText("T03")).toBeTruthy();

    // "Testar integração": cara de atividade e pacote sem atividade, junto do nó
    expect(el(node("w32"), '[data-issue="PARECE_ATIVIDADE"]').textContent).toContain("Parece atividade (verbo)");
    expect(node("w32").querySelector('[data-issue="PACOTE_SEM_ATIVIDADE"]')).not.toBeNull();
    expect(node("w11").querySelector("[data-issue]")).toBeNull();

    // atividades fora da EAP: T04 e o T08 (scope creep, depois da linha de base)
    expect(el(document, '[data-orphan="tC"]').textContent).toContain("sem pacote de trabalho");
    expect(el(document, '[data-orphan="tX"]').textContent).toContain("depois da linha de base sem mudança aprovada");

    // rastreabilidade: só RF-01 completo (33 %); RF-03 sem entrega; RF-02 e RF-03 sem teste; 4 folhas sem requisito
    expect(el(document, '[data-trace="r1"]').dataset.complete).toBe("true");
    expect(el(document, '[data-trace="r3"]').dataset.complete).toBe("false");
    expect(screen.getByRole("progressbar", { name: "Requisitos completos (origem + entrega + teste)" }).getAttribute("aria-valuenow")).toBe("33");
    expect(el(document, '[data-diagnostic="untraced"]').textContent).toContain("RF-03");
    expect(el(document, '[data-diagnostic="untraced"]').textContent).not.toContain("RF-02");
    expect(el(document, '[data-diagnostic="untested"]').textContent).toMatch(/RF-02.*RF-03/);
    expect(el(document, '[data-diagnostic="gold"]').textContent).toContain("Testar integração");

    // MoSCoW agrupado; portões do Planejamento (aprovado com critérios pendentes) e da Elaboração (fase atual)
    expect(el(document, '[data-moscow="MUST"]').textContent).toContain("5 atividade(s)");
    expect(within(el(document, '[data-moscow="NONE"]')).getByText("T08")).toBeTruthy();
    expect(el(document, '[data-gate="PLANEJAMENTO"]').textContent).toContain("aprovado, mas hoje com 4 critério(s) pendente(s)");
    expect(el(document, '[data-gate="ELABORACAO"]').textContent).toContain("fase atual");
    expect(el(document, '[data-gate="ELABORACAO"]').querySelectorAll('[data-ok="false"]')).toHaveLength(2);
  });

  it("ligar o RF-03 a uma entrega (REQ_LINK) e registrar o teste do RF-02 (REQ_UPDATE) sobem a cobertura", () => {
    const h = renderPanel(ScopePanel);
    const rf03 = el(document, '[data-req="r3"]');
    fireEvent.click(within(rf03).getByRole("checkbox", { name: "1.2 Registro e snapshot" }));
    expect(h.state.model.requirements.find((r) => r.id === "r3")!.deliverableIds).toEqual(["w12"]);
    expect(el(document, '[data-diagnostic="untraced"]').textContent).not.toContain("RF-03");
    expect(el(document, '[data-trace="r3"]').textContent).toContain("1.2");

    commit(within(el(document, '[data-req="r2"]')).getByLabelText("Teste / verificação"), "CT-02");
    expect(h.state.model.requirements.find((r) => r.id === "r2")!.test).toBe("CT-02");
    expect(traceabilityView(h.state.model).coverage).toBe(67);
    expect(screen.getByRole("progressbar", { name: "Requisitos completos (origem + entrega + teste)" }).getAttribute("aria-valuenow")).toBe("67");
    expect(el(document, '[data-trace="r2"]').dataset.complete).toBe("true");

    // desmarcar desliga (on: false)
    fireEvent.click(within(el(document, '[data-req="r3"]')).getByRole("checkbox", { name: "1.2 Registro e snapshot" }));
    expect(h.state.model.requirements.find((r) => r.id === "r3")!.deliverableIds).toEqual([]);
    expect(h.commands.filter((c) => c.type === "REQ_LINK").map((c) => c.type === "REQ_LINK" && c.on)).toEqual([true, false]);
  });

  it("corrige a EAP: liga a atividade órfã ao pacote (TASK_UPDATE wbsId) e renomeia a entrega com nome de verbo", () => {
    const h = renderPanel(ScopePanel);
    const before = h.state.model.version;
    fireEvent.change(screen.getByRole("combobox", { name: "Pacote de trabalho de T04" }), { target: { value: "w32" } });
    expect(h.state.model.tasks.find((x) => x.id === "tC")!.wbsId).toBe("w32");
    expect(document.querySelector('[data-orphan="tC"]')).toBeNull();
    expect(node("w32").querySelector('[data-issue="PACOTE_SEM_ATIVIDADE"]')).toBeNull();

    const title = screen.getByRole("textbox", { name: "Nome da entrega 3.2" });
    fireEvent.change(title, { target: { value: "Relatório de testes de integração" } });
    fireEvent.keyDown(title, { key: "Enter" });
    expect(h.state.model.wbs.find((w) => w.id === "w32")!.title).toBe("Relatório de testes de integração");
    expect(wbsView(h.state.model).issues.some((i) => i.kind === "PARECE_ATIVIDADE")).toBe(false);
    expect(el(document, '[data-metric="Q_EAP_SUBSTANTIVOS"]').dataset.status).toBe("OK");
    expect(h.state.model.version).toBe(before + 2); // um comando = uma versão
  });

  it("declarado ≠ soma dos filhos aparece no nó e se corrige com um clique; subentrega nova entra na árvore e sai com confirmação", () => {
    const h = renderPanel(ScopePanel);
    commit(screen.getByRole("textbox", { name: "Orçamento declarado de 1" }), "30000");
    expect(h.state.model.wbs.find((w) => w.id === "w1")!.budget).toBe(30_000);
    const issue = el(node("w1"), '[data-issue="SOMA_DIFERENTE"]');
    expect(issue.textContent).toMatch(/30\.000.*32\.000/);
    fireEvent.click(within(issue).getByRole("button", { name: /Usar a soma dos filhos/ }));
    expect(h.state.model.wbs.find((w) => w.id === "w1")!.budget).toBe(32_000);
    expect(node("w1").querySelector('[data-issue="SOMA_DIFERENTE"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar subentrega em 3 Implantação" }));
    fireEvent.change(screen.getByLabelText("Nova subentrega de 3 Implantação"), { target: { value: "Manual do usuário" } });
    fireEvent.click(within(node("w3")).getByRole("button", { name: "Adicionar" }));
    const added = h.state.model.wbs.find((w) => w.title === "Manual do usuário")!;
    expect(added.parentId).toBe("w3");
    expect(screen.getByRole("button", { name: /^3\.3 Manual do usuário/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remover 3.3 Manual do usuário" }));
    expect(h.state.model.wbs.some((w) => w.id === added.id)).toBe(true); // primeiro clique só pergunta
    fireEvent.click(within(screen.getByRole("group", { name: "Remover 3.3 Manual do usuário" })).getByRole("button", { name: "Remover" }));
    expect(h.state.model.wbs.some((w) => w.id === added.id)).toBe(false);
    expect(screen.queryByRole("button", { name: /Remover 0? ?Plataforma/ })).toBeNull(); // a raiz nunca tem "remover"
  });

  it("subentrega sob um pacote com atividade: a atividade fica fora do pacote, a regra dos 100 % quebra, e o Select a leva para a folha nova", () => {
    const h = renderPanel(ScopePanel);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar subentrega em 1.1 Matriz de critérios e protótipo" }));
    fireEvent.change(screen.getByLabelText("Nova subentrega de 1.1 Matriz de critérios e protótipo"), { target: { value: "Protótipo navegável" } });
    fireEvent.click(within(node("w11")).getByRole("button", { name: "Adicionar" }));
    const leaf = h.state.model.wbs.find((w) => w.title === "Protótipo navegável")!;
    expect(leaf.parentId).toBe("w11");

    // 1.1 deixou de ser folha: T03 ficou fora do pacote, a folha nova está vazia, o declarado de 1 não bate e RF-01 aponta para um nó que não é pacote
    expect(el(node("w11"), '[data-issue="ATIVIDADE_FORA_DO_PACOTE"]').textContent).toContain("T03");
    expect(el(document, '[data-orphan="tB"]').textContent).toContain("ligada a 1.1, que não é pacote de trabalho (folha)");
    expect(node(leaf.id).querySelector('[data-issue="PACOTE_SEM_ATIVIDADE"]')).not.toBeNull();
    expect(el(node("w1"), '[data-issue="SOMA_DIFERENTE"]').textContent).toMatch(/32\.000.*20\.000/);
    expect(within(el(document, '[data-req="r1"]')).getByRole("checkbox", { name: /^1\.1 Matriz de critérios e protótipo · não é pacote de trabalho$/ })).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Pacote de trabalho de T03" }), { target: { value: leaf.id } });
    expect(h.state.model.tasks.find((x) => x.id === "tB")!.wbsId).toBe(leaf.id);
    expect(wbsView(h.state.model).issues.filter((i) => i.kind === "ATIVIDADE_FORA_DO_PACOTE" || i.kind === "SOMA_DIFERENTE")).toEqual([]);
    expect(document.querySelector('[data-orphan="tB"]')).toBeNull();
    expect(el(document, `[data-rollup="${leaf.id}"]`).textContent).toMatch(/12\.000/);
  });

  it("selecionar um nó chama onSelect(WBS:id), abre o dicionário da EAP e destaca o nó selecionado", () => {
    const h = renderPanel(ScopePanel, { selected: "WBS:w11" });
    expect(node("w11").dataset.selected).toBe("true");
    expect(screen.getByRole("button", { name: /^1\.1 Matriz/ }).getAttribute("aria-current")).toBe("true");
    expect(node("w12").dataset.selected).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: /^1\.2 Registro e snapshot/ }));
    expect(h.selections).toEqual(["WBS:w12"]);
    const dict = el(document, '[data-dictionary="w12"]');
    expect((within(dict).getByLabelText("Critério de aceite") as HTMLInputElement).value).toBe("Snapshot com SHA-256 verificável");
    commit(within(dict).getByLabelText("Critério de aceite"), "Snapshot com SHA-256 conferido pelo controle interno");
    fireEvent.change(within(dict).getByLabelText("Responsável pela entrega"), { target: { value: "u-diego" } });
    const w12 = h.state.model.wbs.find((w) => w.id === "w12")!;
    expect(w12).toMatchObject({ acceptance: "Snapshot com SHA-256 conferido pelo controle interno", ownerId: "u-diego" });

    fireEvent.click(screen.getByRole("button", { name: "Selecionar RF-01" }));
    expect(h.selections.at(-1)).toBe("REQ:r1");
  });

  it("MoSCoW reagrupa a atividade (TASK_UPDATE moscow) e um requisito novo entra com origem (REQ_ADD)", () => {
    const h = renderPanel(ScopePanel);
    fireEvent.change(screen.getByRole("combobox", { name: "Prioridade MoSCoW de T08" }), { target: { value: "WONT" } });
    expect(h.state.model.tasks.find((x) => x.id === "tX")!.moscow).toBe("WONT");
    expect(within(el(document, '[data-moscow="WONT"]')).getByText("T08")).toBeTruthy();
    expect(el(document, '[data-moscow="NONE"]').textContent).toContain("Nenhuma atividade.");

    const form = screen.getByRole("button", { name: "Adicionar requisito" }).closest("form")!;
    fireEvent.change(within(form).getByLabelText("Novo requisito"), { target: { value: "Exportar indicadores do comitê" } });
    fireEvent.change(within(form).getByLabelText("Origem (necessidade de negócio)"), { target: { value: "Prestação de contas" } });
    fireEvent.click(within(form).getByRole("button", { name: "Adicionar requisito" }));
    const added = h.state.model.requirements.at(-1)!;
    expect(added).toMatchObject({ code: "RF-04", text: "Exportar indicadores do comitê", origin: "Prestação de contas", deliverableIds: [] });
    expect(el(document, '[data-diagnostic="untraced"]').textContent).toContain("RF-04");
    expect((within(form).getByLabelText("Novo requisito") as HTMLInputElement).value).toBe("");
  });

  it("recusa do comando (nome vazio): o modelo não muda, o campo volta e o painel avisa sem quebrar", () => {
    const h = renderPanel(ScopePanel);
    const before = h.state.model;
    const input = screen.getByRole("textbox", { name: "Nome da entrega 1.1" }) as HTMLInputElement;
    commit(input, "   ");
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "TEXTO_VAZIO" });
    expect(h.state.model).toBe(before);
    expect(screen.getByRole("alert").textContent).toContain("Escreva um texto antes de salvar.");
    expect(input.value).toBe("Matriz de critérios e protótipo");
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: /^1\.1 Matriz/ })).toBeTruthy();
  });

  it("projeto sem EAP, requisitos nem atividades: estados vazios sem quebrar, e a raiz da EAP nasce pelo formulário", () => {
    const empty = { ...buildDemoProject(), wbs: [], requirements: [], tasks: [], dependencies: [], raci: [], baseline: undefined };
    const h = renderPanel(ScopePanel, { model: empty });
    expect(el(document, '[data-metric="Q_EAP_100"]').dataset.status).toBe("SEM_DADOS");
    expect(el(document, "[data-orphans]").textContent).toContain("Todas as atividades estão em pacotes de trabalho.");
    expect(el(document, '[data-moscow="MUST"]').textContent).toContain("Nenhuma atividade.");
    fireEvent.change(screen.getByLabelText("Raiz da EAP (o produto do projeto)"), { target: { value: "Plataforma DECIA v1.0" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(h.state.model.wbs).toEqual([expect.objectContaining({ title: "Plataforma DECIA v1.0", parentId: undefined })]);
    expect(screen.getByRole("button", { name: "Plataforma DECIA v1.0 — dicionário da EAP" })).toBeTruthy();
  });

  it("readOnly: nenhum controle de edição ativo e nada é despachado (selecionar continua possível)", () => {
    const h = renderPanel(ScopePanel, { readOnly: true });
    expect(screen.getByText(/Somente leitura/)).toBeTruthy();
    for (const role of ["textbox", "combobox", "checkbox"] as const) {
      const controls = screen.queryAllByRole(role);
      expect(controls.length).toBeGreaterThan(0);
      expect(controls.every((c) => (c as HTMLInputElement).disabled)).toBe(true);
    }
    expect(screen.queryByRole("button", { name: /Adicionar|Remover|\+ Subentrega|Usar a soma/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^1\.2 Registro e snapshot/ }));
    expect(h.selections).toEqual(["WBS:w12"]);
    expect(h.commands).toEqual([]);
  });
});
