// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeMetrics } from "@/lib/projects/metrics";
import { buildDemoProject } from "@/lib/projects/fixtures";
import type { ProjectModel } from "@/lib/projects/types";
import type { PanelProps } from "@/components/projects/shared";
import { renderPanel } from "@/test-utils/projects";
import { ClosurePanel } from "./ClosurePanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/decia-v1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

const governance = (model: ProjectModel, id: string) => computeMetrics(model).governance.find((m) => m.id === id)!;
const enabledFields = () => document.querySelectorAll("input:not([disabled]):not([aria-hidden='true']), select:not([disabled]), textarea:not([disabled])");
const commit = (el: HTMLElement, v: string) => {
  fireEvent.change(el, { target: { value: v } });
  fireEvent.blur(el);
};
const archivedDemo = (): ProjectModel => {
  const p = buildDemoProject();
  return { ...p, closure: { ...p.closure, archived: true } };
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("ClosurePanel — encerramento e transição para a operação (RF22)", () => {
  it("renderiza o DEMO: OLA = SLA aparece como problema, indicadores da aba, portão e relatório final do modelo", () => {
    const { container } = renderPanel(ClosurePanel);
    // indicadores com tab "encerramento"
    expect(container.querySelector('[data-metric="G_ACORDOS_SERVICO"]')!.getAttribute("data-status")).toBe("CRITICO");
    expect(container.querySelector('[data-metric="Q_LICOES"]')!.textContent).toContain("Registradas em 1 de 3 fases");
    expect(container.querySelector('[data-metric="Q_IDC"]')).toBeNull();

    // erro plantado: OLA (4 h) tão frouxo quanto o SLA (4 h); o UC (2 h) está certo
    expect(screen.getByText(/OLA de 4 h não é mais rígido que o SLA de 4 h/)).toBeTruthy();
    expect(container.querySelector('[data-agreement="ola"]')!.getAttribute("data-state")).toBe("bad");
    expect(container.querySelector('[data-agreement="uc"]')!.getAttribute("data-state")).toBe("good");
    expect(container.querySelector('[data-agreement="sla"]')!.textContent).toContain("referência");

    // portão: critérios avaliados pelo sistema; revisão no DECIA só na fase de Encerramento
    expect(screen.getByText("0 de 6 critérios de saída atendidos")).toBeTruthy();
    expect(screen.getByText("Aceite formal das entregas", { selector: "span.min-w-0" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Revisão final no DECIA" })).toBeNull();
    expect(screen.getByText("A revisão final no DECIA fica disponível quando o projeto chegar à fase de Encerramento (fase atual: Elaboração).")).toBeTruthy();

    // relatório final montado do modelo (timelineView, evmView, traceabilityView, mudanças, riscos, lições)
    const report = screen.getByRole("article", { name: "Relatório final — Plataforma DECIA v1.0" });
    const text = report.textContent!;
    expect(text).toMatch(/Término calculado: 14 dias \(16 de nov\.?\) · linha de base: 14 dias/);
    expect(text).toMatch(/CR R\$\s17\.900 · ONT R\$\s50\.000 · ENT R\$\s55\.935/);
    expect(text).toContain("IDC 0,89 (acima do orçamento) · IDP 0,55 (atrasado)");
    expect(text).toContain("Requisitos completos (origem, entrega e teste): 1 de 3");
    expect(text).toContain("Mudanças: 0 aprovada(s) aguardando implementação · 0 implementada(s) · 0 rejeitada(s) · 1 em aberto");
    expect(text).toContain("0 ocorreram · 0 mitigados · 3 abertos · 0 encerrados");
    expect(text).toContain("Demanda · Funcionou: Envolver o controle interno já no termo de abertura evitou retrabalho");
  });

  it("corrigir a OLA: o serviço é mesclado (não perde SLA/UC/flags) e o problema some", () => {
    const h = renderPanel(ClosurePanel);
    commit(screen.getByLabelText("OLA · equipe interna"), "2");
    expect(h.state.model.closure.service).toEqual({ slaHours: 4, olaHours: 2, ucHours: 2, catalogEntry: false, knowledgeBase: false, cmdbUpdated: false });
    expect(screen.queryByText(/OLA de 4 h não é mais rígido/)).toBeNull();
    expect(screen.getByText("OLA e UC mais rígidos que o SLA: os acordos se sustentam.")).toBeTruthy();
    expect(governance(h.state.model, "G_ACORDOS_SERVICO").status).toBe("OK");
    expect(document.querySelector('[data-metric="G_ACORDOS_SERVICO"]')!.getAttribute("data-status")).toBe("OK");

    fireEvent.click(screen.getByRole("checkbox", { name: /Entrada no catálogo de serviços/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /CMDB atualizada/ }));
    expect(h.state.model.closure.service).toMatchObject({ olaHours: 2, catalogEntry: true, cmdbUpdated: true, knowledgeBase: false });

    // UC mais frouxo que o SLA também é pego
    commit(screen.getByLabelText("UC · fornecedor"), "6");
    expect(screen.getByText(/Contrato de apoio \(UC\) de 6 h não é mais rígido que o SLA de 4 h/)).toBeTruthy();
  });

  it("encerramento formal: aceite e motivo do cancelamento; arquivar pede confirmação, deixa somente leitura e reabrir volta", () => {
    const h = renderPanel(ClosurePanel);
    fireEvent.click(screen.getByRole("checkbox", { name: /Aceite formal das entregas/ }));
    expect(h.state.model.closure.acceptance).toBe(true);
    expect(screen.getByRole("progressbar", { name: "1 de 4 passos do encerramento formal" })).toBeTruthy();

    commit(screen.getByLabelText("Motivo do cancelamento"), "Prioridade revista no PDTIC");
    expect(h.state.model.closure.cancelledReason).toBe("Prioridade revista no PDTIC");
    expect(screen.getByText("Cancelado")).toBeTruthy();
    expect(screen.getByText("Projeto cancelado: a transição para a operação deixa de ser critério do portão, mas registre o que já estiver em produção.")).toBeTruthy();

    // arquivar: confirmação com os critérios do portão que ainda faltam
    fireEvent.click(screen.getByRole("button", { name: "Arquivar projeto" }));
    const dialog = screen.getByRole("dialog", { name: "Arquivar o projeto?" });
    expect(within(dialog).getByText("Contratos e aquisições encerrados")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Arquivar" }));
    expect(h.state.model.closure.archived).toBe(true);
    expect(h.state.model.versions.at(-1)!.key).toBe("closureUpdated");

    // somente leitura (RF22.CA06): nada editável além de reabrir
    expect(screen.getAllByText("Projeto arquivado: somente leitura (RF22.CA06). Nenhuma alteração estrutural é aceita até reabrir.").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Arquivar projeto" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Registrar lição" })).toBeNull();
    expect((screen.getByRole("checkbox", { name: /Recursos liberados/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(enabledFields()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Reabrir projeto" }));
    expect(h.state.model.closure.archived).toBe(false);
    expect(screen.getByRole("button", { name: "Arquivar projeto" })).toBeTruthy();
    // apagar o motivo desfaz o cancelamento
    commit(screen.getByLabelText("Motivo do cancelamento"), "  ");
    expect(h.state.model.closure.cancelledReason).toBeUndefined();
  });

  it("lições aprendidas: lista completa por fase e tipo, e registro de nova lição", () => {
    const h = renderPanel(ClosurePanel);
    const demanda = document.querySelector('[data-lesson-phase="DEMANDA"]') as HTMLElement;
    expect(within(demanda).getByText(/Funcionou/).textContent).toContain("(1)");
    expect(within(demanda).getByText(/Não funcionou/).textContent).toContain("(0)");

    const form = within(screen.getByRole("button", { name: "Registrar lição" }).closest("form")!);
    fireEvent.change(form.getByLabelText("Lição aprendida"), { target: { value: "Protótipo sem validação do comitê gerou retrabalho" } });
    fireEvent.change(form.getByLabelText("Tipo"), { target: { value: "NEGATIVA" } });
    fireEvent.click(form.getByRole("button", { name: "Registrar lição" }));
    expect(h.state.model.lessons.at(-1)).toMatchObject({ phase: "ELABORACAO", kind: "NEGATIVA" });
    const elaboracao = document.querySelector('[data-lesson-phase="ELABORACAO"]') as HTMLElement;
    expect(within(elaboracao).getByText("Protótipo sem validação do comitê gerou retrabalho")).toBeTruthy();
    expect(screen.getByRole("article", { name: /Relatório final/ }).textContent).toContain("2 lição(ões): 1 que funcionaram e 1 que não funcionaram, em 2 fase(s)");
    expect(document.querySelector('[data-metric="Q_LICOES"]')!.textContent).toContain("Registradas em 2 de 3 fases");
  });

  it("portão do Encerramento: na fase de Encerramento abre a revisão final no DECIA", () => {
    const h = renderPanel(ClosurePanel, { model: { ...buildDemoProject(), currentPhase: "ENCERRAMENTO" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisão final no DECIA" }));
    expect(h.deciaCalls).toEqual([{ kind: "gate", arg: "ENCERRAMENTO" }]);
    expect(h.commands).toEqual([]);
  });

  it("copiar relatório: usa a área de transferência quando existe e orienta quando não existe (jsdom)", async () => {
    renderPanel(ClosurePanel);
    fireEvent.click(screen.getByRole("button", { name: "Copiar relatório" }));
    expect(await screen.findByText("Não foi possível copiar: selecione o texto do relatório e copie manualmente.")).toBeTruthy();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "Copiar relatório" }));
    expect(await screen.findByText("Relatório copiado para a área de transferência.")).toBeTruthy();
    const copied = writeText.mock.calls[0]![0] as string;
    expect(copied.split("\n")[0]).toBe("Relatório final — Plataforma DECIA v1.0");
    expect(copied).toContain("\nPrazo\n- Término calculado: 14 dias");
    expect(copied).toContain("\nEncerramento\n- Aceite formal: não");
  });

  it("recusa sem quebrar: lição vazia mostra o erro do núcleo e não muda o modelo", () => {
    const h = renderPanel(ClosurePanel);
    fireEvent.change(screen.getByLabelText("Lição aprendida"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar lição" }));
    expect(h.results.at(-1)).toMatchObject({ ok: false, error: "TEXTO_VAZIO" });
    expect(h.state.model.lessons).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toBe("Escreva um texto antes de salvar.");
    // o painel segue funcionando
    fireEvent.click(screen.getByRole("checkbox", { name: /Contratos encerrados/ }));
    expect(h.state.model.closure.contractsClosed).toBe(true);
  });

  it("readOnly: nada editável nem despachado; o relatório continua copiável; reabrir exige permissão (canReopen)", async () => {
    const h = renderPanel(ClosurePanel, { readOnly: true });
    expect(screen.getByText("Somente leitura: projeto arquivado ou perfil sem permissão de edição.")).toBeTruthy();
    expect(enabledFields()).toHaveLength(0);
    expect(screen.getAllByRole("checkbox").every((c) => (c as HTMLButtonElement).disabled)).toBe(true);
    for (const name of ["Arquivar projeto", "Registrar lição", "Reabrir projeto"]) expect(screen.queryByRole("button", { name })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Aceite formal das entregas/ }));
    fireEvent.click(screen.getByRole("button", { name: "Copiar relatório" }));
    expect(await screen.findByText(/Não foi possível copiar/)).toBeTruthy();
    expect(h.commands).toEqual([]);
    h.unmount();

    // a área de trabalho pode manter readOnly por causa do arquivamento e liberar só o "reabrir" para quem edita
    const Reopenable = (p: PanelProps) => <ClosurePanel {...p} canReopen />;
    const r = renderPanel(Reopenable, { model: archivedDemo(), readOnly: true });
    expect(enabledFields()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Reabrir projeto" }));
    expect(r.commands).toEqual([{ type: "CLOSURE_UPDATE", patch: { archived: false } }]);
    expect(r.state.model.closure.archived).toBe(false);
  });
});
