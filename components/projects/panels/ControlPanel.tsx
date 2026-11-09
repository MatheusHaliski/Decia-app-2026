"use client";
/**
 * Aba "Controle" da Mesa de Trabalho (RF22) — monitoramento e controle é TRANSVERSAL a todas as fases (aula de projetos, Tema 4;
 * aula de governança, ITIL): valor agregado sobre a linha de base, atualização de progresso, controle integrado de mudanças
 * (solicitar → analisar o impacto → CCB/CAB decide → atualizar a linha de base → comunicar), scope creep, lições aprendidas ao
 * longo do projeto e histórico de versões (RF22.CA02). Nada é calculado aqui: os números vêm de `evmView`/`computeMetrics` e as
 * transições válidas vêm do próprio núcleo (`applyCommand` em simulação, sem despachar); toda edição é um comando.
 *
 * Também exporta as peças que a aba "Encerramento" reaproveita (indicadores da aba, lições aprendidas, aviso de erro).
 */
import { useMemo, useState, type FormEvent } from "react";
import { Button, Card, Dialog, Field, Input, Link, PercentBar, Select, Tag, Textarea, cn, type Tone } from "@/components/ui";
import { CommitNumber, CommitText, MetricStatusTag, SectionTitle, Theory, metricText, versionSummary } from "@/components/projects/common";
import { fmt, nameOf, type DeciaActions, type PanelProps, type PeopleDirectory } from "@/components/projects/shared";
import { useI18n } from "@/lib/i18n/useI18n";
import { applyCommand, type CommandResult, type ProjectCommand } from "@/lib/projects/commands";
import { earnedAndActual, type CostVerdict, type ScheduleVerdict } from "@/lib/projects/engine/evm";
import { computeMetrics, type MetricStatus, type WorkspaceTab } from "@/lib/projects/metrics";
import {
  FLOW_STATUSES, PROJECT_PHASES, type ChangeImpact, type ChangeRequest, type ChangeStatus, type ChangeType, type FlowStatus, type Lesson,
  type ProjectModel, type ProjectPhase, type SevenRs, type Task,
} from "@/lib/projects/types";
import { evmView, timelineView } from "@/lib/projects/views";

type Dispatch = PanelProps["dispatch"];
type Send = (cmd: ProjectCommand) => CommandResult;

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const LABEL = "font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted";
const BODY_SM = "text-[length:var(--ws-text-body-sm)]";
const HISTORY_LIMIT = 15;

// ------------------------------------------------------------------ peças compartilhadas com a aba Encerramento

/** Despacha e guarda o erro traduzido para mostrar perto do controle (a área de trabalho também avisa). */
export function useSend(dispatch: Dispatch): { send: Send; error: string | null } {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const send: Send = (cmd) => {
    const r = dispatch(cmd);
    setError(r.ok ? null : t(`pm.err.${r.error}`));
    return r;
  };
  return { send, error };
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p role="alert" className="rounded-[var(--ws-radius-sm)] bg-ws-danger-soft px-2 py-1 text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{error}</p>;
}

