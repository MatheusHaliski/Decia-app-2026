"use client";
/**
 * Quadro por fases (RF22) com base acadêmica (lib/projects/lifecycle.ts):
 *  • colunas = FASES do ciclo de vida (7 institucionais, 4 clássicas do PMBOK ou o fluxo do Scrum) — não grupos de processos;
 *    cada coluna mostra o grupo de processos DOMINANTE, as áreas de conhecimento, os domínios do COBIT e os entregáveis;
 *  • cada fase termina num PORTÃO com critérios de saída verificados pelo sistema; a decisão é de governança, no DECIA;
 *  • MONITORAMENTO E CONTROLE é a faixa transversal (valor agregado, mudanças, riscos, lições), não uma coluna.
 * Arrastar um cartão (ou o menu "Mover", pelo teclado) muda fase/situação — e o canvas, a linha do tempo e o feedback mudam junto.
 */
import { useState, type DragEvent } from "react";
import { Badge, Button, Input, Link, PercentBar, Popover, PopoverClose, Select, Tabs, Tag, cn, type Tone } from "@/components/ui";
import { MenuLabel, MenuOption } from "@/components/ui/Menu";
import { useI18n } from "@/lib/i18n/useI18n";
import { makeRef } from "@/lib/projects/canvas";
import type { ProjectCommand } from "@/lib/projects/commands";
import { PHASE_META, SCRUM, type KnowledgeArea } from "@/lib/projects/lifecycle";
import { evaluateGate } from "@/lib/projects/metrics";
import { BOARD_MODELS, FLOW_STATUSES, type BoardModel, type FlowStatus, type GateOutcome, type ProjectPhase } from "@/lib/projects/types";
import { boardView, evmView, riskRows, type BoardCard, type BoardColumn } from "@/lib/projects/views";
import { AgileMetrics } from "./AgileMetrics";
import { GateChecklist } from "./common";
import { TaskInspector } from "./TaskInspector";
import { fmt, nameOf, type PanelProps } from "./shared";

const OUTCOME_TONE: Record<GateOutcome, Tone> = { PENDENTE: "neutral", APROVADO: "success", APROVADO_COM_RESSALVAS: "warning", SUSPENSO: "danger", ENCERRADO: "neutral" };
const DND_TYPE = "application/x-ws-task";
type TaskPatch = Extract<ProjectCommand, { type: "TASK_UPDATE" }>["patch"];

