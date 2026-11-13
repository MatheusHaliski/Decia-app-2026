// @vitest-environment jsdom
/**
 * Tela do Espelho de Conformidade (RF32): placar por fonte e por fase, item a item com o porquê, "sugerir tarefa" com prévia pelo
 * comando existente da Mesa (uma ou em lote), "não se aplica" com justificativa, o chefe revisor (lê, edita o checklist do
 * departamento, libera a Aprovação com justificativa) e a página com o perfil de visualização.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useCallback, useReducer } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { applyCommand, type ProjectCommand } from "@/lib/projects/commands";
import { createMemoryComplianceRepository, setDemoComplianceRepository, type ComplianceRepository } from "@/lib/projects/compliance/store";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { createMemoryProjectRepository, setDemoProjectRepository } from "@/lib/projects/repository";
import type { ProjectModel } from "@/lib/projects/types";
import { renderWithProviders } from "@/test-utils/render";
import { MirrorClient } from "@/app/(shell)/projects/[id]/mirror/MirrorClient";
import { MirrorView } from "./MirrorView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/projects/decia-v1/mirror",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "decia-v1" }),
}));

const NOW = new Date("2026-11-12T12:00:00Z");

function mount(opts: { chief?: boolean; repo?: ComplianceRepository } = {}) {
  const state = { model: buildDemoProject() as ProjectModel };
  const commands: ProjectCommand[] = [];
  const repo = opts.repo ?? createMemoryComplianceRepository();
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
      <MirrorView
        model={state.model}
        dispatch={dispatch}
        people={DEMO_PEOPLE}
        actorId={opts.chief ? "u-chefe" : "u-pessoa"}
        canEditProject={!opts.chief}
        canEditChecklist={Boolean(opts.chief)}
        canOverride={Boolean(opts.chief)}
        repo={repo}
      />
    );
  }
  return { ...renderWithProviders(<Harness />), state, commands, repo };
}

const item = (code: string) => document.querySelector<HTMLElement>(`[data-item="${code}"]`)!;

describe("Espelho de Conformidade", () => {
  afterEach(() => {
    setDemoProjectRepository(null);
    setDemoComplianceRepository(null);
  });

  it("placar geral, por fonte e por fase; aviso de vigência e exemplos marcados", () => {
    mount();
    expect(screen.getByRole("progressbar", { name: "Atendidos: 4 de 20 itens que se aplicam" }).getAttribute("aria-valuenow")).toBe("20");
    expect(screen.getByText("Obrigatórios faltando: 8")).toBeTruthy();
    expect(screen.getByRole("note").textContent).toMatch(/confira a vigência/);
    const federal = document.querySelector<HTMLElement>('[data-source="FEDERAL"]')!;
    expect(within(federal).getByRole("progressbar").getAttribute("aria-label")).toMatch(/3 de 13/);
    expect(document.querySelector('[data-source="ESTADUAL"]')!.textContent).toMatch(/exemplo/);
    const byPhase = document.querySelector<HTMLElement>("[data-by-phase]")!;
    expect(within(byPhase).getByText("Placar por fase do projeto")).toBeTruthy();
    expect(byPhase.querySelector('[data-phase-row="ELABORACAO"]')!.textContent).toMatch(/fase atual/);
  });

  it("item a item: atendido mostra o que atende; faltando, parcial e não se aplica dizem o porquê", () => {
    mount();
    expect(item("LGPD-BASE").getAttribute("data-status")).toBe("ATENDIDO");
    expect(item("LGPD-BASE").textContent).toMatch(/Atendido por: atividade T04 “Análise de riscos e LGPD” \(Análise · Diego Exemplo\)/);
    expect(item("LGPD-BASE").textContent).toMatch(/Lei 13\.709\/2018, art\. 7º/);
    expect(item("14133-ETP").textContent).toMatch(/Faltando.*Obrigatório/);
    expect(item("14133-ETP").textContent).toMatch(/Nada no projeto trata disso/);
    expect(item("LGPD-SEG").textContent).toMatch(/Aparece em requisito RF-03 “Entrar com o login institucional”, mas nenhuma atividade o executa/);
    expect(item("LGPD-RIPD").textContent).toMatch(/Não se aplica: o projeto não tem dado pessoal sensível/);
    expect(item("UF-PDTIC").textContent).toMatch(/A meta ND-07 \(PDTIC\) está cadastrada/);
    expect(within(item("UF-PDTIC")).getByRole("link", { name: "Corrigir em Governança" }).getAttribute("href")).toBe("/projects/decia-v1/edit?aba=governanca");
  });

  it("sugerir tarefa: prévia antes, cria pelo comando de inclusão de atividade na fase certa e o item passa a atendido", async () => {
    const h = mount();
    fireEvent.click(within(item("14133-ETP")).getByRole("button", { name: "Sugerir tarefa" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/linha de base/)).toBeTruthy();
    expect(within(dialog).getByDisplayValue("Elaborar o estudo técnico preliminar (ETP) da contratação")).toBeTruthy();
    expect(within(dialog).getByText("Fase Elaboração · 3 d")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar as tarefas (1)" }));
    await waitFor(() => expect(h.commands[0]).toEqual({ type: "TASK_CREATE", title: "Elaborar o estudo técnico preliminar (ETP) da contratação [14133-ETP]", phase: "ELABORACAO", durationDays: 3 }));
    expect(h.commands[1]).toMatchObject({ type: "TASK_UPDATE", patch: { responsibleId: "u-pessoa" } });
    const created = h.state.model.tasks.find((t) => t.title.endsWith("[14133-ETP]"))!;
    expect(created).toMatchObject({ code: "T09", phase: "ELABORACAO", responsibleId: "u-pessoa" });
    expect(h.repo.project("decia-v1").links).toEqual([expect.objectContaining({ taskId: created.id, itemId: "L14133_ETP" })]);
    await waitFor(() => expect(item("14133-ETP").getAttribute("data-status")).toBe("ATENDIDO"));
    expect(item("14133-ETP").textContent).toMatch(/criada pelo Espelho/);
  });

  it("em lote: todas as faltantes de uma vez, com a opção de desmarcar", async () => {
    const h = mount();
    // 9 faltando + 3 só mencionados (requisito, EAP) que uma atividade resolve
    fireEvent.click(screen.getByRole("button", { name: "Sugerir as tarefas faltantes (12)" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelectorAll("[data-suggest-item]")).toHaveLength(12);
    fireEvent.click(within(dialog.querySelector<HTMLElement>('[data-suggest-item="LGPD-DPO"]')!).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar as tarefas (11)" }));
    await waitFor(() => expect(h.commands.filter((c) => c.type === "TASK_CREATE")).toHaveLength(11));
    expect(h.state.model.tasks.some((t) => t.title.includes("[LGPD-DPO]"))).toBe(false);
    await waitFor(() => expect(screen.getByText("Obrigatórios faltando: 1")).toBeTruthy()); // sobra o portão no DECIA (DEP-2)
  });

  it("não se aplica exige justificativa e tira o item do bloqueio", async () => {
    mount();
    fireEvent.click(within(item("14133-JURIDICO")).getByRole("button", { name: "Marcar como não se aplica" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Item obrigatório/)).toBeTruthy();
    const confirm = within(dialog).getByRole("button", { name: "Marcar como não se aplica" });
    fireEvent.change(within(dialog).getByLabelText("Justificativa"), { target: { value: "curto" } });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("Justificativa"), { target: { value: "Parecer referencial da procuradoria já cobre esta contratação" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(item("14133-JURIDICO").getAttribute("data-status")).toBe("NAO_SE_APLICA"));
    expect(item("14133-JURIDICO").textContent).toMatch(/Marcado como não se aplica por Pessoa Exemplo .*Parecer referencial/);
    expect(screen.getByText("Obrigatórios faltando: 7")).toBeTruthy();
  });

  it("chefe revisor: só lê o projeto, edita o checklist do departamento e libera a Aprovação com justificativa", async () => {
    const h = mount({ chief: true });
    expect(screen.getByRole("status").textContent).toMatch(/chefe revisor/);
    expect(screen.queryByRole("button", { name: "Sugerir tarefa" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sugerir as tarefas faltantes/ })).toBeNull();
    // novo item do departamento
    fireEvent.click(screen.getByRole("button", { name: "Novo item" }));
    const form = document.querySelector<HTMLElement>("[data-dept-form]")!;
    fireEvent.change(within(form).getByLabelText("Item"), { target: { value: "Plano de capacitação da equipe" } });
    fireEvent.change(within(form).getByLabelText("Palavras-chave"), { target: { value: "capacitação da equipe, plano de capacitação" } });
    fireEvent.change(within(form).getByLabelText("Tarefa sugerida quando faltar"), { target: { value: "Planejar a capacitação da equipe" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(item("DEP-5").getAttribute("data-status")).toBe("FALTANDO"));
    expect(h.repo.department().version).toBe("2");
    // portão da Aprovação
    const gate = document.querySelector<HTMLElement>("[data-gate]")!;
    expect(gate.getAttribute("data-gate")).toBe("BLOQUEADO");
    fireEvent.change(within(gate).getByLabelText("Justificativa do chefe"), { target: { value: "Contratação por adesão a ata: ETP, TR e parecer são do órgão gerenciador." } });
    fireEvent.click(within(gate).getByRole("button", { name: "Liberar com justificativa" }));
    await waitFor(() => expect(document.querySelector("[data-gate]")!.getAttribute("data-gate")).toBe("LIBERADO_COM_JUSTIFICATIVA"));
    expect(h.repo.project("decia-v1").override).toMatchObject({ by: "u-chefe", blockingCodes: expect.arrayContaining(["14133-ETP", "DEP-2"]) });
  });
});

describe("página /projects/[id]/mirror", () => {
  afterEach(() => {
    setDemoProjectRepository(null);
    setDemoComplianceRepository(null);
  });

  it("empregado abre o Espelho do projeto DEMO e pode sugerir tarefas", async () => {
    setDemoProjectRepository(createMemoryProjectRepository([buildDemoProject()]));
    setDemoComplianceRepository(createMemoryComplianceRepository());
    renderWithProviders(<MirrorClient projectId="decia-v1" />);
    expect(await screen.findByRole("heading", { level: 1, name: /Espelho de Conformidade/ })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Sugerir tarefa" }).length).toBeGreaterThan(0);
  });

  it("chefe abre como revisor (RF32.CA06): sem criar tarefas, com o checklist do departamento editável", async () => {
    setDemoProjectRepository(createMemoryProjectRepository([buildDemoProject()]));
    setDemoComplianceRepository(createMemoryComplianceRepository());
    renderWithProviders(<MirrorClient projectId="decia-v1" />, { profile: "CHEFE" });
    expect(await screen.findByText(/Você está como chefe revisor/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sugerir tarefa" })).toBeNull();
    expect(screen.getByRole("button", { name: "Novo item" })).toBeTruthy();
  });
});
