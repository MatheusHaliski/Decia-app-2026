"use client";
/**
 * Tarefa do Dia (RF44.CA01) no perfil (`/profile?tab=tarefa-do-dia`), com o prazo em primeiro lugar (RF41.CA04): lê o Acervo real em
 * ordem de prazo (`GET /api/tasks?ordem=PRAZO`) e aplica a regra pura `suggestDailyTask` (lib/tasks/dailyTask.ts). Mostra o motivo
 * em texto (vencida, vence hoje, vence em N dias, prazo legal ou só prioridade) e as próximas da fila. Não é IA: sem faísca ✦.
 */
import { useCallback, useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorState, Link, LoadingState, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { EMPTY_PARAMS } from "@/lib/tasks/acervo";
import { tasksApi, type TaskView } from "@/lib/tasks/client";
import { dailyReasonKey, suggestDailyTask, type DailySuggestion } from "@/lib/tasks/dailyTask";
import { formatIsoDate, localTodayIso } from "@/lib/tasks/legalDeadline";
import { DeadlineStatusTag } from "./LegalDeadline";

function useDeadlineOrderedTasks() {
  const [tasks, setTasks] = useState<TaskView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    setTasks(null);
    tasksApi.list({ ...EMPTY_PARAMS, ordem: "PRAZO" }).then((v) => setTasks(v ?? []), () => setFailed(true));
  }, []);
  useEffect(load, [load]);
  return { tasks, failed, load };
}

/** Texto do motivo, no idioma da tela. */
export function useDailyReason() {
  const { t, intl } = useI18n();
  return (s: DailySuggestion) => {
    const base = t(dailyReasonKey(s), {
      n: s.days === null ? 0 : Math.abs(s.days),
      date: s.due ? formatIsoDate(s.due, intl) : "",
      priority: t(`tasks.priority.${s.task.priority ?? "MEDIA"}`),
    });
    return s.legal ? `${base} · ${t("prazosdiarios.daily.legal")}` : base;
  };
}

export function DailyTaskView({ tasks, today }: { tasks: readonly TaskView[]; today: string }) {
  const { t } = useI18n();
  const reason = useDailyReason();
  const s = suggestDailyTask(tasks, today);
  if (!s) {
    return (
      <EmptyState
        moji="vazio"
        title={t("prazosdiarios.daily.empty")}
        description={t("prazosdiarios.daily.emptyHint")}
        action={<Button variant="primary" href="/tasks">{t("prazosdiarios.daily.openAcervo")}</Button>}
      />
    );
  }
  return (
    <Card as="section" title={t("prazosdiarios.daily.title")} eyebrow="RF44.CA01 · RF41.CA04" data-testid="daily-task" aria-live="polite">
      <div className="grid gap-3">
        <div className="grid gap-1">
          <Link href={`/tasks/${s.task.id}`} variant="plain" className="text-[length:var(--ws-text-body-lg)] font-semibold hover:underline" data-testid="daily-task-title">
            {s.task.title}
          </Link>
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]" data-testid="daily-task-reason" data-reason={s.reason}>
            <span className="text-ws-text-muted">{t("prazosdiarios.daily.why")}</span>
            <span className="font-medium">{reason(s)}</span>
            {s.due ? <DeadlineStatusTag due={s.due} today={today} legal={s.legal} /> : <Tag tone="neutral">{t(`tasks.priority.${s.task.priority ?? "MEDIA"}`)}</Tag>}
          </p>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("prazosdiarios.daily.rule")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" href={`/tasks/${s.task.id}`}>{t("prazosdiarios.daily.open")}</Button>
          <Button variant="ghost" href="/tasks?ordem=prazo">{t("prazosdiarios.daily.openAcervo")}</Button>
        </div>
        {s.next.length ? (
          <div className="grid gap-1">
            <h3 className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("prazosdiarios.daily.next")}</h3>
            <ol className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
              {s.next.map((x) => {
                const n = suggestDailyTask([x], today);
                return (
                  <li key={x.id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/tasks/${x.id}`} variant="plain" className="hover:underline">{x.title}</Link>
                    {n ? <span className="text-ws-text-muted">{reason(n)}</span> : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/** Sub-aba do perfil: carrega e mostra a sugestão do dia. */
export function DailyTask() {
  const { t } = useI18n();
  const { tasks, failed, load } = useDeadlineOrderedTasks();
  if (failed) return <ErrorState title={t("prazosdiarios.daily.error")} onRetry={load} />;
  if (!tasks) return <LoadingState />;
  return <DailyTaskView tasks={tasks} today={localTodayIso()} />;
}