export function PhaseBoard(props: PanelProps) {
  const { model, dispatch, readOnly } = props;
  const { t } = useI18n();
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const view = boardView(model);
  const sprint = model.currentSprint ?? 1;
  const columnLabel = (col: BoardColumn) => (view.model === "INSTITUCIONAL" ? t(`pm.phase.${col.id}`) : t(`pm.column.${col.id}`));

  /** Destino canônico: no PMBOK uma coluna agrupa fases — fica na fase atual se ela estiver na coluna. */
  const targetPhase = (col: BoardColumn): ProjectPhase => (col.phases.includes(model.currentPhase) ? model.currentPhase : col.phases[0]!);

  const moveTo = (taskId: string, col: BoardColumn, status?: FlowStatus) => {
    const task = model.tasks.find((x) => x.id === taskId);
    if (!task || readOnly) return;
    if (view.model === "SCRUM") {
      const target = col.statuses![0]!;
      const patch: TaskPatch = {};
      if (task.status !== target) patch.status = target;
      if (col.backlog === "PRODUTO") {
        if (task.sprint === sprint) patch.sprint = undefined;
      } else if (col.backlog === "SPRINT" ? task.sprint !== sprint : task.sprint === undefined) patch.sprint = sprint;
      if (Object.keys(patch).length) dispatch({ type: "TASK_UPDATE", id: task.id, patch });
      return;
    }
    if (!col.phases.includes(task.phase)) {
      const r = dispatch({ type: "TASK_MOVE_PHASE", id: task.id, phase: targetPhase(col) });
      if (!r.ok) return;
    }
    if (status && task.status !== status) dispatch({ type: "TASK_UPDATE", id: task.id, patch: { status } });
  };

  const dropProps = (key: string, col: BoardColumn, status?: FlowStatus) =>
    readOnly
      ? {}
      : {
          onDragOver: (e: DragEvent) => {
            if (!e.dataTransfer.types.includes(DND_TYPE)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOver !== key) setDragOver(key);
          },
          onDragLeave: () => setDragOver((k) => (k === key ? null : k)),
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(null);
            const id = e.dataTransfer.getData(DND_TYPE);
            if (id) moveTo(id, col, status);
          },
        };

  const open = (id: string) => {
    setOpenTask(id);
    props.onSelect?.(makeRef("TASK", id));
  };

  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <BoardToolbar {...props} />
      <BoardTheory />
      {view.model === "SCRUM" ? <ScrumStrip {...props} /> : null}
      <div
        role="list"
        aria-label={t("pm.board.columnsLabel")}
        className="grid auto-cols-[minmax(17rem,85vw)] grid-flow-col gap-[var(--ws-space-3)] overflow-x-auto pb-2 sm:auto-cols-[minmax(17rem,1fr)]"
      >
        {view.columns.map((col) => {
          const current = view.model !== "SCRUM" && col.phases.includes(model.currentPhase);
          return (
            <section
              key={col.id}
              role="listitem"
              aria-label={`${columnLabel(col)} (${col.count})`}
              data-column={col.id}
              className={cn(
                "flex min-w-0 flex-col gap-2 rounded-[var(--ws-radius-lg)] border bg-ws-surface-1 p-[var(--ws-space-3)]",
                current ? "border-ws-accent [box-shadow:inset_0_3px_0_var(--ws-accent)]" : "border-ws-border",
                dragOver === col.id && "bg-ws-accent-soft",
              )}
              {...dropProps(col.id, col)}
            >
              <ColumnHeader col={col} label={columnLabel(col)} current={current} {...props} />
              {view.model === "SCRUM" ? (
                <CardList cards={col.groups[col.statuses![0]!]} onOpen={open} col={col} moveTo={moveTo} columns={view.columns} columnLabel={columnLabel} {...props} />
              ) : (
                FLOW_STATUSES.map((st) => {
                  const key = `${col.id}:${st}`;
                  return (
                    <div key={st} className={cn("grid gap-1.5 rounded-[var(--ws-radius-md)] p-1", dragOver === key && "bg-ws-accent-soft outline-dashed outline-1 outline-ws-accent")} {...dropProps(key, col, st)}>
                      <p className="flex items-center justify-between px-1 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">
                        <span>{t(`pm.status.${st}`)}</span>
                        <span className="tabular-nums">{col.groups[st].length}</span>
                      </p>
                      <CardList cards={col.groups[st]} onOpen={open} col={col} moveTo={moveTo} columns={view.columns} columnLabel={columnLabel} {...props} />
                    </div>
                  );
                })
              )}
              {!readOnly ? <QuickAdd col={col} label={columnLabel(col)} phase={view.model === "SCRUM" ? (model.approach === "HIBRIDO" || model.approach === "PREDITIVO" ? "EXECUCAO" : model.currentPhase) : targetPhase(col)} sprint={view.model === "SCRUM" && col.backlog !== "PRODUTO" ? sprint : undefined} status={view.model === "SCRUM" ? col.statuses![0] : undefined} dispatch={dispatch} /> : null}
            </section>
          );
        })}
      </div>
      {view.model === "SCRUM" ? <AgileMetrics {...props} /> : null}
      <MonitoringLane {...props} />
      <TaskInspector {...props} taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

function BoardToolbar({ model, dispatch }: PanelProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs
        label={t("pm.board.modelLabel")}
        param={null}
        look="pills"
        value={model.boardModel}
        onChange={(v) => dispatch({ type: "SET_BOARD_MODEL", model: v as BoardModel })}
        tabs={BOARD_MODELS.map((m) => ({ slug: m, label: t(`pm.boardModel.${m}`) }))}
      />
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`pm.board.modelHint.${model.boardModel}`)}</p>
    </div>
  );
}

function BoardTheory() {
  const { t } = useI18n();
  return (
    <details className="group rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 px-[var(--ws-space-3)] py-2 text-[length:var(--ws-text-body-sm)]">
      <summary className="cursor-pointer select-none font-semibold text-ws-text">{t("pm.board.theoryTitle")}</summary>
      <ol className="mt-2 grid list-decimal gap-1 pl-5 text-ws-text">
        <li>{t("pm.board.theory1")}</li>
        <li>{t("pm.board.theory2")}</li>
        <li>{t("pm.board.theory3")}</li>
      </ol>
      <p className="mt-1 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.ref.PORTAO_DE_FASE")} · {t("pm.ref.GOVERNANCA_X_GESTAO")}</p>
    </details>
  );
}

