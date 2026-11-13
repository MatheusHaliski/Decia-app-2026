"use client";
/**
 * Acervo de Tarefas (RF41.CA01/CA04/CA09): sub-filtros com contagem (estado de trabalho, prioridade, prazo, categoria), ordenação e página
 * na URL de /tasks (compartilhável), faixa de alertas de prazo legal no topo e os cards reais. Lista e contadores vêm da API
 * (`GET /api/tasks` e `GET /api/tasks/summary` com os mesmos filtros); cada contador ignora o próprio filtro e respeita os demais.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CardGrid } from "@/components/social/TaskSchemeCard";
import { Button, EmptyState, ErrorState, Field, LoadingState, Select } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  acervoSearch, activeFilters, DEADLINE_FILTERS, EMPTY_PARAMS, PAGE_SIZE, parseAcervoParams, PRIORITY_FILTERS, SORT_ORDERS, TASK_CATEGORIES,
  totalPages, WORK_FILTERS, withParams, type AcervoParams,
} from "@/lib/tasks/acervo";
import { tasksApi, type AcervoSummary, type TaskView } from "@/lib/tasks/client";
import { LegalDeadlineBanner } from "./LegalDeadline";
import { PersistedTaskCard } from "./PersistedTasks";

function loadError(e: unknown, t: (k: string) => string) {
  if (e instanceof ApiError && (e.status === 401 || e.status === 0)) return t("tasks.list.needSession");
  return describeError(e);
}

const count = (m: Record<string, number> | undefined, k: string) => m?.[k] ?? 0;

export function TaskAcervo() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  const params = useMemo(() => parseAcervoParams(new URLSearchParams(query)), [query]);
  const [data, setData] = useState<{ tasks: TaskView[]; summary: AcervoSummary } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([tasksApi.list(params), tasksApi.summary(params)])
      .then(([tasks, summary]) => setData({ tasks: Array.isArray(tasks) ? tasks : [], summary }))
      .catch((e) => setError(loadError(e, t)));
  }, [params, t]);
  useEffect(load, [load]);

  const go = (patch: Partial<AcervoParams>) => router.replace(`${pathname}${acervoSearch(withParams(params, patch))}`, { scroll: false });

  if (error) return <ErrorState title={t("tasks.list.error")} description={error} onRetry={load} />;
  if (!data) return <LoadingState />;
  const { tasks, summary } = data;
  const nothingAtAll = (summary.scanned ?? 0) === 0;
  if (nothingAtAll) {
    return <EmptyState title={t("tasks.list.empty")} description={t("tasks.list.emptyHint")} action={<Button variant="primary" href="/tasks/new">{t("tasks.list.create")}</Button>} />;
  }
  const total = summary.total ?? 0;
  const pages = totalPages(total, PAGE_SIZE);
  const allStates = Object.values(summary.byWorkStatus ?? {}).reduce((a, b) => a + b, 0);
  const allPriorities = Object.values(summary.byPriority ?? {}).reduce((a, b) => a + b, 0);
  const filtersOn = activeFilters(params) > 0;

  return (
    <div className="grid gap-[var(--ws-space-4)]" data-testid="task-acervo">
      <LegalDeadlineBanner summary={summary} />

      <section className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3" aria-label={t("tasks.list.filters")}>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("tasks.list.filterState")}>
          <span className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("tasks.list.filterState")}:</span>
          <Button size="sm" variant={!params.filtro ? "default" : "ghost"} aria-pressed={!params.filtro} onClick={() => go({ filtro: null })}>{t("tasks.list.all", { n: allStates })}</Button>
          {WORK_FILTERS.filter((f) => count(summary.byWorkStatus, f) > 0 || params.filtro === f).map((f) => (
            <Button key={f} size="sm" variant={params.filtro === f ? "default" : "ghost"} aria-pressed={params.filtro === f} onClick={() => go({ filtro: f })}>
              {`${t(`social.workStatus.${f}`)} (${count(summary.byWorkStatus, f)})`}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("tasks.list.filterPriority")}>
          <span className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("tasks.list.filterPriority")}:</span>
          <Button size="sm" variant={!params.prioridade ? "default" : "ghost"} aria-pressed={!params.prioridade} onClick={() => go({ prioridade: null })}>{t("tasks.list.allFem", { n: allPriorities })}</Button>
          {PRIORITY_FILTERS.map((p) => (
            <Button key={p} size="sm" variant={params.prioridade === p ? "default" : "ghost"} aria-pressed={params.prioridade === p} onClick={() => go({ prioridade: p })}>
              {`${t(`tasks.priority.${p}`)} (${count(summary.byPriority, p)})`}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("tasks.list.filterDeadline")}>
          <span className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("tasks.list.filterDeadline")}:</span>
          {DEADLINE_FILTERS.map((d) => (
            <Button key={d} size="sm" variant={params.prazo === d ? "default" : "ghost"} aria-pressed={params.prazo === d} onClick={() => go({ prazo: params.prazo === d ? null : d })}>
              {`${t(`tasks.list.deadline.${d}`)} (${count(summary.byDeadline, d)})`}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("tasks.list.filterCategory")}>
            {({ id }) => (
              <Select id={id} value={params.categoria ?? ""} onChange={(e) => go({ categoria: (e.target.value || null) as AcervoParams["categoria"] })}
                options={[{ value: "", label: t("tasks.list.allCategories") }, ...TASK_CATEGORIES.map((c) => ({ value: c, label: `${t(`social.category.${c}`)} (${count(summary.byCategory, c)})` }))]} />
            )}
          </Field>
          <Field label={t("tasks.list.sortBy")}>
            {({ id }) => (
              <Select id={id} value={params.ordem} onChange={(e) => go({ ordem: e.target.value as AcervoParams["ordem"] })}
                options={SORT_ORDERS.map((o) => ({ value: o, label: t(`tasks.list.sort.${o}`) }))} />
            )}
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filtersOn ? <Button size="sm" variant="ghost" onClick={() => router.replace(`${pathname}${acervoSearch({ ...EMPTY_PARAMS, ordem: params.ordem })}`, { scroll: false })}>{t("tasks.list.clear")}</Button> : null}
          <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.list.shareHint")}</span>
          <span className="flex-1" />
          <Button size="sm" variant="primary" href="/tasks/new">{t("tasks.list.create")}</Button>
        </div>
      </section>

      <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="acervo-results">
        {t(total === 1 ? "tasks.list.resultsOne" : "tasks.list.resultsMany", { n: total })}
        {pages > 1 ? ` · ${t("tasks.list.page", { page: params.page, pages })}` : ""}
      </p>
      {summary.truncated ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.list.truncated", { n: summary.scanned ?? 0 })}</p> : null}

      {tasks.length ? (
        <CardGrid label={t("tasks.list.label")}>{tasks.map((x) => <li key={x.id}><PersistedTaskCard task={x} /></li>)}</CardGrid>
      ) : (
        <EmptyState title={t("tasks.list.noMatch")} description={t("tasks.list.noMatchHint")}
          action={filtersOn ? <Button onClick={() => router.replace(`${pathname}${acervoSearch({ ...EMPTY_PARAMS, ordem: params.ordem })}`, { scroll: false })}>{t("tasks.list.clear")}</Button> : undefined} />
      )}

      {pages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label={t("tasks.list.pagination")}>
          <Button size="sm" variant="ghost" disabled={params.page <= 1} onClick={() => go({ page: params.page - 1 })}>{t("tasks.list.prev")}</Button>
          <span className="text-[length:var(--ws-text-body-sm)]">{t("tasks.list.page", { page: Math.min(params.page, pages), pages })}</span>
          <Button size="sm" variant="ghost" disabled={params.page >= pages} onClick={() => go({ page: params.page + 1 })}>{t("tasks.list.next")}</Button>
        </nav>
      ) : null}
    </div>
  );
}
