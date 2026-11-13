/**
 * Harness dos painéis da Mesa de Trabalho: renderiza um painel com o projeto DEMO e um `dispatch` real (applyCommand), de modo
 * que o teste exercita o fluxo completo comando → modelo → nova renderização. `state.model` sempre tem o modelo atual.
 */
import { useCallback, useReducer, type ComponentType } from "react";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { applyCommand, type CommandResult, type ProjectCommand } from "@/lib/projects/commands";
import { buildDemoProject } from "@/lib/projects/fixtures";
import type { WorkspaceTab } from "@/lib/projects/metrics";
import type { CanvasRef, ProjectModel } from "@/lib/projects/types";
import type { DeciaActions, PanelProps } from "@/components/projects/shared";
import { renderWithProviders } from "./render";

export const PANEL_NOW = new Date("2026-11-10T12:00:00Z");

export interface PanelHarnessOptions {
  model?: ProjectModel;
  readOnly?: boolean;
  actorId?: string;
  selected?: CanvasRef | null;
}

export interface PanelHarness {
  state: { model: ProjectModel };
  commands: ProjectCommand[];
  results: CommandResult[];
  visited: WorkspaceTab[];
  selections: (CanvasRef | null)[];
  deciaCalls: { kind: "gate" | "change" | "selection"; arg?: string }[];
}

export function deciaStub(calls: PanelHarness["deciaCalls"]): DeciaActions {
  return {
    openGate: (phase) => calls.push({ kind: "gate", arg: phase }),
    openChange: (id) => calls.push({ kind: "change", arg: id }),
    openSelection: () => calls.push({ kind: "selection" }),
    decisionHref: (id) => `/decia/decisoes/${id}`,
    decisionStatus: () => undefined,
  };
}

/** Renderiza `Panel` com o projeto DEMO (ou `opts.model`) e devolve o estado vivo + o que o painel pediu. */
export function renderPanel(Panel: ComponentType<PanelProps>, opts: PanelHarnessOptions = {}) {
  const h: PanelHarness = { state: { model: opts.model ?? buildDemoProject() }, commands: [], results: [], visited: [], selections: [], deciaCalls: [] };
  const decia = deciaStub(h.deciaCalls);
  function Harness() {
    const [, rerender] = useReducer((x: number) => x + 1, 0);
    const dispatch = useCallback((cmd: ProjectCommand) => {
      h.commands.push(cmd);
      const r = applyCommand(h.state.model, cmd, { actorId: opts.actorId ?? "u-pessoa", now: PANEL_NOW });
      h.results.push(r);
      if (r.ok && r.model !== h.state.model) {
        h.state.model = r.model;
        rerender();
      }
      return r;
    }, []);
    return (
      <Panel
        model={h.state.model}
        dispatch={dispatch}
        people={DEMO_PEOPLE}
        readOnly={opts.readOnly ?? false}
        goTo={(tab) => h.visited.push(tab)}
        selected={opts.selected ?? null}
        onSelect={(ref) => h.selections.push(ref)}
        decia={decia}
      />
    );
  }
  return { ...renderWithProviders(<Harness />), ...h };
}
