"use client";
/**
 * Inspetor da atividade — o mesmo diálogo abre do quadro, da linha do tempo e do canvas. Mostra o que o sistema calcula (CPM:
 * datas mais cedo/tarde, folgas, caminho crítico; PERT: TE e σ) e edita a atividade por comandos (cada confirmação = uma versão).
 */
import { useState } from "react";
import { Badge, Button, Checkbox, Dialog, Field, Select, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ProjectCommand } from "@/lib/projects/commands";
import { flattenWbs, scheduleOf, wbsTree } from "@/lib/projects/derive";
import { pert } from "@/lib/projects/engine/pert";
import { DEPENDENCY_TYPES, offsetToDate, type DependencyType } from "@/lib/projects/engine/schedule";
import { FLOW_STATUSES, MOSCOW, PROJECT_PHASES, type Moscow, type ProjectPhase, type Task } from "@/lib/projects/types";
import { CommitNumber, CommitText } from "./common";
import { fmt, nameOf, type PanelProps } from "./shared";

export interface TaskInspectorProps extends PanelProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskInspector({ taskId, onClose, ...props }: TaskInspectorProps) {
  const { t } = useI18n();
  const task = taskId ? props.model.tasks.find((x) => x.id === taskId) : undefined;
  return (
    <Dialog open={Boolean(task)} onOpenChange={(o) => { if (!o) onClose(); }} title={task ? `${task.code} · ${task.title}` : t("pm.task.title")} description={t("pm.task.description")} className="w-[min(96vw,46rem)]">
      {task ? <InspectorBody task={task} onClose={onClose} {...props} /> : null}
    </Dialog>
  );
}