function ColumnHeader({ col, label, current, model, readOnly, decia }: PanelProps & { col: BoardColumn; label: string; current: boolean }) {
  const { t } = useI18n();
  if (model.boardModel === "SCRUM") {
    return (
      <header className="grid gap-1">
        <h3 className="flex items-center justify-between gap-2 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body-lg)] font-semibold">
          <span>{label}</span>
          <Badge>{col.count}</Badge>
        </h3>
        {col.backlog ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(col.backlog === "PRODUTO" ? "pm.board.scrum.productHint" : "pm.board.scrum.sprintN", { n: model.currentSprint ?? 1 })}</p> : null}
      </header>
    );
  }
  const metas = col.phases.map((p) => PHASE_META[p]);
  const areas = [...new Set(metas.flatMap((m) => m.areas))] as KnowledgeArea[];
  const cobit = [...new Set(metas.flatMap((m) => m.cobit))];
  const artifacts = [...new Set(metas.flatMap((m) => m.artifacts))];
  const dominant = model.boardModel === "PMBOK" ? col.id : metas[0]!.dominant;
  return (
    <header className="grid gap-2">
      <h3 className="flex items-start justify-between gap-2 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body-lg)] font-semibold leading-tight">
        <span>{label}</span>
        <span className="flex shrink-0 items-center gap-1">
          {current ? <Tag tone="accent" filled>{t("pm.board.currentPhase")}</Tag> : null}
          <Badge>{col.count}</Badge>
        </span>
      </h3>
      {col.phases.length > 1 ? (
        <p className="flex flex-wrap gap-1">{col.phases.map((p) => <Tag key={p} tone={p === model.currentPhase ? "accent" : "neutral"}>{t(`pm.phase.${p}`)}</Tag>)}</p>
      ) : null}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.board.dominant", { group: t(`pm.process.${dominant}`) })}</p>
      <p className="flex flex-wrap gap-1" aria-label={t("pm.board.areas")}>
        {areas.map((a) => <Tag key={a} tone="blue">{t(`pm.karea.${a}`)}</Tag>)}
      </p>
      <p className="flex flex-wrap gap-1" aria-label="COBIT">
        {cobit.map((c) => (
          <Tag key={c} tone={c === "EDM" ? "spark" : "neutral"}>
            <span title={t(`pm.cobit.${c}`)}>{c}</span>
            {c === "EDM" ? <span className="sr-only sm:not-sr-only"> · {t("pm.board.governanceChip")}</span> : null}
          </Tag>
        ))}
      </p>
      <details className="text-[length:var(--ws-text-caption)]">
        <summary className="cursor-pointer select-none font-semibold text-ws-text-muted">{t("pm.board.artifacts", { n: artifacts.length })}</summary>
        <ul className="mt-1 grid list-disc gap-0.5 pl-4">{artifacts.map((a) => <li key={a}>{t(`pm.artifact.${a}`)}</li>)}</ul>
      </details>
      {col.phases.map((p) => <GateBox key={p} phase={p} model={model} readOnly={readOnly} decia={decia} multi={col.phases.length > 1} />)}
    </header>
  );
}

function GateBox({ phase, model, readOnly, decia, multi }: Pick<PanelProps, "model" | "readOnly" | "decia"> & { phase: ProjectPhase; multi: boolean }) {
  const { t } = useI18n();
  const gate = model.gates.find((g) => g.phase === phase);
  const outcome: GateOutcome = gate?.outcome ?? "PENDENTE";
  const checks = evaluateGate(model, phase);
  const passed = checks.filter((c) => c.ok).length;
  const isCurrent = phase === model.currentPhase;
  const status = gate?.decisionId ? decia?.decisionStatus(gate.decisionId) : undefined;
  return (
    <details open={isCurrent} className={cn("rounded-[var(--ws-radius-md)] border px-2 py-1.5", isCurrent ? "border-ws-accent bg-ws-accent-soft" : "border-ws-border bg-ws-surface-2")} data-gate={phase}>
      <summary className="flex cursor-pointer select-none flex-wrap items-center gap-1.5 text-[length:var(--ws-text-caption)] font-semibold">
        <span>{multi ? t("pm.board.gateOf", { phase: t(`pm.phase.${phase}`) }) : t("pm.board.gate")}</span>
        <span className="font-[family-name:var(--ws-font-mono)] tabular-nums">{passed}/{checks.length}</span>
        <Tag tone={OUTCOME_TONE[outcome]}>{t(`pm.gateOutcome.${outcome}`)}</Tag>
      </summary>
      <div className="mt-1.5 grid gap-1.5">
        <GateChecklist model={model} phase={phase} />
        {gate && outcome !== "PENDENTE" && !gate.decisionId ? <p className="text-[length:var(--ws-text-caption)] text-ws-warning-ink">{t("pm.board.decidedOutside")}</p> : null}
        {gate?.decisionId && decia ? (
          <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-caption)]">
            <Link href={decia.decisionHref(gate.decisionId)}>{t("pm.board.gateDecision")}</Link>
            {status ? <Tag tone="info">{t(`decia.status.${status}`)}</Tag> : null}
          </p>
        ) : null}
        {isCurrent && decia && !readOnly && (!gate?.decisionId || outcome !== "PENDENTE") ? (
          <Button size="sm" variant="spark" icon="sessao-decia" onClick={() => decia.openGate(phase)}>{t("pm.board.requestGate")}</Button>
        ) : null}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.board.gateHint")}</p>
      </div>
    </details>
  );
}

