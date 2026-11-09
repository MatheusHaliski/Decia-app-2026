"use client";
/**
 * Aba "Escopo" da Mesa de Trabalho (RF22) — aula de planejamento (Tema 3): EAP com a regra dos 100 % e o dicionário,
 * requisitos e matriz de rastreabilidade (gold plating × scope creep), priorização MoSCoW das atividades e os critérios de
 * portão ligados ao escopo. Tudo é projeção do mesmo modelo (`wbsView`, `traceabilityView`, `computeMetrics`, `evaluateGate`)
 * e toda edição é um comando: o que muda aqui aparece na hora no quadro, no canvas, na linha do tempo e no "Feedback da IA".
 *
 * Também exporta as peças que o painel "Riscos e equipe" reaproveita: indicadores da aba, portões, formulário de inclusão,
 * remoção com confirmação, opções de pessoa e o despacho com aviso de recusa (candidatas a `common.tsx`).
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Card, Checkbox, Field, Input, PercentBar, Select, Tag, cn, type PercentBarProps, type SelectOption } from "@/components/ui";
import { CommitNumber, CommitText, GateChecklist, MetricStatusTag, SectionTitle, Theory, metricText } from "@/components/projects/common";
import { fmt, nameOf, type PanelProps, type PeopleDirectory } from "@/components/projects/shared";
import { useI18n } from "@/lib/i18n/useI18n";
import type { CommandResult, ProjectCommand } from "@/lib/projects/commands";
import { effectiveDuration, type WbsTreeNode } from "@/lib/projects/derive";
import { computeMetrics, evaluateGate, type MetricStatus, type ProjectMetrics, type WorkspaceTab } from "@/lib/projects/metrics";
import { MOSCOW, type Moscow, type ProjectModel, type ProjectPhase, type Requirement, type Task } from "@/lib/projects/types";
import { traceabilityView, wbsView, type TraceView, type WbsIssue, type WbsView } from "@/lib/projects/views";

type Run = (cmd: ProjectCommand) => CommandResult;
/** Props de uma seção: as do painel + o despacho que respeita `readOnly` e registra a recusa. */
export type SectionProps = PanelProps & { run: Run };

export const CAPTION = "text-[length:var(--ws-text-caption)]";
export const MUTED = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
export const MONO = "font-[family-name:var(--ws-font-mono)] tabular-nums";
export const LEAD = "max-w-prose text-[length:var(--ws-text-body-sm)] text-ws-text-muted";
/** Tom da barra a partir do status do indicador (o limite é do motor, não da tela). */
export const STATUS_BAR: Record<MetricStatus, NonNullable<PercentBarProps["tone"]>> = { OK: "success", ATENCAO: "warning", CRITICO: "danger", SEM_DADOS: "accent" };

// ------------------------------------------------------------------ peças compartilhadas com "Riscos e equipe"

/** Despacha o comando (nunca em `readOnly`) e guarda a recusa, traduzida, para o aviso do painel. */
export function useCommand(dispatch: PanelProps["dispatch"], readOnly: boolean) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const run: Run = (cmd) => {
    if (readOnly) return { ok: false, error: "PROJETO_BLOQUEADO" };
    const r = dispatch(cmd);
    setError(r.ok ? null : t(`pm.err.${r.error}`));
    return r;
  };
  return { run, error, clear: () => setError(null) };
}

/** Aviso de comando recusado (texto vazio, valor inválido…): o campo volta ao valor do modelo e o motivo fica visível. */
export function CommandNotice({ error, onClose }: { error: string | null; onClose: () => void }) {
  const { t } = useI18n();
  if (!error) return null;
  return (
    <div role="alert" className="sticky top-0 z-10 flex items-start gap-2 rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">
      <span aria-hidden className="font-bold">✕</span>
      <span className="min-w-0 flex-1">{error}</span>
      <Button size="sm" variant="ghost" aria-label={t("pm.ui.close")} onClick={onClose} className="min-h-0 px-2 py-0">×</Button>
    </div>
  );
}