/** Indicadores de `computeMetrics` que apontam para esta aba — os mesmos textos do "Feedback da IA". */
export function TabMetrics({ model, tab }: { model: ProjectModel; tab: WorkspaceTab }) {
  const { t, intl } = useI18n();
  const metrics = useMemo(() => {
    const m = computeMetrics(model);
    return [...m.quality, ...m.governance, ...m.group].filter((x) => x.tab === tab);
  }, [model, tab]);
  if (!metrics.length) return null;
  return (
    <section aria-label={t("pm.ctl.metrics.title")} className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={LABEL}>{t("pm.ctl.metrics.title")}</p>
        <p className={CAPTION}>{t("pm.ctl.metrics.hint")}</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => {
          const text = metricText(t, intl, m);
          return (
            <li key={m.id} data-metric={m.id} data-status={m.status} className="grid content-start gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
              <div className="flex items-start justify-between gap-2">
                <p className={cn(BODY_SM, "font-semibold")}>{text.title}</p>
                <MetricStatusTag status={m.status} className="shrink-0" />
              </div>
              <p className={CAPTION}>{text.detail}</p>
              {m.status === "ATENCAO" || m.status === "CRITICO" ? <p className="text-[length:var(--ws-text-caption)] text-ws-text">{text.advice}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const LESSON_KINDS: readonly Lesson["kind"][] = ["POSITIVA", "NEGATIVA"];
const LESSON_TONE: Record<Lesson["kind"], Tone> = { POSITIVA: "success", NEGATIVA: "warning" };
const LESSON_MARK: Record<Lesson["kind"], string> = { POSITIVA: "✓", NEGATIVA: "✕" };
const livedPhases = (model: ProjectModel) => PROJECT_PHASES.slice(0, PROJECT_PHASES.indexOf(model.currentPhase) + 1);

/** Registro de lição aprendida (`LESSON_ADD`): texto, tipo e uma das fases já vividas. */
export function LessonComposer({ model, dispatch }: { model: ProjectModel; dispatch: Dispatch }) {
  const { t } = useI18n();
  const { send, error } = useSend(dispatch);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Lesson["kind"]>("POSITIVA");
  const [phase, setPhase] = useState<ProjectPhase>(model.currentPhase);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (send({ type: "LESSON_ADD", text, kind, phase }).ok) setText("");
  };
  return (
    <form className="grid gap-2" onSubmit={submit}>
      <Field label={t("pm.ctl.lessons.text")}>
        {({ id }) => <Textarea id={id} value={text} placeholder={t("pm.ctl.lessons.placeholder")} onChange={(e) => setText(e.target.value)} className="min-h-16" />}
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t("pm.ctl.lessons.kind")}>
          {({ id }) => (
            <Select id={id} value={kind} options={LESSON_KINDS.map((k) => ({ value: k, label: t(`pm.lessonKind.${k}`) }))} onChange={(e) => setKind(e.target.value as Lesson["kind"])} />
          )}
        </Field>
        <Field label={t("pm.ctl.lessons.phase")}>
          {({ id }) => (
            <Select id={id} value={phase} options={livedPhases(model).map((p) => ({ value: p, label: t(`pm.phase.${p}`) }))} onChange={(e) => setPhase(e.target.value as ProjectPhase)} />
          )}
        </Field>
      </div>
      <ErrorNote error={error} />
      <div>
        <Button type="submit" size="sm" variant="primary">{t("pm.ctl.lessons.add")}</Button>
      </div>
    </form>
  );
}

function LessonItem({ lesson, people, showKind }: { lesson: Lesson; people: PeopleDirectory; showKind: boolean }) {
  const { t, intl } = useI18n();
  return (
    <li className="grid gap-0.5 rounded-[var(--ws-radius-sm)] bg-ws-surface-2 px-2 py-1.5" data-lesson={lesson.kind}>
      {showKind ? (
        <Tag tone={LESSON_TONE[lesson.kind]} className="justify-self-start">
          <span aria-hidden>{LESSON_MARK[lesson.kind]}</span>
          {t(`pm.lessonKind.${lesson.kind}`)}
        </Tag>
      ) : null}
      <span className={cn(BODY_SM, "break-words")}>{lesson.text}</span>
      <span className={CAPTION}>{nameOf(people, lesson.authorId)} · {fmt.date(intl, lesson.at)}</span>
    </li>
  );
}

/** Lições agrupadas por fase (na ordem do ciclo de vida); `splitByKind` separa o que funcionou do que não funcionou. */
export function LessonsByPhase({ model, people, splitByKind = false }: { model: ProjectModel; people: PeopleDirectory; splitByKind?: boolean }) {
  const { t } = useI18n();
  const phases = PROJECT_PHASES.filter((p) => model.lessons.some((l) => l.phase === p));
  if (!phases.length) return <p className={CAPTION}>{t("pm.ctl.lessons.none")}</p>;
  return (
    <div className="grid gap-3">
      {phases.map((p) => {
        const list = model.lessons.filter((l) => l.phase === p);
        return (
          <section key={p} aria-label={t(`pm.phase.${p}`)} className="grid gap-1.5" data-lesson-phase={p}>
            <h4 className={LABEL}>
              {t(`pm.phase.${p}`)} <span className="tabular-nums">({list.length})</span>
            </h4>
            {splitByKind ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {LESSON_KINDS.map((k) => {
                  const ofKind = list.filter((l) => l.kind === k);
                  return (
                    <div key={k} className="grid content-start gap-1">
                      <p className={cn(CAPTION, "font-semibold")}>
                        <span aria-hidden>{LESSON_MARK[k]} </span>
                        {t(`pm.lessonKind.${k}`)} <span className="tabular-nums">({ofKind.length})</span>
                      </p>
                      {ofKind.length ? (
                        <ul className="grid gap-1">{ofKind.map((l) => <LessonItem key={l.id} lesson={l} people={people} showKind={false} />)}</ul>
                      ) : (
                        <p className={CAPTION}>{t("pm.ui.noneYet")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="grid gap-1">{list.map((l) => <LessonItem key={l.id} lesson={l} people={people} showKind />)}</ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ regras lidas do núcleo

const PREVIEW_CTX = { actorId: "preview", now: new Date(0) };
/** O comando seria aceito agora? Pergunta ao próprio núcleo (função pura), sem despachar: a UI não duplica as regras. */
const allowed = (model: ProjectModel, cmd: ProjectCommand) => applyCommand(model, cmd, PREVIEW_CTX).ok;

/** Atividades criadas depois da linha de base sem mudança aprovada (scope creep) — mesma regra do núcleo e do quadro. */
const creepTasks = (model: ProjectModel) => model.tasks.filter((t) => t.addedAfterBaseline && !t.changeId);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A solicitação cita a atividade (título ou "relação com outras mudanças") — é assim que a regularização fica ligada a ela. */
const mentions = (c: ChangeRequest, code: string) => new RegExp(`\\b${escapeRe(code)}\\b`).test(`${c.title} ${c.sevenRs.relationship ?? ""}`);
/** Scope creep ainda sem mudança aprovada/implementada que o regularize (o que uma nova linha de base "legalizaria"). */
const unregularized = (model: ProjectModel) =>
  creepTasks(model).filter((x) => !model.changes.some((c) => (c.status === "APROVADA" || c.status === "IMPLEMENTADA") && mentions(c, x.code)));

// ------------------------------------------------------------------ valor agregado + linha de base

type Judge = "good" | "bad" | null;
const COST_TONE: Record<CostVerdict, Tone> = { ABAIXO_DO_ORCAMENTO: "success", NO_ORCAMENTO: "info", ACIMA_DO_ORCAMENTO: "danger" };
const SCHEDULE_TONE: Record<ScheduleVerdict, Tone> = { ADIANTADO: "success", NO_PRAZO: "info", ATRASADO: "danger" };
interface Indicator { id: string; value: string; calc?: string; judge?: Judge }

function IndicatorGroup({ title, items, cols }: { title: string; items: readonly Indicator[]; cols: string }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-2">
      <p className={LABEL}>{title}</p>
      <dl className={cn("grid gap-2", cols)}>
        {items.map((it) => (
          <div key={it.id} data-evm={it.id} className="grid content-start gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
            <dt className="grid">
              <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] font-bold text-ws-text">{t(`pm.ctl.evm.${it.id}.abbr`)}</span>
              <span className={CAPTION}>{t(`pm.ctl.evm.${it.id}.name`)}</span>
            </dt>
            <dd className="grid gap-0.5">
              <span className={cn("text-[length:var(--ws-text-h3)] font-semibold tabular-nums", it.judge === "good" && "text-ws-success-ink", it.judge === "bad" && "text-ws-danger-ink")}>
                <span data-value>{it.value}</span>
                {it.judge ? <span className="ml-1.5 text-[length:var(--ws-text-caption)] font-medium">{t(`pm.ctl.evm.${it.judge}`)}</span> : null}
              </span>
              <span className="break-words font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">
                {t(`pm.ctl.evm.${it.id}.formula`)}
                {it.calc ? ` = ${it.calc}` : ""}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BaselineBox({ model, send, locked }: { model: ProjectModel; send: Send; locked: boolean }) {
  const { t, intl } = useI18n();
  const [open, setOpen] = useState(false);
  const b = model.baseline;
  const tl = useMemo(() => timelineView(model), [model]);
  const pendingCreep = unregularized(model);
  return (
    <div className="grid content-start gap-2">
      <p className={cn(BODY_SM, "font-semibold")}>{t("pm.ctl.base.title")}</p>
      {b ? (
        <p className={BODY_SM} data-baseline="set">{t("pm.ctl.base.set", { date: fmt.date(intl, b.setAt), finish: fmt.number(intl, b.finish, 1), bac: fmt.money(intl, b.bac) })}</p>
      ) : (
        <p className={cn(BODY_SM, "text-ws-warning-ink")} data-baseline="none">{t("pm.ctl.base.none")}</p>
      )}
      <Theory refKey="CTL_LINHA_DE_BASE">{t("pm.ctl.base.what")}</Theory>
      {!locked ? (
        <div>
          <Button size="sm" variant={b ? "default" : "primary"} disabled={!tl.ok} onClick={() => setOpen(true)}>
            {t(b ? "pm.ctl.base.reapprove" : "pm.ctl.base.approve")}
          </Button>
        </div>
      ) : null}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t("pm.ctl.base.dialogTitle")}
        description={t("pm.ctl.base.dialogBody", { n: model.tasks.length, finish: fmt.number(intl, tl.finish, 1), bac: fmt.money(intl, earnedAndActual(model.tasks).bac) })}
      >
        <div className="grid gap-3">
          <p className={BODY_SM}>{t("pm.ctl.base.why")}</p>
          {pendingCreep.length ? (
            <p role="alert" className="rounded-[var(--ws-radius-sm)] bg-ws-danger-soft px-2 py-1.5 text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">
              {t("pm.ctl.base.creepWarning", { codes: pendingCreep.map((x) => x.code).join(", ") })}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setOpen(false)}>{t("pm.ui.cancel")}</Button>
            <Button
              variant="primary"
              onClick={() => {
                send({ type: "BASELINE_SET" });
                setOpen(false);
              }}
            >
              {t("pm.ctl.base.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function EvmSection({ model, dispatch, locked, goTo }: { model: ProjectModel; dispatch: Dispatch; locked: boolean; goTo?: PanelProps["goTo"] }) {
  const { t, intl } = useI18n();
  const { send, error } = useSend(dispatch);
  const e = useMemo(() => evmView(model), [model]);
  const m = (v: number | null) => fmt.money(intl, v);
  const ix = (v: number | null, digits = 2) => (v === null ? "—" : new Intl.NumberFormat(intl, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v));
  const cents = (v: number) => new Intl.NumberFormat(intl, { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  // o veredito do motor decide a cor (e o texto) de variação e índice: mesma tolerância da aula, nada recalculado aqui
  const costJudge: Judge = e.cost === "ABAIXO_DO_ORCAMENTO" ? "good" : e.cost === "ACIMA_DO_ORCAMENTO" ? "bad" : null;
  const scheduleJudge: Judge = e.schedule === "ADIANTADO" ? "good" : e.schedule === "ATRASADO" ? "bad" : null;

  const inputs: Indicator[] = [
    { id: "pv", value: m(e.pv) },
    { id: "ev", value: m(e.ev) },
    { id: "ac", value: m(e.ac) },
    { id: "bac", value: m(e.bac) },
  ];
  const performance: Indicator[] = [
    { id: "cv", value: m(e.cv), calc: `${m(e.ev)} − ${m(e.ac)}`, judge: costJudge },
    { id: "sv", value: m(e.sv), calc: `${m(e.ev)} − ${m(e.pv)}`, judge: scheduleJudge },
    { id: "cpi", value: ix(e.cpi), calc: e.cpi === null ? undefined : `${m(e.ev)} ÷ ${m(e.ac)}`, judge: costJudge },
    { id: "spi", value: ix(e.spi), calc: e.spi === null ? undefined : `${m(e.ev)} ÷ ${m(e.pv)}`, judge: scheduleJudge },
  ];
  const forecasts: Indicator[] = [
    { id: "eac", value: m(e.eac), calc: e.cpi ? `${m(e.bac)} ÷ ${ix(e.cpi, 4)}` : undefined },
    { id: "eacAtypical", value: m(e.eacAtypical), calc: `${m(e.ac)} + (${m(e.bac)} − ${m(e.ev)})` },
    { id: "eacComposite", value: m(e.eacComposite), calc: e.cpi && e.spi ? `${m(e.ac)} + (${m(e.bac)} − ${m(e.ev)}) ÷ (${ix(e.cpi, 4)} × ${ix(e.spi, 4)})` : undefined },
    { id: "etc", value: m(e.etc), calc: e.eac === null ? undefined : `${m(e.eac)} − ${m(e.ac)}` },
    { id: "vac", value: m(e.vac), calc: e.eac === null ? undefined : `${m(e.bac)} − ${m(e.eac)}`, judge: e.vac === null ? null : costJudge },
    { id: "tcpi", value: ix(e.tcpi), calc: e.tcpi === null ? undefined : `(${m(e.bac)} − ${m(e.ev)}) ÷ (${m(e.bac)} − ${m(e.ac)})` },
  ];

  return (
    <Card as="section" aria-labelledby="ctl-evm" className="grid gap-[var(--ws-space-4)]">
      <SectionTitle id="ctl-evm" actions={goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("cronograma")}>{t("pm.ctl.evm.curve")}</Button> : null}>
        {t("pm.ctl.evm.title")}
      </SectionTitle>
      <div className="grid gap-[var(--ws-space-4)] md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field label={t("pm.ctl.evm.statusDate")} hint={t("pm.ctl.evm.statusDateHint", { day: e.statusOffset })} className="content-start">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="date"
              value={model.statusDate}
              disabled={locked}
              onChange={(ev) => ev.target.value && send({ type: "SET_STATUS_DATE", date: ev.target.value })}
              className="max-w-48 tabular-nums"
            />
          )}
        </Field>
        <BaselineBox model={model} send={send} locked={locked} />
      </div>
      <ErrorNote error={error} />
      {!e.usesBaseline ? <p className={cn(BODY_SM, "text-ws-warning-ink")}>{t("pm.ctl.evm.noBaseline")}</p> : null}

      <div className="flex flex-wrap gap-2" aria-live="polite">
        <Tag tone={e.cost ? COST_TONE[e.cost] : "neutral"}>{t("pm.ctl.evm.costVerdict", { verdict: e.cost ? t(`pm.costVerdict.${e.cost}`) : t("pm.ctl.evm.noVerdict") })}</Tag>
        <Tag tone={e.schedule ? SCHEDULE_TONE[e.schedule] : "neutral"}>
          {t("pm.ctl.evm.scheduleVerdict", { verdict: e.schedule ? t(`pm.scheduleVerdict.${e.schedule}`) : t("pm.ctl.evm.noVerdict") })}
        </Tag>
      </div>

      <IndicatorGroup title={t("pm.ctl.evm.group.inputs")} items={inputs} cols="sm:grid-cols-2 xl:grid-cols-4" />
      <IndicatorGroup title={t("pm.ctl.evm.group.performance")} items={performance} cols="sm:grid-cols-2 xl:grid-cols-4" />
      <IndicatorGroup title={t("pm.ctl.evm.group.forecast")} items={forecasts} cols="sm:grid-cols-2 xl:grid-cols-3" />

      <ul className={cn(BODY_SM, "grid list-disc gap-1 pl-5")}>
        <li>{e.cpi !== null ? t("pm.ctl.evm.read.cpi", { one: cents(1), value: cents(e.cpi) }) : t("pm.ctl.evm.read.noAc")}</li>
        <li>{e.spi !== null ? t("pm.ctl.evm.read.spi", { pct: fmt.percent(intl, e.spi) }) : t("pm.ctl.evm.read.noPv")}</li>
        {e.tcpi !== null ? <li>{t("pm.ctl.evm.read.tcpi", { one: cents(1), value: cents(e.tcpi) })}</li> : null}
        <li className="text-ws-text-muted">{t("pm.ctl.evm.rule")}</li>
      </ul>
      <Theory refKey="CTL_EVM">{t("pm.ctl.evm.theory")}</Theory>
    </Card>
  );
}

// ------------------------------------------------------------------ atualização de progresso

function ProgressRow({ task, model, send, locked }: { task: Task; model: ProjectModel; send: Send; locked: boolean }) {
  const { t, intl } = useI18n();
  const { ev } = earnedAndActual([task]);
  const creep = task.addedAfterBaseline && !task.changeId;
  const change = task.changeId ? model.changes.find((c) => c.id === task.changeId) : undefined;
  const over = task.actualCost > ev;
  const cell = "px-2 py-2 align-top";
  return (
    <tr className="border-t border-ws-border" data-task={task.code}>
      <th scope="row" className={cn(cell, "min-w-[14rem] pl-0 text-left font-normal")}>
        <span className="font-[family-name:var(--ws-font-mono)] font-semibold">{task.code}</span> <span>{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          <span className={CAPTION}>{t(`pm.phase.${task.phase}`)}</span>
          {task.milestone ? <Tag>{t("pm.ctl.progress.milestone")}</Tag> : null}
          {creep ? (
            <Tag tone="danger">
              <span aria-hidden>✕</span>
              {t("pm.ctl.progress.creep")}
            </Tag>
          ) : null}
          {change ? <Tag tone="info">{t("pm.ctl.progress.change", { code: change.code })}</Tag> : null}
        </span>
      </th>
      <td className={cell}>
        {locked ? (
          t(`pm.status.${task.status}`)
        ) : (
          <Select
            aria-label={t("pm.ctl.progress.aria.status", { code: task.code })}
            value={task.status}
            options={FLOW_STATUSES.map((s) => ({ value: s, label: t(`pm.status.${s}`) }))}
            onChange={(e) => send({ type: "TASK_UPDATE", id: task.id, patch: { status: e.target.value as FlowStatus } })}
            className="min-w-[10.5rem]"
          />
        )}
      </td>
      <td className={cn(cell, "tabular-nums")}>
        {locked ? (
          fmt.percent(intl, task.percentComplete / 100)
        ) : (
          <CommitNumber bare label={t("pm.ctl.progress.aria.percent", { code: task.code })} value={task.percentComplete} min={0} max={100} suffix="%" className="max-w-[4.75rem]"
            onCommit={(v) => send({ type: "TASK_UPDATE", id: task.id, patch: { percentComplete: v } })} />
        )}
      </td>
      <td className={cn(cell, "tabular-nums")}>
        {locked ? (
          fmt.money(intl, task.budget)
        ) : (
          <CommitNumber bare label={t("pm.ctl.progress.aria.budget", { code: task.code })} value={task.budget} min={0} className="max-w-[7.5rem]"
            onCommit={(v) => send({ type: "TASK_UPDATE", id: task.id, patch: { budget: v } })} />
        )}
      </td>
      <td className={cn(cell, "tabular-nums")}>
        {locked ? (
          fmt.money(intl, task.actualCost)
        ) : (
          <CommitNumber bare label={t("pm.ctl.progress.aria.actual", { code: task.code })} value={task.actualCost} min={0} className="max-w-[7.5rem]"
            onCommit={(v) => send({ type: "TASK_UPDATE", id: task.id, patch: { actualCost: v } })} />
        )}
      </td>
      <td className={cn(cell, "tabular-nums")}>
        <span className="grid justify-items-start gap-1">
          <span>{fmt.money(intl, ev)}</span>
          {over ? (
            <Tag tone="warning">
              <span aria-hidden>!</span>
              {t("pm.ctl.progress.over")}
            </Tag>
          ) : null}
        </span>
      </td>
    </tr>
  );
}

function ProgressSection({ model, dispatch, locked }: { model: ProjectModel; dispatch: Dispatch; locked: boolean }) {
  const { t } = useI18n();
  const { send, error } = useSend(dispatch);
  const tasks = useMemo(() => [...model.tasks].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })), [model.tasks]);
  const head = "px-2 py-1.5 text-left align-bottom font-semibold";
  return (
    <Card as="section" aria-labelledby="ctl-progress" className="grid gap-3">
      <SectionTitle id="ctl-progress">{t("pm.ctl.progress.title")}</SectionTitle>
      <p className={CAPTION}>{t("pm.ctl.progress.hint")}</p>
      <ErrorNote error={error} />
      {tasks.length ? (
        <div className="overflow-x-auto">
          <table className={cn(BODY_SM, "w-full min-w-[46rem] border-collapse")}>
            <caption className="sr-only">{t("pm.ctl.progress.caption")}</caption>
            <thead className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
              <tr>
                <th scope="col" className={cn(head, "pl-0")}>{t("pm.ctl.progress.col.task")}</th>
                <th scope="col" className={head}>{t("pm.ctl.progress.col.status")}</th>
                <th scope="col" className={head}>{t("pm.ctl.progress.col.percent")}</th>
                <th scope="col" className={head}>{t("pm.ctl.progress.col.budget")}</th>
                <th scope="col" className={head}>{t("pm.ctl.progress.col.actual")}</th>
                <th scope="col" className={head}>{t("pm.ctl.progress.col.earned")}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <ProgressRow key={task.id} task={task} model={model} send={send} locked={locked} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={CAPTION}>{t("pm.ctl.progress.empty")}</p>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ controle integrado de mudanças

const CHANGE_TYPES: readonly ChangeType[] = ["PADRAO", "NORMAL", "EMERGENCIAL"];
const CHANGE_STATUSES: readonly ChangeStatus[] = ["SOLICITADA", "EM_ANALISE", "APROVADA", "IMPLEMENTADA", "REJEITADA"];
const CHANGE_TONE: Record<ChangeStatus, Tone> = { SOLICITADA: "neutral", EM_ANALISE: "info", APROVADA: "accent", IMPLEMENTADA: "success", REJEITADA: "danger" };
const CHANGE_ORDER: Record<ChangeStatus, number> = { EM_ANALISE: 0, SOLICITADA: 1, APROVADA: 2, IMPLEMENTADA: 3, REJEITADA: 4 };
/** Transições oferecidas como botão; IMPLEMENTADA tem botão próprio ("Implementar"). Só aparecem as que o núcleo aceitaria. */
const NEXT: readonly ChangeStatus[] = ["EM_ANALISE", "APROVADA", "REJEITADA"];
/** As seis restrições concorrentes, na ordem da aula. */
const IMPACT_KEYS: readonly (keyof ChangeImpact)[] = ["scope", "scheduleDays", "cost", "quality", "resources", "risk"];
const NUMERIC_IMPACT = new Set<keyof ChangeImpact>(["scheduleDays", "cost"]);
const LEVELS = [0, 1, 2, 3, 4, 5] as const;
const SEVEN_RS: readonly (keyof SevenRs)[] = ["raised", "reason", "returnExpected", "risks", "resources", "responsible", "relationship"];
const FLOW_STEPS = ["request", "analyze", "decide", "rebaseline", "communicate"] as const;

const impactPatch = (k: keyof ChangeImpact, v: number) => ({ [k]: v }) as Partial<ChangeImpact>;
const sevenRsPatch = (k: keyof SevenRs, v: string) => ({ [k]: v.trim() || undefined }) as SevenRs;

function ImpactEditor({ change: c, send }: { change: ChangeRequest; send: Send }) {
  const { t } = useI18n();
  const levelOptions = (current: number) => {
    const opts = LEVELS.map((l) => ({ value: String(l), label: t(`pm.ctl.chg.level.${l}`) }));
    return (LEVELS as readonly number[]).includes(current) ? opts : [...opts, { value: String(current), label: String(current) }];
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {IMPACT_KEYS.map((k) =>
        NUMERIC_IMPACT.has(k) ? (
          <CommitNumber key={k} label={t(`pm.impact.${k}`)} value={c.impact[k]} className="content-start" onCommit={(v) => send({ type: "CHANGE_UPDATE", id: c.id, impact: impactPatch(k, v) })} />
        ) : (
          <Field key={k} label={t(`pm.impact.${k}`)} className="content-start">
            {({ id }) => (
              <Select id={id} value={String(c.impact[k])} options={levelOptions(c.impact[k])}
                onChange={(e) => send({ type: "CHANGE_UPDATE", id: c.id, impact: impactPatch(k, Number(e.target.value)) })} />
            )}
          </Field>
        ),
      )}
    </div>
  );
}

function ImpactSummary({ impact }: { impact: ChangeImpact }) {
  const { t, intl } = useI18n();
  const shown = (k: keyof ChangeImpact) =>
    k === "cost" ? fmt.money(intl, impact.cost) : k === "scheduleDays" ? t("pm.ui.daysShort", { n: fmt.number(intl, impact.scheduleDays, 1) })
      : (LEVELS as readonly number[]).includes(impact[k]) ? t(`pm.ctl.chg.level.${impact[k]}`) : String(impact[k]);
  return (
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {IMPACT_KEYS.map((k) => (
        <div key={k} className="flex justify-between gap-2 border-b border-ws-border py-1">
          <dt className={CAPTION}>{t(`pm.impact.${k}`)}</dt>
          <dd className={cn(BODY_SM, "tabular-nums")}>{shown(k)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChangeCard({ change: c, model, people, locked, send, decia, onImplement }: {
  change: ChangeRequest;
  model: ProjectModel;
  people: PeopleDirectory;
  locked: boolean;
  send: Send;
  decia?: DeciaActions;
  onImplement: (c: ChangeRequest) => void;
}) {
  const { t, intl } = useI18n();
  const open = c.status === "SOLICITADA" || c.status === "EM_ANALISE";
  const [expanded, setExpanded] = useState(open);
  const editable = open && !locked;
  const answered = SEVEN_RS.filter((k) => (c.sevenRs[k] ?? "").trim()).length;
  const noImpact = Object.values(c.impact).every((v) => v === 0);
  // mudança normal já levada ao comitê: a decisão é do DECIA (volta pela sincronização), não de um botão aqui
  const awaitingCommittee = c.type === "NORMAL" && open && Boolean(c.decisionId);
  const next = locked ? [] : NEXT.filter((s) => (!awaitingCommittee || s === "EM_ANALISE") && allowed(model, { type: "CHANGE_SET_STATUS", id: c.id, status: s }));
  const canImplement = !locked && c.status === "APROVADA" && allowed(model, { type: "CHANGE_SET_STATUS", id: c.id, status: "IMPLEMENTADA" });
  const regularizes = creepTasks(model).filter((x) => mentions(c, x.code));
  const created = model.tasks.filter((x) => x.changeId === c.id);
  const decided = c.status === "APROVADA" || c.status === "REJEITADA" || c.status === "IMPLEMENTADA";
  const deciaStatus = c.decisionId ? decia?.decisionStatus(c.decisionId) : undefined;
  const headId = `ctl-chg-${c.id}`;
  const label = (s: ChangeStatus) =>
    s === "APROVADA" && c.status === "SOLICITADA" && c.type !== "NORMAL" ? t(`pm.ctl.chg.to.APROVADA_${c.type}`) : t(`pm.ctl.chg.to.${s}`);

  return (
    <li>
      <article aria-labelledby={headId} data-change={c.code} data-status={c.status} className="grid gap-3 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-4)]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 id={headId} className="break-words font-semibold">
              <span className="font-[family-name:var(--ws-font-mono)]">{c.code}</span> · {c.title}
            </h4>
            <p className={CAPTION}>
              {t("pm.ctl.chg.requestedBy", { name: nameOf(people, c.requesterId), date: fmt.date(intl, c.createdAt) })}
              {c.decidedAt ? ` · ${t("pm.ctl.chg.decidedAt", { date: fmt.date(intl, c.decidedAt) })}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Tag>{t(`pm.changeType.${c.type}`)}</Tag>
            <Tag tone={CHANGE_TONE[c.status]}>{t(`pm.changeStatus.${c.status}`)}</Tag>
          </div>
        </div>

        {editable ? (
          <Field label={t("pm.ctl.chg.type")} className="max-w-xs">
            {({ id }) => (
              <Select id={id} value={c.type} options={CHANGE_TYPES.map((x) => ({ value: x, label: t(`pm.changeType.${x}`) }))}
                onChange={(e) => send({ type: "CHANGE_UPDATE", id: c.id, changeType: e.target.value as ChangeType })} />
            )}
          </Field>
        ) : null}

        {open && (answered < SEVEN_RS.length || noImpact) ? (
          <ul className="grid gap-1 text-[length:var(--ws-text-caption)] text-ws-warning-ink">
            {answered < SEVEN_RS.length ? <li><span aria-hidden>! </span>{t("pm.ctl.chg.incomplete", { n: SEVEN_RS.length - answered })}</li> : null}
            {noImpact ? <li><span aria-hidden>! </span>{t("pm.ctl.chg.noImpact")}</li> : null}
          </ul>
        ) : null}

        <div>
          <Button size="sm" variant="ghost" aria-expanded={expanded} aria-controls={`${headId}-body`} onClick={() => setExpanded((v) => !v)}>
            {t(expanded ? "pm.ctl.chg.hideAnalysis" : "pm.ctl.chg.showAnalysis")}
          </Button>
        </div>
        {expanded ? (
          <div id={`${headId}-body`} className="grid gap-4">
            <div className="grid gap-2">
              <p className={cn(BODY_SM, "font-semibold")}>{t("pm.ctl.chg.impactTitle")}</p>
              {editable ? <p className={CAPTION}>{t("pm.ctl.chg.impactHint")}</p> : null}
              {editable ? <ImpactEditor change={c} send={send} /> : <ImpactSummary impact={c.impact} />}
            </div>
            <div className="grid gap-2">
              <p className={cn(BODY_SM, "font-semibold")}>
                {t("pm.ctl.chg.sevenRsTitle")} <span className={cn(CAPTION, "font-normal")}>· {t("pm.ctl.chg.sevenRsCount", { n: answered })}</span>
              </p>
              {editable ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {SEVEN_RS.map((k) => (
                    <CommitText key={k} label={t(`pm.sevenRs.${k}`)} value={c.sevenRs[k] ?? ""} className="content-start" onCommit={(v) => send({ type: "CHANGE_UPDATE", id: c.id, sevenRs: sevenRsPatch(k, v) })} />
                  ))}
                </div>
              ) : (
                <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                  {SEVEN_RS.map((k) => (
                    <div key={k} className="grid gap-0.5 border-b border-ws-border py-1">
                      <dt className={CAPTION}>{t(`pm.sevenRs.${k}`)}</dt>
                      <dd className={cn(BODY_SM, "break-words")}>{c.sevenRs[k]?.trim() || "—"}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        ) : null}

        {c.type === "NORMAL" ? (
          c.decisionId ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(BODY_SM, "font-semibold")}>{t("pm.ctl.chg.decision")}</span>
              {decia ? <Link href={decia.decisionHref(c.decisionId)}>{t("pm.ui.openInDecia")}</Link> : null}
              {deciaStatus ? <Tag tone="info">{t(`decia.status.${deciaStatus}`)}</Tag> : null}
              {awaitingCommittee ? <p className={cn(CAPTION, "basis-full")}>{t("pm.ctl.chg.awaiting")}</p> : null}
            </div>
          ) : open && decia && !locked ? (
            <div>
              <Button size="sm" icon="sessao-decia" onClick={() => decia.openChange(c.id)}>{t("pm.ctl.chg.toCommittee")}</Button>
            </div>
          ) : decided ? (
            <p className="text-[length:var(--ws-text-caption)] text-ws-warning-ink"><span aria-hidden>! </span>{t("pm.ctl.chg.noDecision")}</p>
          ) : null
        ) : null}

        {next.length || canImplement ? (
          <div className="grid gap-2">
            <p className={LABEL}>{t("pm.ctl.chg.next")}</p>
            {c.type === "NORMAL" && next.some((s) => s === "APROVADA" || s === "REJEITADA") ? <p className={CAPTION}>{t("pm.ctl.chg.normalHint")}</p> : null}
            <div className="flex flex-wrap gap-2">
              {next.map((s) => (
                <Button key={s} size="sm" variant={s === "REJEITADA" ? "danger" : s === "APROVADA" ? "primary" : "default"} onClick={() => send({ type: "CHANGE_SET_STATUS", id: c.id, status: s })}>
                  {label(s)}
                </Button>
              ))}
              {canImplement ? (
                <Button size="sm" variant="primary" onClick={() => onImplement(c)}>
                  {regularizes.length ? t("pm.ctl.chg.implementRegularize", { codes: regularizes.map((x) => x.code).join(", ") }) : t("pm.ctl.chg.implement")}
                </Button>
              ) : null}
            </div>
            {canImplement ? (
              <p className={CAPTION}>
                {regularizes.length ? t("pm.ctl.chg.implementRegularizeHint") : t("pm.ctl.chg.implementHint", { phase: t(`pm.phase.${model.currentPhase}`) })}
              </p>
            ) : null}
          </div>
        ) : c.status === "IMPLEMENTADA" || c.status === "REJEITADA" ? (
          <p className={CAPTION}>{t("pm.ctl.chg.final")}</p>
        ) : null}

        {created.length ? <p className={BODY_SM}>{t("pm.ctl.chg.created", { codes: created.map((x) => x.code).join(", ") })}</p> : null}
      </article>
    </li>
  );
}

function ChangesSection({ model, dispatch, people, locked, decia }: { model: ProjectModel; dispatch: Dispatch; people: PeopleDirectory; locked: boolean; decia?: DeciaActions }) {
  const { t } = useI18n();
  const { send, error } = useSend(dispatch);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ChangeType>("NORMAL");
  const changes = [...model.changes].sort((a, b) => CHANGE_ORDER[a.status] - CHANGE_ORDER[b.status] || b.code.localeCompare(a.code, undefined, { numeric: true }));
  const counts = CHANGE_STATUSES.map((s) => ({ s, n: model.changes.filter((c) => c.status === s).length })).filter((x) => x.n > 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (send({ type: "CHANGE_REQUEST", title, changeType: type }).ok) setTitle("");
  };

  /**
   * Implementar = cumprir o que o comitê aprovou e atualizar a linha de base. Mudança comum: cria a atividade ligada a ela na fase
   * atual e marca IMPLEMENTADA (o núcleo atualiza a linha de base). Regularização de scope creep: o trabalho JÁ existe; marca
   * IMPLEMENTADA e, se não sobrar scope creep sem mudança implementada, aprova a nova linha de base que o incorpora.
   */
  const implement = (c: ChangeRequest) => {
    const regularizes = creepTasks(model).filter((x) => mentions(c, x.code));
    if (!regularizes.length && !model.tasks.some((x) => x.changeId === c.id)) {
      const created = send({ type: "TASK_CREATE", title: c.title, phase: model.currentPhase, changeId: c.id, durationDays: c.impact.scheduleDays > 0 ? c.impact.scheduleDays : undefined });
      if (!created.ok) return;
    }
    const done = send({ type: "CHANGE_SET_STATUS", id: c.id, status: "IMPLEMENTADA" });
    if (!done.ok || !regularizes.length) return;
    const after = done.model;
    const pending = creepTasks(after).filter((x) => !after.changes.some((ch) => ch.status === "IMPLEMENTADA" && mentions(ch, x.code)));
    if (!pending.length) send({ type: "BASELINE_SET" });
  };

  return (
    <Card as="section" aria-labelledby="ctl-changes" className="grid gap-[var(--ws-space-4)]">
      <SectionTitle id="ctl-changes">{t("pm.ctl.chg.title")}</SectionTitle>
      <ol aria-label={t("pm.ctl.chg.flowLabel")} className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {FLOW_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-[var(--ws-radius-pill)] border border-ws-border bg-ws-surface-2 px-2.5 py-1 text-[length:var(--ws-text-caption)] font-semibold">
              <span className="font-[family-name:var(--ws-font-mono)] text-ws-text-muted">{i + 1}</span>
              {t(`pm.ctl.chg.step.${s}`)}
            </span>
            {i < FLOW_STEPS.length - 1 ? <span aria-hidden className="text-ws-text-muted">→</span> : null}
          </li>
        ))}
      </ol>
      <div className="grid gap-2 md:grid-cols-2">
        <Theory refKey="SCOPE_CREEP">{t("pm.ctl.chg.theory")}</Theory>
        <Theory refKey="CONTROLE_MUDANCAS">{t("pm.ctl.chg.types")}</Theory>
      </div>

      {!locked ? (
        <form onSubmit={submit} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-dashed border-ws-border-strong p-[var(--ws-space-3)]" aria-labelledby="ctl-chg-new">
          <p id="ctl-chg-new" className={cn(BODY_SM, "font-semibold")}>{t("pm.ctl.chg.new")}</p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Field label={t("pm.ctl.chg.newTitle")}>
              {({ id }) => <Input id={id} value={title} placeholder={t("pm.ctl.chg.newTitlePlaceholder")} onChange={(e) => setTitle(e.target.value)} />}
            </Field>
            <Field label={t("pm.ctl.chg.type")}>
              {({ id }) => (
                <Select id={id} value={type} options={CHANGE_TYPES.map((x) => ({ value: x, label: t(`pm.changeType.${x}`) }))} onChange={(e) => setType(e.target.value as ChangeType)} />
              )}
            </Field>
          </div>
          <div>
            <Button type="submit" size="sm" variant="primary">{t("pm.ctl.chg.submit")}</Button>
          </div>
        </form>
      ) : null}
      <ErrorNote error={error} />

      {counts.length ? (
        <p className="flex flex-wrap gap-1">
          {counts.map(({ s, n }) => (
            <Tag key={s} tone={CHANGE_TONE[s]}>
              {t(`pm.changeStatus.${s}`)} · <span className="tabular-nums">{n}</span>
            </Tag>
          ))}
        </p>
      ) : null}
      {changes.length ? (
        <ul aria-label={t("pm.ctl.chg.listLabel")} className="grid gap-3">
          {changes.map((c) => (
            <ChangeCard key={c.id} change={c} model={model} people={people} locked={locked} send={send} decia={decia} onImplement={implement} />
          ))}
        </ul>
      ) : (
        <p className={CAPTION}>{t("pm.ctl.chg.empty")}</p>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ scope creep

function CreepSection({ model, dispatch, locked, goTo }: { model: ProjectModel; dispatch: Dispatch; locked: boolean; goTo?: PanelProps["goTo"] }) {
  const { t, intl } = useI18n();
  const { send, error } = useSend(dispatch);
  const creep = creepTasks(model);
  return (
    <Card as="section" aria-labelledby="ctl-creep" className="grid content-start gap-3">
      <SectionTitle id="ctl-creep">{t("pm.ctl.creep.title")}</SectionTitle>
      <ErrorNote error={error} />
      {!model.baseline ? (
        <p className={cn(BODY_SM, "text-ws-warning-ink")}>{t("pm.ctl.creep.noBaseline")}</p>
      ) : !creep.length ? (
        <p className={cn(BODY_SM, "text-ws-success-ink")}><span aria-hidden>✓ </span>{t("pm.ctl.creep.none")}</p>
      ) : (
        <ul className="grid gap-2">
          {creep.map((x) => {
            const cover = model.changes.find((c) => c.status !== "REJEITADA" && mentions(c, x.code));
            const rejected = cover ? undefined : model.changes.find((c) => c.status === "REJEITADA" && mentions(c, x.code));
            return (
              <li key={x.id} data-creep={x.code} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-[var(--ws-space-3)]">
                <p className={cn(BODY_SM, "font-semibold text-ws-danger-ink")}>
                  <span aria-hidden>✕ </span>
                  <span className="font-[family-name:var(--ws-font-mono)]">{x.code}</span> · {x.title}
                </p>
                <p className="text-[length:var(--ws-text-caption)] text-ws-text">
                  {t("pm.ctl.creep.detail", { phase: t(`pm.phase.${x.phase}`), status: t(`pm.status.${x.status}`), ac: fmt.money(intl, x.actualCost) })}
                </p>
                {cover ? (
                  <p className={BODY_SM}>
                    {t(cover.status === "IMPLEMENTADA" ? "pm.ctl.creep.regularized" : "pm.ctl.creep.pending", { code: cover.code, status: t(`pm.changeStatus.${cover.status}`) })}
                  </p>
                ) : null}
                {rejected ? <p className={BODY_SM}>{t("pm.ctl.creep.rejected", { code: rejected.code })}</p> : null}
                {!cover && !locked ? (
                  <div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        send({
                          type: "CHANGE_REQUEST",
                          title: t("pm.ctl.creep.changeTitle", { code: x.code, title: x.title }),
                          changeType: "NORMAL",
                          sevenRs: { relationship: t("pm.ctl.creep.relationship", { code: x.code }) },
                        })
                      }
                    >
                      {t("pm.ctl.creep.regularize")}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Theory refKey="GOLD_PLATING">{t("pm.ctl.creep.vsGold")}</Theory>
      {goTo ? (
        <div>
          <Button size="sm" variant="ghost" onClick={() => goTo("escopo")}>{t("pm.ui.goToTab", { tab: t("pm.tab.escopo") })}</Button>
        </div>
      ) : null}
    </Card>
  );
}

// ------------------------------------------------------------------ lições aprendidas ao longo do projeto

const COVERAGE_TONE: Record<MetricStatus, "success" | "warning" | "danger" | "accent"> = { OK: "success", ATENCAO: "warning", CRITICO: "danger", SEM_DADOS: "accent" };

function LessonsSection({ model, dispatch, people, locked }: { model: ProjectModel; dispatch: Dispatch; people: PeopleDirectory; locked: boolean }) {
  const { t } = useI18n();
  // mesma conta do indicador Q_LICOES (o painel e o feedback falam a mesma língua)
  const metric = useMemo(() => computeMetrics(model).quality.find((x) => x.id === "Q_LICOES"), [model]);
  const phases = Number(metric?.vars.phases ?? 0);
  const elapsed = Math.max(1, Number(metric?.vars.elapsed ?? 1));
  const withLessons = new Set(model.lessons.map((l) => l.phase));
  const missing = livedPhases(model).filter((p) => !withLessons.has(p));
  return (
    <Card as="section" aria-labelledby="ctl-lessons" className="grid content-start gap-3">
      <SectionTitle id="ctl-lessons">{t("pm.ctl.lessons.title")}</SectionTitle>
      <PercentBar value={(phases / elapsed) * 100} label={t("pm.ctl.lessons.coverage", { phases, elapsed })} tone={COVERAGE_TONE[metric?.status ?? "SEM_DADOS"]} />
      {missing.length ? <p className="text-[length:var(--ws-text-caption)] text-ws-warning-ink">{t("pm.ctl.lessons.missing", { phases: missing.map((p) => t(`pm.phase.${p}`)).join(", ") })}</p> : null}
      <LessonsByPhase model={model} people={people} />
      {!locked ? <LessonComposer model={model} dispatch={dispatch} /> : null}
      <Theory refKey="LICOES_AO_LONGO">{t("pm.ctl.lessons.theory")}</Theory>
    </Card>
  );
}

// ------------------------------------------------------------------ histórico de versões (RF22.CA02)

function HistorySection({ model, people }: { model: ProjectModel; people: PeopleDirectory }) {
  const { t, intl } = useI18n();
  const [all, setAll] = useState(false);
  const versions = useMemo(() => [...model.versions].sort((a, b) => b.number - a.number), [model.versions]);
  const shown = all ? versions : versions.slice(0, HISTORY_LIMIT);
  const when = new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" });
  return (
    <Card as="section" aria-labelledby="ctl-history" className="grid content-start gap-3">
      <SectionTitle id="ctl-history">{t("pm.ctl.history.title")}</SectionTitle>
      <p className={CAPTION}>{t("pm.ctl.history.hint", { n: versions.length })}</p>
      {versions.length ? (
        <ol aria-label={t("pm.ctl.history.title")} className="grid gap-1.5">
          {shown.map((v) => (
            <li key={v.number} data-version={v.number} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2 border-b border-ws-border pb-1.5">
              <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] font-bold tabular-nums text-ws-text-muted">{t("pm.ctl.history.version", { n: v.number })}</span>
              <span className={cn(BODY_SM, "break-words")}>{versionSummary(t, v)}</span>
              <span className={cn(CAPTION, "col-start-2")}>
                {nameOf(people, v.actorId)} · <time dateTime={v.at}>{when.format(new Date(v.at))}</time>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={CAPTION}>{t("pm.ctl.history.empty")}</p>
      )}
      {versions.length > HISTORY_LIMIT ? (
        <div>
          <Button size="sm" variant="ghost" aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? t("pm.ctl.history.showLess", { n: HISTORY_LIMIT }) : t("pm.ctl.history.showAll", { n: versions.length })}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

// ------------------------------------------------------------------ painel

function LockedNote({ model, goTo }: { model: ProjectModel; goTo?: PanelProps["goTo"] }) {
  const { t } = useI18n();
  return (
    <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text">
      <p>{model.closure.archived ? t("pm.ctl.archived") : t("pm.ui.readOnly")}</p>
      {model.closure.archived && goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("encerramento")}>{t("pm.ui.goToTab", { tab: t("pm.tab.encerramento") })}</Button> : null}
    </div>
  );
}

export function ControlPanel({ model, dispatch, people, readOnly, goTo, decia }: PanelProps) {
  const { t } = useI18n();
  // projeto arquivado recusa alteração estrutural no núcleo (RF22.CA06): o painel nem oferece a edição
  const locked = readOnly || model.closure.archived;
  return (
    <div className="grid gap-[var(--ws-space-5)]" data-panel="controle">
      <header className="grid gap-1">
        <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-[var(--ws-text-h2--lh)] text-ws-text">{t("pm.ctl.title")}</h2>
        <p className={cn(BODY_SM, "max-w-prose text-ws-text-muted")}>{t("pm.ctl.intro")}</p>
      </header>
      {locked ? <LockedNote model={model} goTo={goTo} /> : null}
      <TabMetrics model={model} tab="controle" />
      <EvmSection model={model} dispatch={dispatch} locked={locked} goTo={goTo} />
      <ProgressSection model={model} dispatch={dispatch} locked={locked} />
      <ChangesSection model={model} dispatch={dispatch} people={people} locked={locked} decia={decia} />
      <div className="grid gap-[var(--ws-space-5)] xl:grid-cols-2">
        <CreepSection model={model} dispatch={dispatch} locked={locked} goTo={goTo} />
        <LessonsSection model={model} dispatch={dispatch} people={people} locked={locked} />
      </div>
      <HistorySection model={model} people={people} />
    </div>
  );
}
