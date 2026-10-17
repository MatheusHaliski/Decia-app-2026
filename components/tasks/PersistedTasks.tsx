"use client";
/**
 * Tarefas persistidas (RF41, RF12; auditoria 17/10/2026): lista "Minhas tarefas" com card de reconhecimento rápido e detalhe com
 * estados padronizados (A realizar · Em andamento · Bloqueado · Concluído), próxima ação e progresso explícito pelos critérios.
 * Dados da API real (`/api/tasks`); sem sessão, o erro diz o motivo e o caminho.
 */
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Link, LoadingState, Tag, Textarea, useToast } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { criteriaProgress, requestFromView, tasksApi, type Criterion, type TaskStateName, type TaskView } from "@/lib/tasks/client";
import { canTransitionTask, nextActionOf, publicationOf, TASK_TRANSITIONS, WORK_STATUSES, workStatusOf, type WorkStatus } from "@/lib/tasks/status";

const STATUS_TONE: Record<WorkStatus, "neutral" | "accent" | "info" | "danger" | "success"> = {
  A_REALIZAR: "accent", EM_ANDAMENTO: "info", BLOQUEADO: "danger", CONCLUIDO: "success", ARQUIVADO: "neutral",
};

export function WorkStatusTag({ state }: { state: TaskStateName }) {
  const { t } = useI18n();
  const ws = workStatusOf(state);
  const pub = publicationOf(state);
  return ws
    ? <Tag tone={STATUS_TONE[ws]} dashed={state === "RASCUNHO"}>{t(`social.workStatus.${ws}`)}{state === "RASCUNHO" ? ` · ${t("social.taskState.RASCUNHO")}` : ""}</Tag>
    : <Tag tone="warning">{t(`social.taskState.${pub}`)}</Tag>;
}

function Progress({ criteria }: { criteria?: Criterion[] }) {
  const { t } = useI18n();
  const p = criteriaProgress(criteria);
  if (p.percent === null) return <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.card.noCriteria")}</span>;
  return (
    <div className="grid gap-1" data-testid="criteria-progress">
      <div className="h-1.5 overflow-hidden rounded-full bg-ws-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.percent}
        aria-label={t("tasks.card.progressAria", { done: p.done, total: p.total })}>
        <div className="h-full bg-ws-accent" style={{ width: `${p.percent}%` }} />
      </div>
      <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.card.progress", { done: p.done, total: p.total })}</span>
    </div>
  );
}

