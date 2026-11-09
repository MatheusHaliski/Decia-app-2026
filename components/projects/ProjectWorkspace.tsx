"use client";
/**
 * Mesa de Trabalho do projeto (RF22): um único modelo, várias projeções. As abas seguem a disciplina (quadro por fases,
 * canvas conectado, linha do tempo, iniciação, escopo, riscos e equipe, controle, governança, encerramento) e a JANELA
 * SEGMENTADA põe, ao lado de qualquer aba, outra visão do mesmo projeto — por padrão o "Feedback da IA" com os indicadores de
 * qualidade, governança e trabalho em grupo. Editar à esquerda atualiza a direita na hora (e vice-versa); "abrir onde
 * corrigir" no feedback troca a aba da esquerda; selecionar um item destaca o mesmo item na outra metade.
 */
import { useCallback, useMemo, useState, type ComponentType } from "react";
import { Badge, Button, Select, Tabs, Tag, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { CommandResult, ProjectCommand } from "@/lib/projects/commands";
import { digest } from "@/lib/projects/feedback";
import { computeMetrics, type LinkedDecision, type ProjectMetrics, type WorkspaceTab } from "@/lib/projects/metrics";
import type { CanvasRef, ProjectModel } from "@/lib/projects/types";
import { versionSummary } from "./common";
import { FeedbackPanel } from "./FeedbackPanel";
import { ClosurePanel } from "./panels/ClosurePanel";
import { ControlPanel } from "./panels/ControlPanel";
import { GovernancePanel } from "./panels/GovernancePanel";
import { InitiationPanel } from "./panels/InitiationPanel";
import { RisksTeamPanel } from "./panels/RisksTeamPanel";
import { ScopePanel } from "./panels/ScopePanel";
import { PhaseBoard } from "./PhaseBoard";
import { ProjectCanvas } from "./ProjectCanvas";
import { nameOf, type DeciaActions, type PanelProps, type PeopleDirectory } from "./shared";
import { SplitView } from "./SplitView";
import { Timeline } from "./Timeline";

export const WORKSPACE_TABS: readonly WorkspaceTab[] = ["quadro", "canvas", "cronograma", "iniciacao", "escopo", "riscos", "controle", "governanca", "encerramento"];
/** O que a metade direita da janela segmentada pode mostrar. */
export type PaneView = WorkspaceTab | "feedback";
export const PANE_VIEWS: readonly PaneView[] = ["feedback", ...WORKSPACE_TABS];

const TAB_PANELS: Record<WorkspaceTab, ComponentType<PanelProps>> = {
  quadro: PhaseBoard,
  canvas: ProjectCanvas,
  cronograma: Timeline,
  iniciacao: InitiationPanel,
  escopo: ScopePanel,
  riscos: RisksTeamPanel,
  controle: ControlPanel,
  governanca: GovernancePanel,
  encerramento: ClosurePanel,
};

const NO_DECISIONS: readonly LinkedDecision[] = [];

export const isWorkspaceTab = (v: string | null | undefined): v is WorkspaceTab => (WORKSPACE_TABS as readonly string[]).includes(v ?? "");
export const isPaneView = (v: string | null | undefined): v is PaneView => (PANE_VIEWS as readonly string[]).includes(v ?? "");

export interface ProjectWorkspaceProps {
  model: ProjectModel;
  dispatch: (cmd: ProjectCommand) => CommandResult;
  people: PeopleDirectory;
  readOnly: boolean;
  /** o perfil pode editar (mesmo com o projeto arquivado): libera "Reabrir" no Encerramento (RF22.CA06) */
  canEdit?: boolean;
  decia?: DeciaActions;
  /** decisões do DECIA (para a participação nas decisões ligadas ao projeto) */
  decisions?: readonly LinkedDecision[];
  /** origem dos dados ("DEMO" até existir a API de projetos) */
  source?: "DEMO" | "API";
  initialTab?: WorkspaceTab;
  /** metade direita aberta ao entrar (`null` = janela inteira) */
  initialPane?: PaneView | null;
  onViewChange?: (tab: WorkspaceTab, pane: PaneView | null) => void;
}

export function ProjectWorkspace({ model, dispatch, people, readOnly, canEdit = !readOnly, decia, decisions = NO_DECISIONS, source = "DEMO", initialTab = "quadro", initialPane = "feedback", onViewChange }: ProjectWorkspaceProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [pane, setPane] = useState<PaneView | null>(initialPane);
  const [selected, setSelected] = useState<CanvasRef | null>(null);

  // indicadores calculados uma vez por versão; o histórico guarda a versão anterior e o início da sessão ("o que mudou")
  const metrics = useMemo(() => computeMetrics(model, decisions), [model, decisions]);
  const [history, setHistory] = useState<{ version: number; metrics: ProjectMetrics }[]>(() => [{ version: model.version, metrics }]);
  const lastEntry = history[history.length - 1];
  if (lastEntry && (lastEntry.version !== model.version || lastEntry.metrics !== metrics)) {
    setHistory((h) => {
      const top = h[h.length - 1];
      if (top && top.version === model.version) return [...h.slice(0, -1), { version: model.version, metrics }];
      return [...h.slice(-19), { version: model.version, metrics }];
    });
  }
  const previous = history.length >= 2 ? history[history.length - 2]!.metrics : null;
  const sessionStart = history[0]?.metrics ?? null;
  const d = digest(metrics);
  const critical = metrics.findings.filter((f) => f.severity === "CRITICO").length;

  const run = useCallback(
    (cmd: ProjectCommand) => {
      const r = dispatch(cmd);
      if (!r.ok) toast({ title: t(`pm.err.${r.error}`), description: r.detail, tone: "erro" });
      return r;
    },
    [dispatch, toast, t],
  );

  const changeView = (nextTab: WorkspaceTab, nextPane: PaneView | null) => {
    setTab(nextTab);
    setPane(nextPane);
    onViewChange?.(nextTab, nextPane);
  };
  const goTo = (next: WorkspaceTab) => changeView(next, pane === next ? "feedback" : pane);

  const panelProps: PanelProps = { model, dispatch: run, people, readOnly, goTo, selected, onSelect: setSelected, decia, decisions };
  /** o Encerramento é o único lugar que reabre um projeto arquivado (quem pode editar) */
  const renderTab = (view: WorkspaceTab) => {
    if (view === "encerramento") return <ClosurePanel {...panelProps} canReopen={canEdit} />;
    const P = TAB_PANELS[view];
    return <P {...panelProps} />;
  };
  const last = model.versions.at(-1);

  const renderPane = (view: PaneView) =>
    view === "feedback" ? <FeedbackPanel {...panelProps} metrics={metrics} previous={previous} sessionStart={sessionStart} /> : renderTab(view);

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)]" data-workspace={model.id}>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-[var(--ws-text-h2--lh)]">{model.title}</h1>
          {source === "DEMO" ? <Badge tone="warning" title={t("pm.ws.demoHint")}>DEMO</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
          <Tag tone="accent" filled>{t("pm.ws.phase", { phase: t(`pm.phase.${model.currentPhase}`) })}</Tag>
          <Tag>{t(`pm.approach.${model.approach}`)}</Tag>
          <Tag>{t("pm.ws.version", { n: model.version })}</Tag>
          {last ? <span className="min-w-0 max-w-full truncate text-ws-text-muted" aria-live="polite">{t("pm.ws.lastChange", { what: versionSummary(t, last), who: nameOf(people, last.actorId) })}</span> : null}
        </div>
        {readOnly ? <p role="status" className="rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)]">{t("pm.ui.readOnly")}</p> : null}
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          label={t("pm.ws.tabsLabel")}
          param={null}
          value={tab}
          onChange={(v) => changeView(v as WorkspaceTab, pane === v ? "feedback" : pane)}
          tabs={WORKSPACE_TABS.map((x) => ({ slug: x, label: t(`pm.tab.${x}`) }))}
          className="min-w-0 flex-1"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={pane ? "primary" : "default"}
            icon="insights-ia"
            aria-pressed={Boolean(pane)}
            onClick={() => changeView(tab, pane ? null : "feedback")}
          >
            {t(pane ? "pm.ws.splitClose" : "pm.ws.splitOpen")}
            {critical ? <Badge count className="ml-1">{critical}</Badge> : null}
          </Button>
          {pane ? (
            <Select
              aria-label={t("pm.ws.paneLabel")}
              value={pane}
              onChange={(e) => changeView(tab, e.target.value as PaneView)}
              options={PANE_VIEWS.filter((v) => v !== tab).map((v) => ({ value: v, label: t(`pm.tab.${v}`) }))}
              className="min-h-[var(--ws-control-sm)] w-56"
            />
          ) : null}
        </div>
      </div>

      {pane ? (
        <SplitView
          label={t("pm.ws.splitter")}
          left={
            <section aria-label={t(`pm.tab.${tab}`)} data-pane="left">
              {renderTab(tab)}
            </section>
          }
          right={
            <section aria-label={t("pm.ws.rightPane", { view: t(`pm.tab.${pane}`) })} data-pane="right" className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-0 p-[var(--ws-space-3)]">
              {pane !== "feedback" ? (
                <p className="flex flex-wrap items-center justify-between gap-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">
                  <span>{t("pm.ws.linkedHint")}</span>
                  <span className="flex gap-1">
                    {d.priorities.length ? <Button size="sm" variant="ghost" onClick={() => changeView(tab, "feedback")}>{t("pm.tab.feedback")}</Button> : null}
                  </span>
                </p>
              ) : null}
              {renderPane(pane)}
            </section>
          }
        />
      ) : (
        <section aria-label={t(`pm.tab.${tab}`)} data-pane="left">
          {renderTab(tab)}
        </section>
      )}
    </div>
  );
}
