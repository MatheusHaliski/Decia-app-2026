"use client";
/**
 * Passo 3 do Autopiloto (RF30.CA02/CA03) e Mesa em modo rascunho (`/desk?draft=`): o Esquema de Projeto proposto, editável
 * ANTES de salvar — renomear, mudar duração (três pontos do PERT), prazo e responsável, incluir/excluir/reordenar atividades e
 * fases. A cada edição o cronograma é recalculado na hora pelo CPM do motor, com os prazos de trás para frente a partir do
 * prazo da demanda; se o caminho crítico não cabe, o aviso diz quantos dias estoura. "✦" = proposta; "✎" = mexido pela pessoa.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Button, Card, Checkbox, Field, Input, Select, Tag, cn, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { diffDays } from "@/lib/projects/autopilot/dates";
import { durationOf, editProposal, proposalNetwork, scheduleProposal, type ProjectProposal, type ProposalOp, type ProposalRow, type ProposalSchedule, type ProposalTask } from "@/lib/projects/autopilot/proposal";
import { templateTitle } from "@/lib/projects/autopilot/recipes";
import { mendelow } from "@/lib/projects/engine/methods";
import { offsetToDate } from "@/lib/projects/engine/schedule";
import { PROJECT_PHASES, type ProjectPhase } from "@/lib/projects/types";
import { CommitNumber, CommitText } from "../common";
import { fmt, type PeopleDirectory } from "../shared";
import { ProposalMark } from "./marks";

export interface ProposalEditorProps {
  proposal: ProjectProposal;
  onChange: (p: ProjectProposal) => void;
  people: PeopleDirectory;
}

export function ProposalEditor({ proposal, onChange, people }: ProposalEditorProps) {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const sched = useMemo(() => scheduleProposal(proposal), [proposal]);
  const codes = useMemo(() => new Map(proposalNetwork(proposal).tasks.map((x, i) => [x.key, `T${String(i + 1).padStart(2, "0")}`])), [proposal]);
  const apply = (op: ProposalOp) => {
    const r = editProposal(proposal, op);
    if (!r.ok) {
      toast({ title: t(`autopilot.scheme.err.${r.error}`), tone: "erro" });
      return false;
    }
    onChange(r.proposal);
    return true;
  };
  const date = (iso?: string) => fmt.date(intl, iso);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-4)] xl:grid-cols-[minmax(0,1fr)_20rem]" data-proposal>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[var(--ws-space-4)]">
        <Card padding="sm" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
            <ProposalMark edited={proposal.edited} />
            <Tag tone="accent">{t(`autopilot.kind.${proposal.kind}`)}</Tag>
            <Tag tone="blue">{t(`tasks.area.${proposal.area}`)}</Tag>
            <Tag>{t(`pm.approach.${proposal.approach}`)}</Tag>
            <span className="min-w-0 truncate text-ws-text-muted">{t("autopilot.scheme.source", { source: proposal.source.label })}</span>
          </div>
          <CommitText label={t("autopilot.scheme.titleLabel")} value={proposal.title} onCommit={(v) => apply({ op: "SET_TITLE", title: v })} />
          <CommitText label={t("autopilot.scheme.objectiveLabel")} value={proposal.objective} multiline onCommit={(v) => apply({ op: "SET_OBJECTIVE", text: v })} />
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("autopilot.scheme.start")} hint={t("autopilot.scheme.startHint")}>
              {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="date" value={proposal.startDate} onChange={(e) => e.target.value && apply({ op: "SET_START", date: e.target.value })} className="w-44" />}
            </Field>
            <Field label={t("autopilot.scheme.deadline")} hint={proposal.deadlineExcerpt ? t("autopilot.scheme.deadlineFrom", { excerpt: proposal.deadlineExcerpt }) : t("autopilot.scheme.deadlineHint")}>
              {({ id, describedBy }) => (
                <span className="flex gap-2">
                  <Input id={id} aria-describedby={describedBy} type="date" value={proposal.deadline ?? ""} onChange={(e) => apply({ op: "SET_DEADLINE", date: e.target.value || null })} className="w-44" data-testid="proposal-deadline" />
                  {proposal.deadline ? <Button size="sm" variant="ghost" onClick={() => apply({ op: "SET_DEADLINE", date: null })}>{t("autopilot.facts.deadlineClear")}</Button> : null}
                </span>
              )}
            </Field>
          </div>
        </Card>

        <Feasibility sched={sched} codes={codes} date={date} />
        {sched.ok ? <ProposalGantt proposal={proposal} sched={sched} codes={codes} /> : null}

        {proposal.phases.map((ph, i) => {
          const tasks = proposal.tasks.filter((x) => x.phase === ph.phase);
          const phaseName = t(`pm.phase.${ph.phase}`);
          return (
            <section key={ph.phase} aria-labelledby={`ap-phase-${ph.phase}`} data-phase={ph.phase}
              className={cn("grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-0 p-[var(--ws-space-3)]", !ph.included && "border-dashed")}>
              <header className="flex flex-wrap items-center gap-2">
                <h3 id={`ap-phase-${ph.phase}`} className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold">
                  {t("autopilot.scheme.phaseTitle", { n: i + 1, phase: phaseName })}
                </h3>
                <Tag>{t("autopilot.scheme.taskCount", { n: tasks.length })}</Tag>
                <Checkbox checked={ph.included} onCheckedChange={(v) => apply({ op: "PHASE_TOGGLE", phase: ph.phase, included: v })} label={t("autopilot.scheme.includePhase", { phase: phaseName })} className="py-0" />
                <Button size="sm" variant="ghost" disabled={i === 0} aria-label={t("autopilot.scheme.phaseUp", { phase: phaseName })} onClick={() => apply({ op: "PHASE_MOVE", phase: ph.phase, dir: -1 })}>↑</Button>
                <Button size="sm" variant="ghost" disabled={i === proposal.phases.length - 1} aria-label={t("autopilot.scheme.phaseDown", { phase: phaseName })} onClick={() => apply({ op: "PHASE_MOVE", phase: ph.phase, dir: 1 })}>↓</Button>
              </header>
              {ph.included ? (
                <>
                  {tasks.length ? (
                    <ol className="grid gap-2">
                      {tasks.map((task, idx) => (
                        <TaskRow key={task.key} task={task} idx={idx} count={tasks.length} code={codes.get(task.key) ?? ""} row={sched.rows[task.key]} people={people} apply={apply} date={date} />
                      ))}
                    </ol>
                  ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.scheme.phaseEmpty")}</p>}
                  <AddTask phase={ph.phase} phaseName={phaseName} apply={apply} />
                </>
              ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.scheme.phaseExcluded", { n: tasks.length })}</p>}
            </section>
          );
        })}
      </div>
      <Summary proposal={proposal} />
    </div>
  );
}

function Feasibility({ sched, codes, date }: { sched: ProposalSchedule; codes: Map<string, string>; date: (iso?: string) => string }) {
  const { t, intl } = useI18n();
  const days = fmt.number(intl, sched.finish, 1);
  const path = sched.criticalPath.map((k) => codes.get(k) ?? k).join(" → ");
  let tone = "border-ws-info bg-ws-info-soft";
  let body: ReactNode;
  if (!sched.ok) {
    tone = "border-ws-danger bg-ws-danger-soft";
    body = t("autopilot.scheme.cycle");
  } else if (sched.overrunDays > 0) {
    tone = "border-ws-danger bg-ws-danger-soft";
    body = (
      <>
        <strong>{sched.deadline
          ? t("autopilot.scheme.overrun", { days, finish: date(sched.finishDate), deadline: date(sched.deadline), n: sched.overrunDays })
          : t("autopilot.scheme.overrunPinned", { n: sched.overrunDays })}</strong>{" "}
        {t("autopilot.scheme.overrunHint")}
      </>
    );
  } else if (sched.deadline) {
    tone = "border-ws-success bg-ws-success-soft";
    body = t("autopilot.scheme.fits", { days, finish: date(sched.finishDate), slack: sched.slackDays ?? 0, deadline: date(sched.deadline) });
  } else {
    body = t("autopilot.scheme.noDeadline", { days, finish: date(sched.finishDate) });
  }
  return (
    <div role="status" aria-live="polite" className={cn("grid gap-1 rounded-[var(--ws-radius-md)] border px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text", tone)} data-feasibility={sched.overrunDays > 0 ? "estoura" : "cabe"}>
      <p className="flex items-start gap-2"><span aria-hidden className="text-ws-ai-spark-ink">✦</span><span>{body}</span></p>
      {sched.ok && path ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.scheme.criticalPath", { path })}</p> : null}
    </div>
  );
}

function TaskRow({ task, idx, count, code, row, people, apply, date }: {
  task: ProposalTask; idx: number; count: number; code: string; row?: ProposalRow; people: PeopleDirectory; apply: (op: ProposalOp) => boolean; date: (iso?: string) => string;
}) {
  const { t, intl } = useI18n();
  const key = task.key;
  const origin =
    task.origin === "DEMANDA" ? t("autopilot.origin.DEMANDA", { excerpt: task.excerpt ?? task.title })
    : task.origin === "MODELO" ? t("autopilot.origin.MODELO", { template: (task.templateId && templateTitle(task.templateId)) || task.title })
    : t(`autopilot.origin.${task.origin}`);
  const credit = task.origin === "DEMANDA" && task.templateId ? ` · ${t("autopilot.origin.credit", { template: templateTitle(task.templateId) ?? task.templateId })}` : "";
  const dueHint = task.dueAt ? t("autopilot.scheme.duePinned") : row?.due ? t("autopilot.scheme.dueComputed", { date: date(row.due) }) : t("autopilot.scheme.dueNone");
  const pert = (which: "o" | "m" | "p", v: number) => apply({ op: "TASK_PERT", key, pert: { ...task.pert, [which]: v } });
  return (
    <li className={cn("grid gap-2 rounded-[var(--ws-radius-md)] border bg-ws-surface-1 p-2", row?.critical ? "border-ws-danger" : "border-ws-border")} data-task-key={key} data-task-title={task.title}>
      <div className="flex flex-wrap items-center gap-2">
        <ProposalMark edited={task.edited} />
        <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{code}</span>
        {task.after && idx > 0 ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-hidden>↳</span> : null}
        <CommitText bare label={t("autopilot.scheme.taskTitle", { code })} value={task.title} onCommit={(v) => apply({ op: "TASK_RENAME", key, title: v })} className="min-w-0 flex-1 basis-64" />
        {task.milestone ? <Tag tone="info">{t("pm.task.milestone")}</Tag> : null}
        {row?.critical ? <Tag tone="danger">{t("pm.task.critical")}</Tag> : null}
        {row && row.lateDays > 0 ? <Tag tone="danger">{t("autopilot.scheme.late", { n: Math.ceil(row.lateDays - 1e-9) })}</Tag> : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {!task.milestone ? (
          <>
            <CommitNumber label={t("pm.task.pert.o")} value={task.pert.o} min={0} onCommit={(v) => pert("o", v)} className="w-28" />
            <CommitNumber label={t("pm.task.pert.m")} value={task.pert.m} min={0} onCommit={(v) => pert("m", v)} className="w-32" />
            <CommitNumber label={t("pm.task.pert.p")} value={task.pert.p} min={0} onCommit={(v) => pert("p", v)} className="w-28" />
            <p className="pb-2 text-[length:var(--ws-text-caption)] text-ws-text-muted" data-te>{t("autopilot.scheme.te", { te: fmt.number(intl, durationOf(task), 1) })}</p>
          </>
        ) : null}
        <Field label={t("autopilot.scheme.due")} hint={dueHint}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="date" value={task.dueAt ?? ""} onChange={(e) => apply({ op: "TASK_DUE", key, date: e.target.value || null })} className="w-44" />}
        </Field>
        <Field label={t("pm.task.field.responsible")}>
          {({ id }) => (
            <Select id={id} value={task.responsibleId ?? ""} onChange={(e) => apply({ op: "TASK_RESPONSIBLE", key, userId: e.target.value || null })} className="w-52"
              options={[{ value: "", label: task.role ? t("autopilot.scheme.roleSuggested", { role: task.role }) : t("pm.ui.unassigned") }, ...Object.entries(people).map(([value, p]) => ({ value, label: p.name }))]} />
          )}
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox checked={idx > 0 && task.after} disabled={idx === 0} onCheckedChange={(v) => apply({ op: "TASK_AFTER", key, after: v })} className="py-0"
          label={<>{t("autopilot.scheme.after")}<span className="sr-only"> — {task.title}</span></>} hint={idx === 0 ? t("autopilot.scheme.afterFirst") : undefined} />
        <Select aria-label={t("autopilot.scheme.moveTo", { title: task.title })} value={task.phase} className="min-h-[var(--ws-control-sm)] w-48"
          onChange={(e) => apply({ op: "TASK_PHASE", key, phase: e.target.value as ProjectPhase })} options={PROJECT_PHASES.map((p) => ({ value: p, label: t(`pm.phase.${p}`) }))} />
        <Button size="sm" variant="ghost" disabled={idx === 0} aria-label={t("autopilot.scheme.taskUp", { title: task.title })} onClick={() => apply({ op: "TASK_MOVE", key, dir: -1 })}>↑</Button>
        <Button size="sm" variant="ghost" disabled={idx === count - 1} aria-label={t("autopilot.scheme.taskDown", { title: task.title })} onClick={() => apply({ op: "TASK_MOVE", key, dir: 1 })}>↓</Button>
        <Button size="sm" variant="danger" aria-label={t("autopilot.scheme.remove", { title: task.title })} onClick={() => apply({ op: "TASK_REMOVE", key })}>{t("pm.ui.remove")}</Button>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        {origin}{credit}
        {row ? ` · ${t("autopilot.scheme.dates", { start: date(row.start), end: date(row.end) })}` : ""}
      </p>
    </li>
  );
}

function AddTask({ phase, phaseName, apply }: { phase: ProjectPhase; phaseName: string; apply: (op: ProposalOp) => boolean }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  return (
    <form className="flex gap-2" onSubmit={(e) => {
      e.preventDefault();
      if (draft.trim() && apply({ op: "TASK_ADD", phase, title: draft })) setDraft("");
    }}>
      <Input aria-label={t("autopilot.scheme.addTask", { phase: phaseName })} placeholder={t("autopilot.scheme.addTaskPlaceholder")} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <Button type="submit" size="sm" disabled={!draft.trim()}>{t("pm.ui.add")}</Button>
    </form>
  );
}

/** Gantt compacto da proposta: barras pelo CPM (críticas em destaque), prazo de cada atividade (▼) e o prazo da demanda. */
function ProposalGantt({ proposal, sched, codes }: { proposal: ProjectProposal; sched: ProposalSchedule; codes: Map<string, string> }) {
  const { t, intl } = useI18n();
  const rows = sched.order.map((k) => ({ task: proposal.tasks.find((x) => x.key === k)!, row: sched.rows[k]! }));
  const dueOffsets = rows.map((r) => (r.row.due ? diffDays(proposal.startDate, r.row.due) + 1 : 0));
  const deadlineOffset = proposal.deadline ? diffDays(proposal.startDate, proposal.deadline) + 1 : 0;
  const days = Math.max(1, Math.ceil(Math.max(sched.finish, deadlineOffset, ...dueOffsets)) + 1);
  const LABEL = 200;
  const ROW = 22;
  const HEAD = 26;
  const dw = Math.max(2, Math.min(24, Math.floor(760 / days)));
  const width = LABEL + days * dw + 12;
  const height = HEAD + rows.length * ROW + 6;
  const x = (d: number) => LABEL + d * dw;
  const months: { d: number; label: string }[] = [];
  for (let d = 0; d < days; d++) {
    const iso = offsetToDate(proposal.startDate, d);
    if (d === 0 || iso.endsWith("-01")) months.push({ d, label: new Intl.DateTimeFormat(intl, { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)) });
  }
  return (
    <Card padding="sm" title={t("autopilot.scheme.gantt")} eyebrow={t("autopilot.scheme.ganttEyebrow")}>
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="ap-gantt-title" aria-describedby="ap-gantt-desc" className="block font-[family-name:var(--ws-font-body)]">
          <title id="ap-gantt-title">{t("autopilot.scheme.gantt")}</title>
          <desc id="ap-gantt-desc">{t("autopilot.scheme.ganttDesc", { n: rows.length, days: fmt.number(intl, sched.finish, 1), finish: fmt.date(intl, sched.finishDate) })}</desc>
          {months.filter((m, i) => i === 0 || m.d - months[i - 1]!.d > 40 / dw).map((m) => (
            <g key={m.d}>
              <line x1={x(m.d)} y1={HEAD - 6} x2={x(m.d)} y2={height} className="stroke-ws-border" strokeWidth={0.6} />
              <text x={x(m.d) + 2} y={12} className="fill-ws-text-muted text-[10px]">{m.label}</text>
            </g>
          ))}
          {rows.map(({ task, row }, i) => {
            const y = HEAD + i * ROW;
            const label = `${codes.get(task.key) ?? ""} ${task.title}`;
            return (
              <g key={task.key} data-gantt-row={codes.get(task.key)}>
                <text x={4} y={y + ROW / 2 + 4} className={cn("text-[11px]", row.critical ? "fill-ws-danger-ink font-semibold" : "fill-ws-text")}>{label.length > 30 ? `${label.slice(0, 29)}…` : label}</text>
                {task.milestone ? (
                  <path d={`M${x(row.es)},${y + 4} l7,7 l-7,7 l-7,-7 z`} className={row.critical ? "fill-ws-danger" : "fill-ws-info"} />
                ) : (
                  <rect x={x(row.es)} y={y + 5} width={Math.max(2, (row.ef - row.es) * dw)} height={ROW - 10} rx={3} className={row.critical ? "fill-ws-danger" : "fill-ws-accent"} />
                )}
                {row.due ? <path d={`M${x(diffDays(proposal.startDate, row.due) + 1)},${y + 4} l-4,-4 h8 z`} className={row.lateDays > 0 ? "fill-ws-danger" : "fill-ws-warning"} /> : null}
              </g>
            );
          })}
          {proposal.deadline ? (
            <>
              <line x1={x(deadlineOffset)} y1={HEAD - 8} x2={x(deadlineOffset)} y2={height} className="stroke-ws-warning" strokeWidth={2} strokeDasharray="5 3" />
              <text x={Math.min(x(deadlineOffset) + 3, width - 60)} y={HEAD - 10} className="fill-ws-warning-ink text-[10px] font-semibold">{t("autopilot.scheme.deadlineLine")}</text>
            </>
          ) : null}
        </svg>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-5 rounded-sm bg-ws-danger" />{t("pm.tl.leg.critical")}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-5 rounded-sm bg-ws-accent" />{t("pm.tl.leg.normal")}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="text-ws-warning-ink">▼</span>{t("autopilot.scheme.legendDue")}</span>
      </p>
    </Card>
  );
}