/** Indicadores de `computeMetrics` que apontam para esta aba — os mesmos textos do "Feedback da IA". */
export function TabMetrics({ metrics, tab, label }: { metrics: ProjectMetrics; tab: WorkspaceTab; label: string }) {
  const { t, intl } = useI18n();
  const list = [...metrics.quality, ...metrics.governance, ...metrics.group].filter((m) => m.tab === tab);
  if (!list.length) return null;
  return (
    <section aria-label={label}>
      <ul className="grid gap-[var(--ws-space-2)] @2xl:grid-cols-2 @6xl:grid-cols-4">
        {list.map((m) => {
          const txt = metricText(t, intl, m);
          const bad = m.status === "CRITICO" || m.status === "ATENCAO";
          return (
            <li
              key={m.id}
              data-metric={m.id}
              data-status={m.status}
              className={cn(
                "grid content-start gap-1 rounded-[var(--ws-radius-md)] border border-l-4 border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]",
                m.status === "CRITICO" ? "border-l-ws-danger" : m.status === "ATENCAO" ? "border-l-ws-warning" : m.status === "OK" ? "border-l-ws-success" : null,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-[length:var(--ws-text-body-sm)] font-semibold leading-snug">{txt.title}</p>
                <MetricStatusTag status={m.status} className="shrink-0" />
              </div>
              <p className={CAPTION}>{txt.detail}</p>
              {bad ? <p className={MUTED}>{txt.advice}</p> : null}
              <p className={cn(MUTED, "font-[family-name:var(--ws-font-mono)]")}>{t(`pm.ref.${m.ref}`)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Critérios de saída dos portões ligados à aba, com a decisão registrada (portão aprovado com critério pendente é achado). */
export function PhaseGates({ model, phases, title, hint }: { model: ProjectModel; phases: readonly ProjectPhase[]; title: string; hint?: string }) {
  const { t } = useI18n();
  const hid = useId();
  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{title}</SectionTitle>
      {hint ? <p className={LEAD}>{hint}</p> : null}
      <div className="grid gap-[var(--ws-space-3)] @3xl:grid-cols-2">
        {phases.map((phase) => {
          const gate = model.gates.find((g) => g.phase === phase);
          const pending = evaluateGate(model, phase).filter((c) => !c.ok).length;
          const passed = gate?.outcome === "APROVADO" || gate?.outcome === "APROVADO_COM_RESSALVAS";
          return (
            <Card key={phase} padding="sm" data-gate={phase} className="grid content-start gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{t("pm.scope.gate.phase", { phase: t(`pm.phase.${phase}`) })}</p>
                {model.currentPhase === phase ? <Tag tone="accent">{t("pm.scope.gate.current")}</Tag> : null}
                {gate ? <Tag tone={passed ? "info" : "neutral"}>{t(`pm.gateOutcome.${gate.outcome}`)}</Tag> : null}
                {passed && pending ? (
                  <Tag tone="warning">
                    <span aria-hidden>!</span>
                    {t("pm.scope.gate.passedWithGaps", { n: pending })}
                  </Tag>
                ) : null}
              </div>
              <GateChecklist model={model} phase={phase} />
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/** Inclusão por texto (+ campos extras): um comando por envio; recusa aparece no campo e o rascunho fica. */
export function AddForm({ label, placeholder, onSubmit, onClose, autoFocus, extra, submitLabel }: {
  label: string;
  placeholder?: string;
  onSubmit: (text: string) => CommandResult;
  onClose?: () => void;
  autoFocus?: boolean;
  extra?: ReactNode;
  submitLabel?: string;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const r = onSubmit(draft);
        if (r.ok) {
          setDraft("");
          setError(null);
        } else setError(t(`pm.err.${r.error}`));
      }}
    >
      <Field label={label} error={error ?? undefined} className="min-w-[12rem] flex-[2]">
        {({ id, describedBy }) => (
          <Input id={id} aria-describedby={describedBy} value={draft} invalid={Boolean(error)} placeholder={placeholder} autoFocus={autoFocus}
            onChange={(e) => { setDraft(e.target.value); setError(null); }} />
        )}
      </Field>
      {extra}
      <Button type="submit" size="sm" variant="primary" disabled={!draft.trim()}>{submitLabel ?? t("pm.ui.add")}</Button>
      {onClose ? <Button size="sm" variant="ghost" onClick={onClose}>{t("pm.ui.close")}</Button> : null}
    </form>
  );
}

/** Remover com confirmação (o primeiro clique só pergunta; o foco vai para a confirmação). */
export function RemoveButton({ item, detail, text, onConfirm }: { item: string; detail?: string; text?: string; onConfirm: () => void }) {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button size="sm" variant={text ? "danger" : "ghost"} aria-label={t("pm.ui.removeItem", { item })} onClick={() => setAsking(true)} className={text ? undefined : "min-h-0 px-2 py-0"}>
        {text ?? "×"}
      </Button>
    );
  }
  return (
    <span role="group" aria-label={t("pm.ui.removeItem", { item })} className="inline-flex flex-wrap items-center gap-1.5 rounded-[var(--ws-radius-sm)] bg-ws-danger-soft px-2 py-1 text-[length:var(--ws-text-caption)] text-ws-danger-ink">
      <span>{detail ?? t("pm.scope.confirmRemove", { item })}</span>
      <Button size="sm" variant="danger" autoFocus onClick={() => { setAsking(false); onConfirm(); }}>{t("pm.ui.remove")}</Button>
      <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>{t("pm.ui.cancel")}</Button>
    </span>
  );
}

/** Opções de pessoa: vazio + equipe (nome · papel); quem já está atribuído e não é da equipe continua visível. */
export function personOptions(model: ProjectModel, people: PeopleDirectory, t: (key: string) => string, emptyLabel: string, current?: string): SelectOption[] {
  const opts: SelectOption[] = [{ value: "", label: emptyLabel }, ...model.team.map((m) => ({ value: m.userId, label: `${nameOf(people, m.userId)} · ${t(`pm.role.${m.role}`)}` }))];
  if (current && !model.team.some((m) => m.userId === current)) opts.push({ value: current, label: nameOf(people, current) });
  return opts;
}

// ------------------------------------------------------------------ painel

export function ScopePanel(props: PanelProps) {
  const { t } = useI18n();
  const { model, readOnly } = props;
  const { run, error, clear } = useCommand(props.dispatch, readOnly);
  const metrics = useMemo(() => computeMetrics(model), [model]);
  const wbs = useMemo(() => wbsView(model), [model]);
  const trace = useMemo(() => traceabilityView(model), [model]);
  const section: SectionProps = { ...props, run };
  return (
    <div className="@container grid gap-[var(--ws-space-6)]" data-panel="escopo">
      <CommandNotice error={error} onClose={clear} />
      {readOnly ? <p role="note" className={MUTED}>{t("pm.ui.readOnly")}</p> : null}
      <TabMetrics metrics={metrics} tab="escopo" label={t("pm.scope.metrics")} />
      <WbsSection {...section} wbs={wbs} />
      <RequirementsSection {...section} wbs={wbs} trace={trace} />
      <TraceSection model={model} trace={trace} wbs={wbs} metrics={metrics} />
      <MoscowSection {...section} />
      <PhaseGates model={model} phases={["PLANEJAMENTO", "ELABORACAO"]} title={t("pm.scope.gate.title")} hint={t("pm.scope.gate.hint")} />
    </div>
  );
}

// ------------------------------------------------------------------ EAP

function WbsSection({ model, people, readOnly, selected, onSelect, goTo, run, wbs }: SectionProps & { wbs: WbsView }) {
  const { t, intl } = useI18n();
  const hid = useId();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const issuesOf = new Map<string, WbsIssue[]>();
  for (const i of wbs.issues) if ("nodeId" in i) issuesOf.set(i.nodeId, [...(issuesOf.get(i.nodeId) ?? []), i]);
  const tasksOf = new Map<string, Task[]>();
  for (const x of model.tasks) if (x.wbsId) tasksOf.set(x.wbsId, [...(tasksOf.get(x.wbsId) ?? []), x]);
  const taskCode = new Map(model.tasks.map((x) => [x.id, x.code]));
  const nodeCode = new Map(wbs.nodes.map((n) => [n.node.id, n.code]));
  const leaves = wbs.nodes.filter((n) => n.leaf && n.depth > 0);
  const orphans = wbs.issues.filter((i): i is Extract<WbsIssue, { taskId: string }> => "taskId" in i);
  const descendants = (n: WbsTreeNode): number => n.children.reduce((s, c) => s + 1 + descendants(c), 0);
  const money = (v: number | undefined) => fmt.money(intl, v);

  const issueView = (i: WbsIssue): ReactNode => {
    switch (i.kind) {
      case "SOMA_DIFERENTE":
        return (
          <>
            <Tag tone="danger">
              <span aria-hidden>✕</span>
              {t("pm.scope.issue.SOMA_DIFERENTE", { declared: money(i.declared), children: money(i.children) })}
            </Tag>
            {!readOnly ? (
              <Button size="sm" variant="ghost" onClick={() => run({ type: "WBS_UPDATE", id: i.nodeId, patch: { budget: i.children } })}>
                {t("pm.scope.wbs.useSum", { value: money(i.children) })}
              </Button>
            ) : null}
          </>
        );
      case "PARECE_ATIVIDADE":
        return (
          <>
            <Tag tone="warning"><span aria-hidden>!</span>{t("pm.scope.issue.PARECE_ATIVIDADE")}</Tag>
            <span className={MUTED}>{t("pm.scope.issue.PARECE_ATIVIDADE.fix")}</span>
          </>
        );
      case "PACOTE_SEM_ATIVIDADE":
        return (
          <>
            <Tag tone="warning"><span aria-hidden>!</span>{t("pm.scope.issue.PACOTE_SEM_ATIVIDADE")}</Tag>
            <span className={MUTED}>{t("pm.scope.issue.PACOTE_SEM_ATIVIDADE.fix")}</span>
            {goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("quadro")}>{t("pm.ui.goToTab", { tab: t("pm.tab.quadro") })}</Button> : null}
          </>
        );
      case "ATIVIDADE_FORA_DO_PACOTE":
        return <Tag tone="warning"><span aria-hidden>!</span>{t("pm.scope.issue.ATIVIDADE_FORA_DO_PACOTE.node", { code: taskCode.get(i.taskId) ?? "?" })}</Tag>;
      case "ATIVIDADE_SEM_PACOTE":
        return null;
    }
  };

  const renderNode = (n: WbsTreeNode): ReactNode => {
    const { node } = n;
    const ref = `WBS:${node.id}` as const;
    const isSel = selected === ref;
    const isOpen = open === node.id;
    const isRoot = n.depth === 0;
    const label = isRoot ? node.title : `${n.code} ${node.title}`;
    const issues = issuesOf.get(node.id) ?? [];
    const tasks = tasksOf.get(node.id) ?? [];
    const sub = descendants(n);
    return (
      <li key={node.id} className="grid gap-1.5">
        <div
          data-wbs={node.id}
          data-selected={isSel || undefined}
          className={cn(
            "grid gap-2 rounded-[var(--ws-radius-md)] border p-[var(--ws-space-2)]",
            isSel ? "border-ws-accent bg-ws-accent-soft" : "border-ws-border bg-ws-surface-1",
            !isSel && issues.length ? "border-l-4 border-l-ws-warning" : null,
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={isSel ? "primary" : "default"}
              aria-expanded={isOpen}
              aria-current={isSel || undefined}
              aria-label={t("pm.scope.wbs.open", { item: label })}
              onClick={() => {
                setOpen(isOpen ? null : node.id);
                if (!isOpen) onSelect?.(ref);
              }}
              className={MONO}
            >
              {n.code}
            </Button>
            <CommitText bare label={t("pm.scope.wbs.titleLabel", { code: n.code })} value={node.title} disabled={readOnly}
              onCommit={(v) => run({ type: "WBS_UPDATE", id: node.id, patch: { title: v } })} className="min-w-[10rem] flex-1" />
            {!readOnly ? (
              <Button size="sm" variant="ghost" aria-expanded={adding === node.id} aria-label={t("pm.scope.wbs.addChildTo", { item: label })}
                onClick={() => setAdding(adding === node.id ? null : node.id)}>
                {t("pm.scope.wbs.addChild")}
              </Button>
            ) : null}
            {!readOnly && !isRoot ? (
              <RemoveButton item={label} detail={sub || tasks.length ? t("pm.scope.wbs.removeCascade", { item: label, n: sub, tasks: tasks.length }) : undefined}
                onConfirm={() => run({ type: "WBS_REMOVE", id: node.id })} />
            ) : null}
          </div>

          <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", CAPTION)}>
            <span className="inline-flex items-baseline gap-1">
              <span className="text-ws-text-muted">{t("pm.scope.wbs.rollup")}</span>
              <span className={cn(MONO, "font-semibold")} data-rollup={node.id}>{money(wbs.rollup[node.id])}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="text-ws-text-muted">{t("pm.scope.wbs.declared")}</span>
              <CommitNumber bare label={t("pm.scope.wbs.declaredLabel", { code: n.code })} value={node.budget} min={0} disabled={readOnly} placeholder="—"
                onCommit={(v) => run({ type: "WBS_UPDATE", id: node.id, patch: { budget: v } })} className="w-28" />
            </span>
            {n.leaf && !isRoot ? <Tag>{t("pm.scope.wbs.leaf")}</Tag> : null}
            {tasks.length ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                <span className="text-ws-text-muted">{t("pm.scope.wbs.activities")}</span>
                {tasks.map((x) => <Tag key={x.id} tone="info"><span className={MONO}>{x.code}</span></Tag>)}
              </span>
            ) : null}
          </div>

          {issues.length ? (
            <ul className="grid gap-1">
              {issues.map((i, k) => <li key={`${i.kind}-${k}`} data-issue={i.kind} className="flex flex-wrap items-center gap-2">{issueView(i)}</li>)}
            </ul>
          ) : null}

          {isOpen ? (
            <div data-dictionary={node.id} className="grid gap-2 border-t border-ws-border pt-2 @2xl:grid-cols-2">
              <p className={cn(CAPTION, "font-semibold @2xl:col-span-2")}>{t("pm.scope.wbs.dictionary", { item: label })}</p>
              <CommitText label={t("pm.scope.wbs.acceptance")} value={node.acceptance ?? ""} disabled={readOnly} placeholder={t("pm.scope.wbs.acceptancePlaceholder")}
                onCommit={(v) => run({ type: "WBS_UPDATE", id: node.id, patch: { acceptance: v.trim() || undefined } })} />
              <Field label={t("pm.scope.wbs.owner")}>
                {({ id }) => (
                  <Select id={id} value={node.ownerId ?? ""} disabled={readOnly} options={personOptions(model, people, t, t("pm.ui.unassigned"), node.ownerId)}
                    onChange={(e) => run({ type: "WBS_UPDATE", id: node.id, patch: { ownerId: e.target.value || undefined } })} />
                )}
              </Field>
              {node.budget !== undefined && !readOnly ? (
                <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => run({ type: "WBS_UPDATE", id: node.id, patch: { budget: undefined } })}>
                  {t("pm.scope.wbs.clearDeclared")}
                </Button>
              ) : null}
            </div>
          ) : null}

          {adding === node.id && !readOnly ? (
            <AddForm label={t("pm.scope.wbs.newChild", { item: label })} placeholder={t("pm.scope.wbs.newPlaceholder")} autoFocus
              onSubmit={(text) => run({ type: "WBS_ADD", parentId: node.id, title: text })} onClose={() => setAdding(null)} />
          ) : null}
        </div>
        {n.children.length ? <ul className="ml-[var(--ws-space-3)] grid gap-1.5 border-l-2 border-ws-border pl-[var(--ws-space-3)]">{n.children.map(renderNode)}</ul> : null}
      </li>
    );
  };

  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.scope.wbs.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.scope.wbs.lead")}</p>
      <div className="grid gap-[var(--ws-space-4)] @5xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="grid content-start gap-2">
          {wbs.tree ? (
            <ul className="grid gap-1.5" aria-label={t("pm.scope.wbs.tree")}>{renderNode(wbs.tree)}</ul>
          ) : readOnly ? (
            <p className={MUTED}>{t("pm.ui.noneYet")}</p>
          ) : (
            <AddForm label={t("pm.scope.wbs.newRoot")} placeholder={model.title} onSubmit={(text) => run({ type: "WBS_ADD", title: text })} />
          )}
        </div>
        <div className="grid content-start gap-[var(--ws-space-3)]">
          <Card padding="sm" tone="soft" data-orphans className="grid gap-2">
            <p className="font-semibold">{t("pm.scope.orphans.title")}</p>
            <p className={MUTED}>{t("pm.scope.orphans.lead")}</p>
            {orphans.length ? (
              <ul className="grid gap-3">
                {orphans.map((i) => {
                  const task = model.tasks.find((x) => x.id === i.taskId);
                  if (!task) return null;
                  const creep = Boolean(task.addedAfterBaseline && !task.changeId);
                  return (
                    <li key={i.taskId} data-orphan={task.id} className="grid gap-1">
                      <p className="text-[length:var(--ws-text-body-sm)]"><span className={cn(MONO, "font-semibold")}>{task.code}</span> {task.title}</p>
                      <div className="flex flex-wrap gap-1">
                        <Tag tone="warning">
                          <span aria-hidden>!</span>
                          {i.kind === "ATIVIDADE_SEM_PACOTE" ? t("pm.scope.issue.ATIVIDADE_SEM_PACOTE") : t("pm.scope.issue.ATIVIDADE_FORA_DO_PACOTE", { node: nodeCode.get(i.nodeId) ?? "?" })}
                        </Tag>
                        {creep ? <Tag tone="danger"><span aria-hidden>✕</span>{t("pm.scope.orphans.creep")}</Tag> : null}
                      </div>
                      <Select aria-label={t("pm.scope.orphans.link", { code: task.code })} value="" disabled={readOnly || !leaves.length}
                        options={[{ value: "", label: t("pm.scope.orphans.choose") }, ...leaves.map((l) => ({ value: l.node.id, label: `${l.code} ${l.node.title}` }))]}
                        onChange={(e) => { if (e.target.value) run({ type: "TASK_UPDATE", id: task.id, patch: { wbsId: e.target.value } }); }} />
                      {creep ? (
                        <p className={cn(MUTED, "flex flex-wrap items-center gap-2")}>
                          <span>{t("pm.scope.orphans.creepHint", { code: task.code })}</span>
                          {goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("controle")}>{t("pm.ui.goToTab", { tab: t("pm.tab.controle") })}</Button> : null}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={cn(CAPTION, "text-ws-success-ink")}><span aria-hidden>✓ </span>{t("pm.scope.orphans.none")}</p>
            )}
          </Card>
          <Theory refKey="EAP_REGRA_100">{t("pm.scope.wbs.theory100")}</Theory>
          <Theory refKey="EAP_SUBSTANTIVOS">{t("pm.scope.wbs.theoryNouns")}</Theory>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ requisitos

function RequirementsSection({ model, readOnly, selected, onSelect, run, wbs, trace }: SectionProps & { wbs: WbsView; trace: TraceView }) {
  const { t } = useI18n();
  const hid = useId();
  const [origin, setOrigin] = useState("");
  const rowOf = new Map(trace.rows.map((r) => [r.requirementId, r]));
  const stakeholders: SelectOption[] = [{ value: "", label: t("pm.ui.none") }, ...model.stakeholders.map((s) => ({ value: s.id, label: s.role ? `${s.name} · ${s.role}` : s.name }))];

  const card = (r: Requirement) => {
    const row = rowOf.get(r.id);
    const ref = `REQ:${r.id}` as const;
    const isSel = selected === ref;
    const missing = row ? (["origin", "deliverable", "test"] as const).filter((k) => (k === "origin" ? !row.origin : k === "deliverable" ? !row.deliverables.length : !row.test)) : [];
    // pacotes de trabalho (folhas) + qualquer entrega já ligada que deixou de ser folha (para poder desligar)
    const linkable = wbs.nodes.filter((n) => n.depth > 0 && (n.leaf || r.deliverableIds.includes(n.node.id)));
    const upd = (patch: Extract<ProjectCommand, { type: "REQ_UPDATE" }>["patch"]) => run({ type: "REQ_UPDATE", id: r.id, patch });
    return (
      <li key={r.id}>
        <Card padding="sm" role="group" aria-label={r.code} data-req={r.id} data-selected={isSel || undefined} className={cn("grid gap-2", isSel && "border-ws-accent bg-ws-accent-soft")}>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={isSel ? "primary" : "default"} aria-current={isSel || undefined} aria-label={t("pm.scope.req.select", { code: r.code })}
              onClick={() => onSelect?.(isSel ? null : ref)} className={MONO}>
              {r.code}
            </Button>
            {row?.complete ? (
              <Tag tone="success"><span aria-hidden>✓</span>{t("pm.scope.req.complete")}</Tag>
            ) : (
              missing.map((k) => <Tag key={k} tone="warning"><span aria-hidden>!</span>{t(`pm.scope.req.missing.${k}`)}</Tag>)
            )}
            <span className="ml-auto">{!readOnly ? <RemoveButton item={r.code} onConfirm={() => run({ type: "REQ_REMOVE", id: r.id })} /> : null}</span>
          </div>
          <div className="grid gap-2 @2xl:grid-cols-2">
            <CommitText label={t("pm.scope.req.text")} value={r.text} disabled={readOnly} onCommit={(v) => upd({ text: v })} className="@2xl:col-span-2" />
            <CommitText label={t("pm.scope.req.origin")} value={r.origin ?? ""} disabled={readOnly} placeholder={t("pm.scope.req.originPlaceholder")} onCommit={(v) => upd({ origin: v.trim() || undefined })} />
            <Field label={t("pm.scope.req.originStakeholder")}>
              {({ id }) => <Select id={id} value={r.originStakeholderId ?? ""} disabled={readOnly} options={stakeholders} onChange={(e) => upd({ originStakeholderId: e.target.value || undefined })} />}
            </Field>
            <CommitText label={t("pm.scope.req.test")} value={r.test ?? ""} disabled={readOnly} placeholder={t("pm.scope.req.testPlaceholder")} onCommit={(v) => upd({ test: v.trim() || undefined })}
              className="@2xl:col-span-2" />
          </div>
          <fieldset className="grid gap-0.5">
            <legend className={cn(CAPTION, "mb-1 font-semibold")}>{t("pm.scope.req.deliverables")}</legend>
            {linkable.length ? (
              linkable.map((n) => (
                <Checkbox
                  key={n.node.id}
                  checked={r.deliverableIds.includes(n.node.id)}
                  disabled={readOnly}
                  label={<><span className={MONO}>{n.code}</span> {n.node.title}{!n.leaf ? <>{" "}<span className="text-ws-text-muted">· {t("pm.scope.req.notLeaf")}</span></> : null}</>}
                  onCheckedChange={(on) => run({ type: "REQ_LINK", id: r.id, wbsId: n.node.id, on })}
                />
              ))
            ) : (
              <p className={MUTED}>{t("pm.scope.req.noLeaves")}</p>
            )}
          </fieldset>
        </Card>
      </li>
    );
  };

  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.scope.req.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.scope.req.lead")}</p>
      {model.requirements.length ? <ul className="grid gap-[var(--ws-space-3)] @4xl:grid-cols-2">{model.requirements.map(card)}</ul> : <p className={MUTED}>{t("pm.ui.noneYet")}</p>}
      {!readOnly ? (
        <Card padding="sm" tone="soft">
          <AddForm
            label={t("pm.scope.req.new")}
            placeholder={t("pm.scope.req.newPlaceholder")}
            submitLabel={t("pm.scope.req.add")}
            extra={
              <Field label={t("pm.scope.req.origin")} className="min-w-[10rem] flex-1">
                {({ id }) => <Input id={id} value={origin} placeholder={t("pm.scope.req.originPlaceholder")} onChange={(e) => setOrigin(e.target.value)} />}
              </Field>
            }
            onSubmit={(text) => {
              const r = run({ type: "REQ_ADD", text, origin: origin.trim() || undefined });
              if (r.ok) setOrigin("");
              return r;
            }}
          />
        </Card>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------ matriz de rastreabilidade

function TraceSection({ model, trace, wbs, metrics }: { model: ProjectModel; trace: TraceView; wbs: WbsView; metrics: ProjectMetrics }) {
  const { t } = useI18n();
  const hid = useId();
  const done = trace.rows.filter((r) => r.complete).length;
  const status = metrics.quality.find((m) => m.id === "Q_RASTREABILIDADE")?.status ?? "SEM_DADOS";
  const reqOf = new Map(model.requirements.map((r) => [r.id, r]));
  const nodeOf = new Map(wbs.nodes.map((n) => [n.node.id, n]));
  const reqItems = (ids: readonly string[]) => ids.flatMap((id) => {
    const r = reqOf.get(id);
    return r ? [{ id, code: r.code, text: r.text }] : [];
  });
  const missing = <span className="text-ws-danger-ink"><span aria-hidden>✕ </span>{t("pm.scope.trace.missing")}</span>;
  const cell = "px-2 py-1.5";
  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.scope.trace.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.scope.trace.lead")}</p>
      <div className="grid gap-[var(--ws-space-4)] @5xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="grid content-start gap-3">
          <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
            <table className="w-full min-w-[34rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-trace-matrix>
              <caption className="sr-only">{t("pm.scope.trace.caption")}</caption>
              <thead className="bg-ws-surface-2 text-left text-[length:var(--ws-text-caption)] text-ws-text-muted">
                <tr>
                  {(["req", "origin", "deliverables", "test", "complete"] as const).map((c) => <th key={c} scope="col" className={cn(cell, "font-semibold")}>{t(`pm.scope.trace.col.${c}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {trace.rows.map((row) => (
                  <tr key={row.requirementId} data-trace={row.requirementId} data-complete={row.complete} className="border-t border-ws-border align-top">
                    <th scope="row" className={cn(cell, "text-left font-normal")}><span className={cn(MONO, "font-semibold")}>{row.code}</span> {row.text}</th>
                    <td className={cell}>{row.origin ?? missing}</td>
                    <td className={cell}>
                      {row.deliverables.length ? (
                        <ul className="grid gap-0.5">{row.deliverables.map((d) => <li key={d.id}><span className={cn(MONO, "font-semibold")}>{d.code}</span> {d.title}</li>)}</ul>
                      ) : missing}
                    </td>
                    <td className={cell}>{row.test ?? missing}</td>
                    <td className={cell}>
                      {row.complete
                        ? <Tag tone="success"><span aria-hidden>✓</span>{t("pm.scope.trace.yes")}</Tag>
                        : <Tag tone="danger"><span aria-hidden>✕</span>{t("pm.scope.trace.no")}</Tag>}
                    </td>
                  </tr>
                ))}
                {!trace.rows.length ? <tr><td colSpan={5} className={cn(cell, "text-center text-ws-text-muted")}>{t("pm.ui.noneYet")}</td></tr> : null}
              </tbody>
            </table>
          </div>
          <PercentBar value={trace.coverage} label={t("pm.scope.trace.coverage")} tone={STATUS_BAR[status]} />
          <p className={cn(MUTED, "font-[family-name:var(--ws-font-mono)]")}>{t("pm.scope.trace.formula", { done, total: trace.rows.length, coverage: trace.coverage })}</p>
        </div>
        <div className="grid content-start gap-3">
          <DiagnosticList kind="untraced" title={t("pm.scope.trace.untraced")} tone="danger" items={reqItems(trace.untraced)} hint={t("pm.scope.trace.untracedHint")} />
          <DiagnosticList kind="untested" title={t("pm.scope.trace.untested")} tone="danger" items={reqItems(trace.untested)} hint={t("pm.scope.trace.untestedHint")} />
          <DiagnosticList
            kind="gold"
            title={t("pm.scope.trace.goldPlating")}
            tone="warning"
            items={trace.goldPlating.flatMap((id) => {
              const n = nodeOf.get(id);
              return n ? [{ id, code: n.code, text: n.node.title }] : [];
            })}
            hint={t("pm.scope.trace.goldHint")}
          />
        </div>
      </div>
      <div className="grid gap-[var(--ws-space-3)] @3xl:grid-cols-2">
        <Theory refKey="RASTREABILIDADE">{t("pm.scope.trace.theory")}</Theory>
        <Theory refKey="GOLD_PLATING">{t("pm.scope.trace.theoryGold")}</Theory>
      </div>
    </section>
  );
}

function DiagnosticList({ kind, title, items, tone, hint }: { kind: string; title: string; items: { id: string; code: string; text: string }[]; tone: "danger" | "warning"; hint: string }) {
  const { t } = useI18n();
  return (
    <div data-diagnostic={kind} className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
      <p className="flex items-center justify-between gap-2 text-[length:var(--ws-text-body-sm)] font-semibold">
        <span>{title}</span>
        <Tag tone={items.length ? tone : "success"}>
          <span aria-hidden>{items.length ? (tone === "danger" ? "✕" : "!") : "✓"}</span>
          <span className={MONO}>{items.length}</span>
        </Tag>
      </p>
      {items.length ? (
        <>
          <ul className={cn("grid gap-0.5", CAPTION)}>{items.map((i) => <li key={i.id}><span className={cn(MONO, "font-semibold")}>{i.code}</span> {i.text}</li>)}</ul>
          <p className={MUTED}>{hint}</p>
        </>
      ) : (
        <p className={MUTED}>{t("pm.scope.trace.noneFound")}</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ MoSCoW

/** Depois de um comando que muda o item de grupo, devolve o foco ao controle dele (o teclado não se perde). */
function useFocusAfterMove() {
  const root = useRef<HTMLElement>(null);
  const pending = useRef<string | null>(null);
  useEffect(() => {
    const key = pending.current;
    if (!key) return;
    pending.current = null;
    root.current?.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)?.focus();
  });
  return { root, mark: (key: string) => { pending.current = key; } };
}

const MOSCOW_GROUPS: readonly (Moscow | "NONE")[] = [...MOSCOW, "NONE"];

function MoscowSection({ model, readOnly, selected, run }: SectionProps) {
  const { t, intl } = useI18n();
  const hid = useId();
  const focus = useFocusAfterMove();
  // marcos não têm trabalho a priorizar
  const work = model.tasks.filter((x) => !x.milestone);
  const days = (list: readonly Task[]) => list.reduce((s, x) => s + effectiveDuration(x), 0);
  const total = days(work);
  const options: SelectOption[] = [{ value: "", label: t("pm.scope.moscow.none") }, ...MOSCOW.map((m) => ({ value: m, label: t(`pm.moscow.${m}`) }))];
  return (
    <section ref={focus.root} aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.scope.moscow.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.scope.moscow.lead")}</p>
      <div className="grid gap-[var(--ws-space-3)] @2xl:grid-cols-2 @5xl:grid-cols-5">
        {MOSCOW_GROUPS.map((g) => {
          const list = work.filter((x) => (x.moscow ?? "NONE") === g);
          const d = days(list);
          return (
            <Card key={g} padding="sm" data-moscow={g} className="grid content-start gap-2">
              <div>
                <p className="font-semibold">{g === "NONE" ? t("pm.scope.moscow.none") : t(`pm.moscow.${g}`)}</p>
                <p className={MUTED}>{g === "NONE" ? t("pm.scope.moscow.hint.NONE") : t(`pm.scope.moscow.hint.${g}`)}</p>
                <p className={cn(CAPTION, MONO)}>{t("pm.scope.moscow.summary", { n: list.length, days: fmt.number(intl, d, 1), share: fmt.percent(intl, total ? d / total : 0) })}</p>
              </div>
              {list.length ? (
                <ul className="grid gap-2">
                  {list.map((x) => {
                    const isSel = selected === `TASK:${x.id}`;
                    return (
                      <li key={x.id} data-moscow-task={x.id} data-selected={isSel || undefined} className={cn("grid gap-1 rounded-[var(--ws-radius-sm)] p-1", isSel && "bg-ws-accent-soft")}>
                        <p className="text-[length:var(--ws-text-body-sm)]"><span className={cn(MONO, "font-semibold")}>{x.code}</span> {x.title}</p>
                        <Select
                          aria-label={t("pm.scope.moscow.label", { code: x.code })}
                          data-focus-key={x.id}
                          value={x.moscow ?? ""}
                          disabled={readOnly}
                          options={options}
                          onChange={(e) => {
                            focus.mark(x.id);
                            run({ type: "TASK_UPDATE", id: x.id, patch: { moscow: (e.target.value || undefined) as Moscow | undefined } });
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={MUTED}>{t("pm.scope.moscow.empty")}</p>
              )}
            </Card>
          );
        })}
      </div>
      <Theory refKey="MOSCOW_TIMEBOX">{t("pm.scope.moscow.theory")}</Theory>
    </section>
  );
}
