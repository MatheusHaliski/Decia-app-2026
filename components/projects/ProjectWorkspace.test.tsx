// @vitest-environment jsdom
/**
 * Área de trabalho com janela segmentada: a metade da direita (feedback ou outra aba) reflete na hora o que se edita à esquerda;
 * "corrigir em…" troca a aba da esquerda; erro de comando vira aviso.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { useCallback, useReducer } from "react";
import { describe, expect, it, vi } from "vitest";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { applyCommand, type ProjectCommand } from "@/lib/projects/commands";
import { buildDemoProject } from "@/lib/projects/fixtures";
import type { ProjectModel } from "@/lib/projects/types";
import { deciaStub, PANEL_NOW } from "@/test-utils/projects";
import { renderWithProviders } from "@/test-utils/render";
import { ProjectWorkspace, type PaneView } from "./ProjectWorkspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/decia-v1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

function mount(opts: { pane?: PaneView | null; readOnly?: boolean; dispatch?: (cmd: ProjectCommand) => ReturnType<typeof applyCommand> } = {}) {
  const state = { model: buildDemoProject() as ProjectModel };
  const views: [string, PaneView | null][] = [];
  function Harness() {
    const [, rerender] = useReducer((x: number) => x + 1, 0);
    const dispatch = useCallback((cmd: ProjectCommand) => {
      const r = applyCommand(state.model, cmd, { actorId: "u-carla", now: PANEL_NOW });
      if (r.ok && r.model !== state.model) {
        state.model = r.model;
        rerender();
      }
      return r;
    }, []);
    return (
      <ProjectWorkspace
        model={state.model}
        dispatch={opts.dispatch ?? dispatch}
        people={DEMO_PEOPLE}
        readOnly={opts.readOnly ?? false}
        decia={deciaStub([])}
        initialPane={opts.pane === undefined ? "feedback" : opts.pane}
        onViewChange={(tab, pane) => views.push([tab, pane])}
      />
    );
  }
  return { ...renderWithProviders(<Harness />), state, views };
}

const left = () => document.querySelector<HTMLElement>('[data-pane="left"]')!;
const right = () => document.querySelector<HTMLElement>('[data-pane="right"]');

describe("Mesa de Trabalho com janela segmentada", () => {
  it("abre com o quadro à esquerda e o feedback da IA à direita, com divisória operável por teclado", () => {
    mount();
    expect(left().querySelectorAll("[data-column]").length).toBe(7);
    expect(within(right()!).getByText("Feedback sobre o trabalho do grupo")).toBeTruthy();
    const sep = screen.getByRole("separator");
    const before = Number(sep.getAttribute("aria-valuenow"));
    fireEvent.keyDown(sep, { key: "ArrowLeft" });
    expect(Number(sep.getAttribute("aria-valuenow"))).toBe(before - 5);
  });

  it("editar à esquerda atualiza a direita na hora: atividade sem responsável aparece em 'o que mudou'", () => {
    const h = mount();
    expect(within(right()!).getByText("Edite o projeto em qualquer aba e o efeito aparece aqui.")).toBeTruthy();
    const exec = left().querySelector<HTMLElement>('[data-column="EXECUCAO"]')!;
    fireEvent.change(within(exec).getByLabelText("Nova atividade em Execução"), { target: { value: "Migrar dados legados" } });
    fireEvent.click(within(exec).getByRole("button", { name: "Adicionar" }));
    expect(h.state.model.version).toBe(5);
    const change = right()!.querySelector<HTMLElement>('[data-change="W_SEM_RESPONSAVEL"]')!;
    expect(change.textContent).toMatch(/piorou/);
    // cabeçalho mostra a última alteração com o autor
    expect(screen.getByText(/Última alteração: Atividade T09 criada: Migrar dados legados — Carla Exemplo/)).toBeTruthy();
  });

  it("'corrigir em…' no feedback troca a aba da esquerda e mantém o feedback ao lado", () => {
    const h = mount();
    // a primeira prioridade que leva a outra aba (a do quadro já está aberta à esquerda)
    const button = [...right()!.querySelectorAll<HTMLElement>("[data-priority] button")].find((b) => /^Corrigir em /.test(b.textContent ?? "") && !/Quadro por fases/.test(b.textContent ?? ""))!;
    fireEvent.click(button);
    const [tab, pane] = h.views.at(-1)!;
    expect(pane).toBe("feedback");
    expect(tab).not.toBe("quadro");
    expect(screen.getByRole("tab", { name: tabLabel(tab) }).getAttribute("aria-selected")).toBe("true");
    expect(within(right()!).getByText("Feedback sobre o trabalho do grupo")).toBeTruthy();
  });

  it("a metade direita pode mostrar outra aba; fechar a janela segmentada deixa só a esquerda", () => {
    const h = mount();
    fireEvent.change(screen.getByLabelText("O que mostrar ao lado"), { target: { value: "cronograma" } });
    expect(right()!.querySelectorAll("[data-row]").length).toBe(8);
    expect(h.views.at(-1)).toEqual(["quadro", "cronograma"]);
    fireEvent.click(screen.getByRole("button", { name: /Fechar janela segmentada/ }));
    expect(right()).toBeNull();
    expect(h.views.at(-1)).toEqual(["quadro", null]);
  });

  it("comando recusado vira aviso (toast) com a mensagem do erro", () => {
    mount({ dispatch: () => ({ ok: false, error: "PROJETO_BLOQUEADO" }) });
    const exec = left().querySelector<HTMLElement>('[data-column="EXECUCAO"]')!;
    fireEvent.change(within(exec).getByLabelText("Nova atividade em Execução"), { target: { value: "Qualquer" } });
    fireEvent.click(within(exec).getByRole("button", { name: "Adicionar" }));
    expect(screen.getByText("Projeto arquivado: reabra para editar.")).toBeTruthy();
  });

  it("somente leitura mostra o aviso e esconde a edição nas duas metades", () => {
    mount({ readOnly: true });
    expect(screen.getByText(/Somente leitura/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Adicionar" })).toBeNull();
  });
});

const LABELS: Record<string, string> = {
  quadro: "Quadro por fases", canvas: "Canvas", cronograma: "Linha do tempo", iniciacao: "Iniciação", escopo: "Escopo",
  riscos: "Riscos e equipe", controle: "Controle", governanca: "Governança", encerramento: "Encerramento",
};
const tabLabel = (tab: string) => LABELS[tab]!;