/** Card de tarefa: tipo, título, finalidade, estado, prazo/prioridade, próxima ação e progresso pelos critérios. */
export function PersistedTaskCard({ task }: { task: TaskView }) {
  const { t, intl } = useI18n();
  const state = task.state ?? "RASCUNHO";
  const next = nextActionOf(state);
  return (
    <Card as="article" className="grid gap-2" data-testid="persisted-task-card" aria-labelledby={`task-${task.id}`}>
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <Badge tone="neutral">{t("tasks.card.kind")}</Badge>
        <span>{t(`social.taskType.${task.type}`)}</span>
        {task.area ? <span>· {t(`tasks.area.${task.area}`)}</span> : null}
      </div>
      <h3 id={`task-${task.id}`} className="text-[length:var(--ws-text-h4)] font-semibold leading-snug">
        <Link href={`/tasks/${task.id}`} variant="plain" className="hover:underline">{task.title}</Link>
      </h3>
      <p className="line-clamp-2 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{task.objective || t("tasks.card.noObjective")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <WorkStatusTag state={state} />
        {task.priority && task.priority !== "MEDIA" ? <Tag tone={task.priority === "BAIXA" ? "neutral" : "warning"}>{t(`tasks.priority.${task.priority}`)}</Tag> : null}
        {task.dueAt ? <span className="text-[length:var(--ws-text-caption)]">{t("tasks.card.due", { date: new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${task.dueAt}T00:00:00Z`)) })}</span> : null}
      </div>
      <Progress criteria={task.acceptanceCriteria as Criterion[]} />
      {next ? <p className="text-[length:var(--ws-text-caption)]"><span className="font-semibold">{t("tasks.card.next")}:</span> {t(`tasks.next.${next}`)}</p> : null}
    </Card>
  );
}

function loadError(e: unknown, t: (k: string) => string) {
  if (e instanceof ApiError && (e.status === 401 || e.status === 0)) return t("tasks.list.needSession");
  return describeError(e);
}

/** Lista "minhas tarefas" da API; `enabled = false` não busca (quem chama já tem a lista). */
export function useMyTaskList(enabled = true) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<TaskView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (!enabled) return;
    setError(null);
    tasksApi.mine(100).then(setTasks).catch((e) => setError(loadError(e, t)));
  }, [t, enabled]);
  useEffect(reload, [reload]);
  return { tasks, error, reload };
}

export type MyTaskList = ReturnType<typeof useMyTaskList>;

/** Lista com filtro por estado. Recebe `list` quando a página já carregou as tarefas (ex.: Meu perfil, que conta no cabeçalho). */
export function MyTasks({ list }: { list?: MyTaskList } = {}) {
  const { t } = useI18n();
  const own = useMyTaskList(!list);
  const { tasks, error, reload: load } = list ?? own;
  const [filter, setFilter] = useState<WorkStatus | "todos">("todos");
  if (error) return <ErrorState title={t("tasks.list.error")} description={error} onRetry={load} />;
  if (!tasks) return <LoadingState />;
  if (!tasks.length) return <EmptyState title={t("tasks.list.empty")} description={t("tasks.list.emptyHint")} action={<Button variant="primary" href="/tasks/new">{t("tasks.list.create")}</Button>} />;
  const counts = Object.fromEntries(WORK_STATUSES.map((s) => [s, tasks.filter((x) => workStatusOf(x.state ?? "RASCUNHO") === s).length])) as Record<WorkStatus, number>;
  const shown = filter === "todos" ? tasks : tasks.filter((x) => workStatusOf(x.state ?? "RASCUNHO") === filter);
  return (
    <div className="grid gap-3" data-testid="my-tasks">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("social.acervo.filterByState")}>
        <Button size="sm" variant={filter === "todos" ? "default" : "ghost"} aria-pressed={filter === "todos"} onClick={() => setFilter("todos")}>{t("social.acervo.all")} ({tasks.length})</Button>
        {WORK_STATUSES.filter((s) => counts[s]).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "ghost"} aria-pressed={filter === s} onClick={() => setFilter(s)}>{t(`social.workStatus.${s}`)} ({counts[s]})</Button>
        ))}
        <span className="flex-1" />
        <Button size="sm" variant="primary" href="/tasks/new">{t("tasks.list.create")}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{shown.map((x) => <PersistedTaskCard key={x.id} task={x} />)}</div>
    </div>
  );
}

const ACTION_TARGET: Record<"INICIAR" | "CONCLUIR" | "DESBLOQUEAR" | "REVISAR", TaskStateName> = {
  INICIAR: "EM_USO", CONCLUIR: "CONCLUIDA", DESBLOQUEAR: "EM_USO", REVISAR: "DISPONIVEL",
};

export function PersistedTaskDetail({ id }: { id: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [task, setTask] = useState<TaskView | null>(null);
  const [error, setError] = useState<{ title: string; text: string } | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    tasksApi.get(id).then(setTask).catch((e) => setError(e instanceof ApiError && e.status === 404
      ? { title: t("tasks.detail.notFound"), text: t("tasks.detail.notFoundHint") }
      : { title: t("tasks.list.error"), text: loadError(e, t) }));
  }, [id, t]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<TaskView>, ok: string) {
    setBusy(true);
    try {
      setTask(await fn());
      toast({ title: ok, tone: "sucesso" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === "EDICAO_CONCORRENTE") { toast({ title: t("tasks.form.conflict"), tone: "aviso" }); load(); }
      else toast({ title: t("tasks.detail.actionFailed"), description: describeError(e), tone: "erro" });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState title={error.title} description={error.text} onRetry={load} action={<Button href="/tasks">{t("tasks.detail.back")}</Button>} />;
  if (!task) return <LoadingState />;
  const state = task.state ?? "RASCUNHO";
  const next = nextActionOf(state);
  const criteria = (task.acceptanceCriteria as Criterion[]) ?? [];
  const canBlock = canTransitionTask(state, "BLOQUEADA", "x").ok && !!task.responsibleId;
  const others = TASK_TRANSITIONS[state].filter((s) => s !== "BLOQUEADA" && (!next || s !== ACTION_TARGET[next]));
  const transition = (to: TaskStateName, extra: { reason?: string; blockedByUserId?: string } = {}) =>
    run(() => tasksApi.transition(task.id!, { to, version: task.version!, ...extra }), t("tasks.detail.stateChanged", { state: t(`social.taskState.${to}`) }));
  const toggle = (i: number) => run(() => tasksApi.update(task.id!, requestFromView(task, {
    acceptanceCriteria: criteria.map((c, j) => (j === i ? { ...c, done: !c.done } : c)),
  })), t("tasks.form.saved"));

  return (
    <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" data-testid="persisted-task-detail">
      <div className="grid content-start gap-[var(--ws-space-4)]">
        <Card>
          <div className="flex flex-wrap items-center gap-2"><WorkStatusTag state={state} /><Badge tone="neutral">{t(`social.taskType.${task.type}`)}</Badge>{task.area ? <Badge tone="neutral">{t(`tasks.area.${task.area}`)}</Badge> : null}</div>
          <h2 className="mt-2 text-[length:var(--ws-text-h3)] font-semibold">{task.title}</h2>
          <p className="mt-1 text-ws-text-muted"><span className="font-semibold text-ws-text">{t("tasks.form.objective")}:</span> {task.objective || t("tasks.card.noObjective")}</p>
          {task.descriptionMd ? <p className="mt-3 whitespace-pre-wrap text-[length:var(--ws-text-body-sm)]">{task.descriptionMd}</p> : null}
          {state === "BLOQUEADA" && task.blockReason ? <p className="mt-3 text-ws-danger-ink" role="status">⊘ {task.blockReason}</p> : null}
        </Card>
        <Card title={t("tasks.form.criteria")}>
          <Progress criteria={criteria} />
          {criteria.length ? (
            <ul className="mt-2 grid gap-1.5" data-testid="detail-criteria">
              {criteria.map((c, i) => (
                <li key={i}>
                  <Checkbox checked={c.done} disabled={!task.editable || busy} onCheckedChange={() => void toggle(i)} label={<span className={c.done ? "line-through text-ws-text-muted" : ""}>{c.text}</span>} />
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
        <Card title={t("tasks.form.deliverables")}>
          {task.deliverables?.length ? <ul className="list-disc pl-5">{task.deliverables.map((d, i) => <li key={i}>{d.text}</li>)}</ul> : <p className="text-ws-text-muted">{t("tasks.detail.none")}</p>}
        </Card>
        <Card title={t("tasks.form.references")}>
          {task.references?.length ? <ul className="grid gap-1">{task.references.map((r, i) => <li key={i} className="[overflow-wrap:anywhere]"><Link href={r.url ?? "#"}>{r.label || r.url}</Link></li>)}</ul> : <p className="text-ws-text-muted">{t("tasks.detail.none")}</p>}
        </Card>
        {task.extensions && Object.keys(task.extensions).length ? (
          <Card title={t("tasks.form.areaFields", { area: t(`tasks.area.${task.area ?? "OUTRA"}`) })}>
            <dl className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">{Object.entries(task.extensions).map(([k, v]) => <div key={k} className="contents"><dt className="font-semibold">{t(`tasks.ext.${k}`)}</dt><dd className="[overflow-wrap:anywhere]">{v}</dd></div>)}</dl>
          </Card>
        ) : null}
      </div>
      <aside className="grid content-start gap-[var(--ws-space-4)]">
        <Card title={t("tasks.detail.actions")}>
          {task.editable ? (
            <div className="grid gap-2">
              {next ? <Button variant="primary" disabled={busy} onClick={() => void transition(ACTION_TARGET[next])} data-testid="next-action">{t(`tasks.next.${next}`)}</Button> : null}
              {others.map((s) => <Button key={s} variant="ghost" disabled={busy} onClick={() => void transition(s)}>{t("tasks.detail.moveTo", { state: t(`social.taskState.${s}`) })}</Button>)}
              {canTransitionTask(state, "BLOQUEADA", "x").ok ? (
                blocking ? (
                  <div className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-2">
                    <Field label={t("tasks.detail.blockReason")} hint={canBlock ? t("tasks.detail.blockCause") : t("tasks.detail.blockNeedsResponsible")}>
                      {({ id: fid, describedBy }) => <Textarea id={fid} aria-describedby={describedBy} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
                    </Field>
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" disabled={busy || !canBlock || !reason.trim()} onClick={() => { void transition("BLOQUEADA", { reason, blockedByUserId: task.responsibleId }); setBlocking(false); setReason(""); }}>{t("tasks.detail.block")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setBlocking(false)}>{t("tasks.detail.cancel")}</Button>
                    </div>
                  </div>
                ) : <Button variant="ghost" disabled={busy} onClick={() => setBlocking(true)}>{t("tasks.detail.block")}</Button>
              ) : null}
              <Button href={`/tasks/${task.id}/edit`} variant="ghost">{t("tasks.detail.edit")}</Button>
            </div>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(state === "CONCLUIDA" || state === "ARQUIVADA" ? "tasks.detail.readOnlyClosed" : "tasks.detail.readOnly")}</p>}
          {!task.editable && (state === "CONCLUIDA" || state === "ARQUIVADA") && TASK_TRANSITIONS[state].includes("EM_USO") ? null : null}
        </Card>
        <Card title={t("tasks.detail.facts")}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[length:var(--ws-text-body-sm)]">
            <dt className="text-ws-text-muted">{t("tasks.form.priority")}</dt><dd>{t(`tasks.priority.${task.priority ?? "MEDIA"}`)}</dd>
            <dt className="text-ws-text-muted">{t("tasks.form.dueAt")}</dt><dd>{task.dueAt ?? "—"}</dd>
            <dt className="text-ws-text-muted">{t("tasks.form.accessClass")}</dt><dd>{t(`social.access.${task.accessClass}`)}</dd>
            <dt className="text-ws-text-muted">{t("tasks.form.visibility")}</dt><dd>{t(`social.visibility.${task.visibility}`)}</dd>
            <dt className="text-ws-text-muted">{t("tasks.detail.version")}</dt><dd>{task.version}</dd>
          </dl>
          <p className="mt-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.detail.projectPending")}</p>
        </Card>
      </aside>
    </div>
  );
}