function InspectorBody({ task, onClose, model, dispatch, people, readOnly }: PanelProps & { task: Task; onClose: () => void }) {
  const { t, intl } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const s = scheduleOf(model);
  const row = s.ok ? s.rows[task.id] : undefined;
  const upd = (patch: Extract<ProjectCommand, { type: "TASK_UPDATE" }>["patch"]) => dispatch({ type: "TASK_UPDATE", id: task.id, patch });
  const teamOptions = [{ value: "", label: t("pm.ui.unassigned") }, ...model.team.map((m) => ({ value: m.userId, label: `${nameOf(people, m.userId)} · ${t(`pm.role.${m.role}`)}` }))];
  const leaves = flattenWbs(wbsTree(model.wbs)).filter((n) => n.leaf && n.depth > 0);
  const preds = model.dependencies.filter((d) => d.to === task.id);
  const succs = model.dependencies.filter((d) => d.from === task.id);
  const codeOf = (id: string) => model.tasks.find((x) => x.id === id)?.code ?? "?";
  const est = task.pert ? pert(task.pert) : null;
  const risks = model.risks.filter((r) => r.taskIds.includes(task.id));
  const change = task.changeId ? model.changes.find((c) => c.id === task.changeId) : undefined;
  const [pred, setPred] = useState({ from: "", type: "FS" as DependencyType, lag: 0 });
  const candidates = model.tasks.filter((x) => x.id !== task.id && !preds.some((d) => d.from === x.id));

  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <div className="flex flex-wrap gap-2">
        {row?.critical ? <Tag tone="danger">{t("pm.task.critical")}</Tag> : null}
        {task.milestone ? <Tag tone="info">{t("pm.task.milestone")}</Tag> : null}
        {task.addedAfterBaseline && !task.changeId ? <Tag tone="warning">{t("pm.task.unauthorized")}</Tag> : null}
        {change ? <Tag tone="accent">{t("pm.task.fromChange", { code: change.code })}</Tag> : null}
        {risks.map((r) => <Tag key={r.id} tone="red">{t("pm.task.risk", { title: r.title })}</Tag>)}
      </div>

      {row ? (
        <dl className="grid grid-cols-2 gap-2 rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-caption)] sm:grid-cols-4">
          {([
            ["es", `${fmt.number(intl, row.es, 1)} · ${fmt.date(intl, offsetToDate(model.startDate, row.es))}`],
            ["ef", `${fmt.number(intl, row.ef, 1)} · ${fmt.date(intl, offsetToDate(model.startDate, row.ef))}`],
            ["ls", fmt.number(intl, row.ls, 1)],
            ["lf", fmt.number(intl, row.lf, 1)],
            ["totalFloat", t("pm.ui.daysShort", { n: fmt.number(intl, row.totalFloat, 1) })],
            ["freeFloat", t("pm.ui.daysShort", { n: fmt.number(intl, row.freeFloat, 1) })],
            ["duration", t("pm.ui.daysShort", { n: fmt.number(intl, row.duration, 2) })],
            ["budget", fmt.money(intl, task.budget)],
          ] as const).map(([k, v]) => (
            <div key={k} className="grid gap-0.5">
              <dt className="text-ws-text-muted">{t(`pm.task.cpm.${k}`)}</dt>
              <dd className="font-[family-name:var(--ws-font-mono)] tabular-nums text-ws-text">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[length:var(--ws-text-caption)] text-ws-danger-ink">{t("pm.task.noSchedule")}</p>
      )}

      <fieldset disabled={readOnly} className="grid gap-[var(--ws-space-3)] sm:grid-cols-2">
        <CommitText label={t("pm.task.field.title")} value={task.title} onCommit={(v) => upd({ title: v })} className="sm:col-span-2" />
        <Field label={t("pm.task.field.phase")}>
          {({ id }) => <Select id={id} value={task.phase} onChange={(e) => dispatch({ type: "TASK_MOVE_PHASE", id: task.id, phase: e.target.value as ProjectPhase })} options={PROJECT_PHASES.map((p) => ({ value: p, label: t(`pm.phase.${p}`) }))} />}
        </Field>
        <Field label={t("pm.task.field.status")}>
          {({ id }) => <Select id={id} value={task.status} onChange={(e) => upd({ status: e.target.value as Task["status"] })} options={FLOW_STATUSES.map((st) => ({ value: st, label: t(`pm.status.${st}`) }))} />}
        </Field>
        <Field label={t("pm.task.field.responsible")}>
          {({ id }) => <Select id={id} value={task.responsibleId ?? ""} onChange={(e) => upd({ responsibleId: e.target.value || undefined })} options={teamOptions} />}
        </Field>
        <Field label={t("pm.task.field.reviewer")} hint={task.reviewerId && task.reviewerId === task.responsibleId ? t("pm.task.sameReviewer") : t("pm.task.reviewerHint")}>
          {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={task.reviewerId ?? ""} onChange={(e) => upd({ reviewerId: e.target.value || undefined })} options={teamOptions} />}
        </Field>
        <CommitNumber label={t("pm.task.field.duration")} value={task.durationDays} min={0} onCommit={(v) => upd({ durationDays: v })} suffix={t("pm.task.daysUnit")} hint={task.pert ? t("pm.task.durationPertHint") : undefined} />
        <CommitNumber label={t("pm.task.field.percent")} value={task.percentComplete} min={0} max={100} onCommit={(v) => upd({ percentComplete: v })} suffix="%" />
        <CommitNumber label={t("pm.task.field.budget")} value={task.budget} min={0} onCommit={(v) => upd({ budget: v })} />
        <CommitNumber label={t("pm.task.field.actualCost")} value={task.actualCost} min={0} onCommit={(v) => upd({ actualCost: v })} />
        <Field label={t("pm.task.field.moscow")}>
          {({ id }) => <Select id={id} value={task.moscow ?? ""} onChange={(e) => upd({ moscow: (e.target.value || undefined) as Moscow | undefined })} options={[{ value: "", label: t("pm.ui.none") }, ...MOSCOW.map((m) => ({ value: m, label: t(`pm.moscow.${m}`) }))]} />}
        </Field>
        <Field label={t("pm.task.field.wbs")} hint={t("pm.task.wbsHint")}>
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} value={task.wbsId ?? ""} onChange={(e) => upd({ wbsId: e.target.value || undefined })}
              options={[{ value: "", label: t("pm.ui.none") }, ...leaves.map((n) => ({ value: n.node.id, label: `${n.code} ${n.node.title}` }))]} />
          )}
        </Field>
        <CommitNumber label={t("pm.task.field.sprint")} value={task.sprint} min={1} onCommit={(v) => upd({ sprint: Math.round(v) })} />
        <Checkbox checked={Boolean(task.milestone)} onCheckedChange={(v) => upd({ milestone: v })} label={t("pm.task.field.milestone")} hint={t("pm.task.milestoneHint")} disabled={readOnly} />
      </fieldset>

      <section className="grid gap-2" aria-labelledby={`pert-${task.id}`}>
        <h3 id={`pert-${task.id}`} className="text-[length:var(--ws-text-body)] font-semibold">{t("pm.task.pert.title")}</h3>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.task.pert.hint")}</p>
        <fieldset disabled={readOnly} className="grid grid-cols-3 gap-2">
          {(["o", "m", "p"] as const).map((k) => (
            <CommitNumber key={k} label={t(`pm.task.pert.${k}`)} value={task.pert?.[k]} min={0}
              onCommit={(v) => upd({ pert: { o: task.pert?.o ?? task.durationDays, m: task.pert?.m ?? task.durationDays, p: task.pert?.p ?? task.durationDays, [k]: v } })} />
          ))}
        </fieldset>
        {est ? (
          <p className="text-[length:var(--ws-text-body-sm)]">
            {est.valid ? t("pm.task.pert.result", { te: fmt.number(intl, est.te, 2), sd: fmt.number(intl, est.sd, 2) }) : t(`pm.task.pert.problem.${est.problem}`)}
            {!readOnly ? <Button size="sm" variant="ghost" className="ml-2" onClick={() => upd({ pert: undefined })}>{t("pm.task.pert.clear")}</Button> : null}
          </p>
        ) : null}
      </section>

      <section className="grid gap-2" aria-labelledby={`deps-${task.id}`}>
        <h3 id={`deps-${task.id}`} className="text-[length:var(--ws-text-body)] font-semibold">{t("pm.task.deps.title")}</h3>
        <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
          {[...preds.map((d) => ({ d, other: d.from, dir: "pred" as const })), ...succs.map((d) => ({ d, other: d.to, dir: "succ" as const }))].map(({ d, other, dir }) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2">
              <Badge tone={dir === "pred" ? "info" : "neutral"}>{t(`pm.task.deps.${dir}`)}</Badge>
              <span className="font-[family-name:var(--ws-font-mono)]">{dir === "pred" ? `${codeOf(other)} → ${task.code}` : `${task.code} → ${codeOf(other)}`}</span>
              <span className="text-ws-text-muted">{t(`pm.dep.${d.type}`)}{d.lagDays ? ` · ${t("pm.task.deps.lag", { n: d.lagDays })}` : ""}</span>
              {!readOnly ? <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: `${codeOf(d.from)} → ${codeOf(d.to)}` })} onClick={() => dispatch({ type: "DEP_REMOVE", id: d.id })}>×</Button> : null}
            </li>
          ))}
          {!preds.length && !succs.length ? <li className="text-ws-text-muted">{t("pm.task.deps.none")}</li> : null}
        </ul>
        {!readOnly && candidates.length ? (
          <form
            className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pred.from) return;
              const r = dispatch({ type: "DEP_ADD", from: pred.from, to: task.id, depType: pred.type, lagDays: pred.lag });
              if (r.ok) setPred({ from: "", type: "FS", lag: 0 });
            }}
          >
            <Field label={t("pm.task.deps.addPred")}>
              {({ id }) => <Select id={id} value={pred.from} onChange={(e) => setPred({ ...pred, from: e.target.value })} options={[{ value: "", label: t("pm.ui.select") }, ...candidates.map((x) => ({ value: x.id, label: `${x.code} ${x.title}` }))]} />}
            </Field>
            <Field label={t("pm.task.deps.type")}>
              {({ id }) => <Select id={id} value={pred.type} onChange={(e) => setPred({ ...pred, type: e.target.value as DependencyType })} options={DEPENDENCY_TYPES.map((x) => ({ value: x, label: x }))} />}
            </Field>
            <CommitNumber label={t("pm.task.deps.lagLabel")} value={pred.lag} onCommit={(v) => setPred({ ...pred, lag: Math.round(v) })} className="w-24" />
            <Button type="submit" size="sm" disabled={!pred.from}>{t("pm.ui.add")}</Button>
          </form>
        ) : null}
      </section>

      <div className="flex flex-wrap justify-between gap-2 border-t border-ws-border pt-[var(--ws-space-3)]">
        {!readOnly ? (
          confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
              {t("pm.task.deleteConfirm", { code: task.code })}
              <Button size="sm" variant="danger" onClick={() => { if (dispatch({ type: "TASK_DELETE", id: task.id }).ok) onClose(); }}>{t("pm.task.delete")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>{t("pm.ui.cancel")}</Button>
            </span>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>{t("pm.task.delete")}</Button>
          )
        ) : <span />}
        <Button size="sm" variant="primary" onClick={onClose}>{t("pm.ui.close")}</Button>
      </div>
    </div>
  );
}