function CardList({ cards, onOpen, col, moveTo, columns, columnLabel, ...props }: PanelProps & {
  cards: BoardCard[];
  onOpen: (id: string) => void;
  col: BoardColumn;
  moveTo: (id: string, col: BoardColumn, status?: FlowStatus) => void;
  columns: BoardColumn[];
  columnLabel: (c: BoardColumn) => string;
}) {
  const { t } = useI18n();
  if (!cards.length) return <p className="rounded-[var(--ws-radius-sm)] border border-dashed border-ws-border px-2 py-1.5 text-center text-[length:var(--ws-text-caption)] text-ws-text-faint">{t("pm.board.empty")}</p>;
  return (
    <ul className="grid gap-1.5">
      {cards.map((c) => <TaskCard key={c.task.id} card={c} onOpen={onOpen} col={col} moveTo={moveTo} columns={columns} columnLabel={columnLabel} {...props} />)}
    </ul>
  );
}

function TaskCard({ card, onOpen, col, moveTo, columns, columnLabel, model, people, readOnly, selected }: PanelProps & {
  card: BoardCard;
  onOpen: (id: string) => void;
  col: BoardColumn;
  moveTo: (id: string, col: BoardColumn, status?: FlowStatus) => void;
  columns: BoardColumn[];
  columnLabel: (c: BoardColumn) => string;
}) {
  const { t, intl } = useI18n();
  const task = card.task;
  const isSel = selected === makeRef("TASK", task.id);
  const responsible = card.responsible.length ? card.responsible.map((u) => nameOf(people, u)).join(", ") : task.responsibleId ? nameOf(people, task.responsibleId) : null;
  return (
    <li
      data-task={task.id}
      draggable={!readOnly}
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_TYPE, task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "grid gap-1 rounded-[var(--ws-radius-md)] border bg-ws-surface-1 p-2 shadow-ws-1",
        card.critical ? "border-l-4 border-ws-border border-l-ws-danger" : "border-ws-border",
        isSel && "[box-shadow:var(--ws-focus-ring)]",
        !readOnly && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] font-bold text-ws-text-muted">{task.code}</span>
        {card.critical ? <Tag tone="danger">{t("pm.board.card.critical")}</Tag> : null}
        {task.milestone ? <Tag tone="info">◆ {t("pm.board.card.milestone")}</Tag> : null}
        {card.unauthorized ? <Tag tone="warning">{t("pm.board.card.unauthorized")}</Tag> : null}
        {task.moscow ? <Badge tone={task.moscow === "MUST" ? "accent" : "neutral"} title={t(`pm.moscow.${task.moscow}`)}>{task.moscow}</Badge> : null}
        {model.boardModel === "PMBOK" && col.phases.length > 1 ? <Tag>{t(`pm.phase.${task.phase}`)}</Tag> : null}
        {model.boardModel === "SCRUM" ? <Tag>{t(`pm.phase.${task.phase}`)}</Tag> : null}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onOpen(task.id)} className="h-auto min-h-0 justify-start whitespace-normal px-1 py-0.5 text-left font-semibold" aria-label={t("pm.board.card.open", { code: task.code, title: task.title })}>
        <span className="line-clamp-2">{task.title}</span>
      </Button>
      <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <span>{responsible ? t("pm.board.card.responsible", { names: responsible }) : <span className="text-ws-warning-ink">{t("pm.board.card.noResponsible")}</span>}</span>
        {card.accountable ? <span>{t("pm.board.card.accountable", { name: nameOf(people, card.accountable) })}</span> : null}
        {!task.milestone ? <span>{t("pm.ui.daysShort", { n: fmt.number(intl, task.pert ? (task.pert.o + 4 * task.pert.m + task.pert.p) / 6 : task.durationDays, 1) })}</span> : null}
        {card.totalFloat !== null && !task.milestone ? <span>{t("pm.board.card.float", { n: fmt.number(intl, card.totalFloat, 1) })}</span> : null}
        {card.risks ? <span className="text-ws-danger-ink">{t("pm.board.card.risks", { n: card.risks })}</span> : null}
      </p>
      {!task.milestone ? <PercentBar value={task.percentComplete} label={t("pm.board.card.progress")} size="sm" tone={task.status === "CONCLUIDA" ? "success" : "accent"} /> : null}
      {!readOnly ? (
        <Popover
          label={t("pm.board.move", { code: task.code })}
          align="start"
          width="w-64"
          trigger={<Button size="sm" variant="ghost" className="min-h-0 justify-self-end px-2 py-0 text-[length:var(--ws-text-caption)]">{t("pm.board.move", { code: task.code })}</Button>}
        >
          <div role="menu" aria-label={t("pm.board.move", { code: task.code })} className="grid gap-0.5">
            <MenuLabel>{t("pm.board.moveColumn")}</MenuLabel>
            {columns.map((c) => (
              <PopoverClose asChild key={c.id}>
                <MenuOption role="menuitemradio" on={c.id === col.id} onClick={() => moveTo(task.id, c)}>{columnLabel(c)}</MenuOption>
              </PopoverClose>
            ))}
            {model.boardModel !== "SCRUM" ? (
              <>
                <MenuLabel>{t("pm.board.moveStatus")}</MenuLabel>
                {FLOW_STATUSES.map((st) => (
                  <PopoverClose asChild key={st}>
                    <MenuOption role="menuitemradio" on={task.status === st} onClick={() => moveTo(task.id, col, st)}>{t(`pm.status.${st}`)}</MenuOption>
                  </PopoverClose>
                ))}
              </>
            ) : null}
          </div>
        </Popover>
      ) : null}
    </li>
  );
}