function Summary({ proposal }: { proposal: ProjectProposal }) {
  const { t, intl } = useI18n();
  const block = (title: string, items: ReactNode[], empty = t("autopilot.facts.empty")) => (
    <section className="grid gap-1.5">
      <h3 className="text-[length:var(--ws-text-body-sm)] font-semibold">{title}</h3>
      {items.length ? <ul className="grid gap-1 text-[length:var(--ws-text-caption)]">{items}</ul> : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{empty}</p>}
    </section>
  );
  return (
    <aside className="grid content-start gap-[var(--ws-space-3)] rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" aria-label={t("autopilot.scheme.summary")}>
      <p className="flex items-start gap-1.5 text-[length:var(--ws-text-caption)] text-ws-text-muted"><ProposalMark /><span>{t("autopilot.scheme.summaryHint")}</span></p>
      {block(t("autopilot.facts.stakeholders"), proposal.stakeholders.map((s, i) => (
        <li key={i}>{s.name} <span className="text-ws-text-muted">· {t(`pm.engagement.${mendelow(s.power, s.interest)}`)}</span></li>
      )))}
      {block(t("autopilot.facts.risks"), proposal.risks.map((r, i) => (
        <li key={i}>{r.title} <span className="text-ws-text-muted">· {t("autopilot.facts.riskLine", { p: fmt.percent(intl, r.probability), i: r.impactLevel })}</span></li>
      )))}
      {block(t("autopilot.scheme.budget"), proposal.budget.map((b, i) => <li key={i}><strong className="tabular-nums">{fmt.money(intl, b.amount)}</strong> — {b.title}</li>))}
      {block(t("autopilot.facts.constraints"), proposal.constraints.map((c, i) => <li key={i}>{c}</li>))}
      {block(t("autopilot.scheme.credits"), proposal.credits.map((c) => <li key={c.id}>{c.title}</li>), t("autopilot.scheme.noCredits"))}
    </aside>
  );
}