function QuickAdd({ col, label, phase, sprint, status, dispatch }: { col: BoardColumn; label: string; phase: ProjectPhase; sprint?: number; status?: FlowStatus; dispatch: PanelProps["dispatch"] }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  return (
    <form
      className="mt-auto flex gap-1.5 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const r = dispatch({ type: "TASK_CREATE", title, phase, status, sprint });
        if (r.ok) setTitle("");
      }}
    >
      <Input aria-label={t("pm.board.addTask", { column: label })} placeholder={t("pm.board.addPlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-[var(--ws-control-sm)] text-[length:var(--ws-text-body-sm)]" data-column-input={col.id} />
      <Button type="submit" size="sm" disabled={!title.trim()}>{t("pm.ui.add")}</Button>
    </form>
  );
}

function ScrumStrip({ model, dispatch, readOnly }: PanelProps) {
  const { t } = useI18n();
  const sprints = Math.max(model.currentSprint ?? 1, ...model.tasks.map((x) => x.sprint ?? 0)) + 1;
  const scope = model.approach === "AGIL" || model.approach === "ITERATIVO" ? "scopeAgile" : model.approach === "HIBRIDO" ? "scopeHybrid" : "scopePredictive";
  return (
    <section aria-label={t("pm.board.scrum.title")} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 font-semibold">
          {t("pm.board.scrum.sprint")}
          <Select
            value={String(model.currentSprint ?? 1)}
            disabled={readOnly}
            onChange={(e) => dispatch({ type: "SET_CURRENT_SPRINT", sprint: Number(e.target.value) })}
            options={Array.from({ length: sprints }, (_, i) => ({ value: String(i + 1), label: t("pm.board.scrum.sprintN", { n: i + 1 }) }))}
            className="min-h-[var(--ws-control-sm)] w-40"
          />
        </label>
        <p className="min-w-0 flex-1 text-ws-text-muted">{t(`pm.board.scrum.${scope}`, { approach: t(`pm.approach.${model.approach}`) })}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <p className="font-semibold">{t("pm.board.scrum.artifacts")}</p>
          <ul className="grid gap-0.5">
            {SCRUM.artifacts.map((a) => <li key={a.artifact}>{t(`pm.board.scrum.artifact.${a.artifact}`)} → <strong>{t(`pm.board.scrum.commitment.${a.commitment}`)}</strong></li>)}
          </ul>
        </div>
        <div>
          <p className="font-semibold">{t("pm.board.scrum.events")}</p>
          <p className="flex flex-wrap gap-1">{SCRUM.events.map((e) => <Tag key={e}>{t(`pm.board.scrum.event.${e}`)}</Tag>)}</p>
        </div>
        <div>
          <p className="font-semibold">{t("pm.board.scrum.roles")}</p>
          <p className="flex flex-wrap gap-1">{SCRUM.roles.map((r) => <Tag key={r}>{t(`pm.board.scrum.role.${r}`)}</Tag>)}</p>
        </div>
      </div>
    </section>
  );
}

/** Monitoramento e controle: a faixa que atravessa todas as fases (não é coluna). */
function MonitoringLane({ model, goTo }: PanelProps) {
  const { t, intl } = useI18n();
  const e = evmView(model);
  const openChanges = model.changes.filter((c) => c.status === "SOLICITADA" || c.status === "EM_ANALISE").length;
  const openRisks = riskRows(model).filter((r) => r.open);
  const high = openRisks.filter((r) => r.kind === "AMEACA" && (r.band === "ALTA" || r.band === "CRITICA")).length;
  const creep = model.tasks.filter((x) => x.addedAfterBaseline && !x.changeId).length;
  const lessonPhases = new Set(model.lessons.map((l) => l.phase)).size;
  const tone = (v: number | null, ok = 0.95, warn = 0.85): Tone => (v === null ? "neutral" : v >= ok ? "success" : v >= warn ? "warning" : "danger");
  const tiles: { key: string; label: string; value: string; note?: string; tone: Tone; tab: Parameters<NonNullable<PanelProps["goTo"]>>[0] }[] = [
    { key: "cpi", label: t("pm.board.mc.cpi"), value: fmt.number(intl, e.cpi, 2), note: e.cost ? t(`pm.costVerdict.${e.cost}`) : undefined, tone: tone(e.cpi), tab: "controle" },
    { key: "spi", label: t("pm.board.mc.spi"), value: fmt.number(intl, e.spi, 2), note: e.schedule ? t(`pm.scheduleVerdict.${e.schedule}`) : undefined, tone: tone(e.spi), tab: "controle" },
    { key: "changes", label: t("pm.board.mc.changes"), value: String(openChanges), tone: openChanges ? "warning" : "success", tab: "controle" },
    { key: "risks", label: t("pm.board.mc.risks"), value: String(openRisks.length), note: t("pm.board.mc.risksHigh", { n: high }), tone: high ? "warning" : "success", tab: "riscos" },
    { key: "creep", label: t("pm.board.mc.creep"), value: String(creep), tone: creep ? "danger" : "success", tab: "controle" },
    { key: "lessons", label: t("pm.board.mc.lessons"), value: String(model.lessons.length), note: t("pm.board.mc.lessonsPhases", { n: lessonPhases }), tone: lessonPhases >= 2 ? "success" : "warning", tab: "encerramento" },
    { key: "baseline", label: t("pm.board.mc.baseline"), value: model.baseline ? fmt.date(intl, model.baseline.setAt) : t("pm.board.mc.baselineNone"), tone: model.baseline ? "success" : "warning", tab: "cronograma" },
  ];
  return (
    <section aria-labelledby="mc-lane" className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-dashed border-ws-border-strong bg-ws-surface-2 p-[var(--ws-space-3)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="mc-lane" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body-lg)] font-semibold">{t("pm.board.mc.title")}</h3>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.board.mc.hint")}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map((x) => (
          <li key={x.key}>
            <Button variant="default" size="sm" onClick={() => goTo?.(x.tab)} disabled={!goTo} className="h-full w-full flex-col items-start gap-0.5 whitespace-normal rounded-[var(--ws-radius-md)] py-2 text-left" data-tile={x.key}>
              <span className="text-[length:var(--ws-text-caption)] font-medium text-ws-text-muted">{x.label}</span>
              <span className="flex items-center gap-1.5 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-body-lg)] tabular-nums">
                {x.value}
                <Tag tone={x.tone} className="font-[family-name:var(--ws-font-body)]">{x.tone === "success" ? "✓" : x.tone === "neutral" ? "–" : "!"}</Tag>
              </span>
              {x.note ? <span className="text-[length:var(--ws-text-caption)] font-normal text-ws-text-muted">{x.note}</span> : null}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
