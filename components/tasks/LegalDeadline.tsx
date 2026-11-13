"use client";
/**
 * Prazo legal da tarefa (RF41.CA04, RF20.CA11): estado em texto e marca (vence em X dias · vence hoje · vencida há X dias, nunca só cor),
 * faixa de alertas no topo do Acervo e o painel do detalhe para escolher a regra do catálogo e a data de início. O vencimento mostrado na
 * prévia é a mesma conta do servidor (`lib/tasks/legalDeadline.ts` ↔ `LegalDeadlineCalendar.java`); quem grava é o servidor.
 */
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Link, Select, Tag, useToast } from "@/components/ui";
import { ApiError, describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { isOpenState } from "@/lib/tasks/acervo";
import { legalDeadlinesApi, tasksApi, type AcervoSummary, type LegalDeadlineRuleView, type TaskView } from "@/lib/tasks/client";
import { DEADLINE_MARK, deadlineStatus, formatIsoDate, isIsoDate, legalDueDate, localTodayIso } from "@/lib/tasks/legalDeadline";

/** Texto do estado do prazo ("Vence em 3 dias", "Vence hoje", "Vencida há 2 dias"). */
export function useDeadlineText() {
  const { t } = useI18n();
  return (due: string, today: string) => {
    const s = deadlineStatus(due, today);
    if (s.kind === "VENCIDA") return t(s.days === -1 ? "tasks.deadline.overdueOne" : "tasks.deadline.overdueMany", { n: -s.days });
    if (s.kind === "HOJE") return t("tasks.deadline.today");
    return t(s.days === 1 ? "tasks.deadline.inOne" : "tasks.deadline.inMany", { n: s.days });
  };
}

export function DeadlineStatusTag({ due, today, legal = true }: { due: string; today: string; legal?: boolean }) {
  const { t } = useI18n();
  const text = useDeadlineText();
  const s = deadlineStatus(due, today);
  return (
    <span className="inline-flex" data-testid="deadline-status" data-kind={s.kind}>
      <Tag tone={s.tone} className="gap-1">
        {legal ? <span aria-hidden>⚖</span> : null}
        {legal ? <span className="sr-only">{t("tasks.deadline.title")}: </span> : null}
        <span aria-hidden>{DEADLINE_MARK[s.kind]}</span>
        {text(due, today)}
      </Tag>
    </span>
  );
}

/** Faixa no topo do Acervo: tarefas abertas com prazo legal vencido, hoje ou em até 7 dias (independe dos filtros). */
export function LegalDeadlineBanner({ summary }: { summary: AcervoSummary }) {
  const { t, intl } = useI18n();
  const alerts = summary.legalAlerts ?? [];
  const count = summary.legalAlertCount ?? alerts.length;
  if (!count) return null;
  const today = summary.today ?? localTodayIso();
  const overdue = alerts.some((a) => a.legalDueAt && a.legalDueAt < today);
  return (
    <section aria-label={t("tasks.deadline.bannerLabel")} data-testid="legal-banner"
      className={`grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-3 ${overdue ? "bg-ws-danger-soft" : "bg-ws-warning-soft"}`}>
      <p className="font-semibold"><span aria-hidden>⚖ </span>{t(count === 1 ? "tasks.deadline.bannerOne" : "tasks.deadline.bannerMany", { n: count })}</p>
      <ul className="grid gap-1.5">
        {alerts.map((a) => (
          <li key={a.taskId} className="flex flex-wrap items-center gap-x-2 gap-y-1 [overflow-wrap:anywhere]">
            {a.legalDueAt ? <DeadlineStatusTag due={a.legalDueAt} today={today} legal={false} /> : null}
            <Link href={`/tasks/${a.taskId}`}>{a.title}</Link>
            {a.legalDueAt ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.deadline.dueOn", { date: formatIsoDate(a.legalDueAt, intl) })}</span> : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-caption)]">
        {count > alerts.length ? <span>{t("tasks.deadline.more", { n: count - alerts.length })}</span> : null}
        <Link href="/tasks?prazo=com-prazo-legal&ordem=prazo">{t("tasks.deadline.seeAll")}</Link>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.deadline.disclaimer")}</p>
    </section>
  );
}

const ruleLabel = (r: LegalDeadlineRuleView, t: (k: string, v?: Record<string, string | number>) => string) =>
  `${r.subcategory ?? t(`social.category.${r.category ?? "OUTRO"}`)} — ${t("tasks.deadline.days", {
    n: r.days ?? 0, kind: t(r.businessDays ? "tasks.deadline.businessDays" : "tasks.deadline.calendarDays"),
  })} · ${r.legalBasis ?? ""}`;

/**
 * Painel do detalhe: prazo atual (regra, início, vencimento e estado) e, para quem edita, o formulário com a prévia calculada. Salva com
 * a versão atual (409 EDICAO_CONCORRENTE recarrega); o servidor recalcula e grava o vencimento.
 */
export function LegalDeadlinePanel({ task, onSaved, onConflict }: { task: TaskView; onSaved: (t: TaskView) => void; onConflict: () => void }) {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const [today] = useState(() => localTodayIso());
  const [rules, setRules] = useState<LegalDeadlineRuleView[] | null>(null);
  const [rulesError, setRulesError] = useState(false);
  const [ruleId, setRuleId] = useState(task.legalDeadlineRuleId ?? "");
  const [start, setStart] = useState(task.legalDeadlineBaseDate ?? today);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    legalDeadlinesApi.rules().then((r) => { if (alive) setRules(r); }).catch(() => { if (alive) setRulesError(true); });
    return () => { alive = false; };
  }, []);

  const sorted = useMemo(() => [...(rules ?? [])].sort((a, b) => Number(b.category === task.category) - Number(a.category === task.category)), [rules, task.category]);
  const current = rules?.find((r) => r.id === task.legalDeadlineRuleId) ?? null;
  const chosen = rules?.find((r) => r.id === ruleId) ?? null;
  let preview: string | null = null;
  if (chosen && isIsoDate(start) && chosen.days) {
    try { preview = legalDueDate(start, chosen.days, !!chosen.businessDays); } catch { preview = null; }
  }

  async function save(clear: boolean) {
    setBusy(true);
    setFieldErrors({});
    try {
      const saved = await tasksApi.setLegalDeadline(task.id!, clear ? { version: task.version! } : { ruleId, startDate: start, version: task.version! });
      onSaved(saved);
      if (clear) setRuleId("");
      toast({ title: t(clear ? "tasks.deadline.cleared" : "tasks.deadline.saved"), tone: "sucesso" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === "EDICAO_CONCORRENTE") { toast({ title: t("tasks.form.conflict"), tone: "aviso" }); onConflict(); }
      else if (e instanceof ApiError && e.status === 422) setFieldErrors(e.fields);
      else toast({ title: t("tasks.detail.actionFailed"), description: describeError(e), tone: "erro" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("tasks.deadline.title")}>
      <div className="grid gap-3" data-testid="legal-deadline-panel">
        {task.legalDueAt ? (
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {isOpenState(task.state) ? <DeadlineStatusTag due={task.legalDueAt} today={today} /> : null}
              <span className="font-semibold">{t("tasks.deadline.dueOn", { date: formatIsoDate(task.legalDueAt, intl) })}</span>
            </div>
            {task.legalDeadlineBaseDate ? <p className="text-[length:var(--ws-text-body-sm)]">{t("tasks.deadline.startedOn", { date: formatIsoDate(task.legalDeadlineBaseDate, intl) })}</p> : null}
            {current ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted [overflow-wrap:anywhere]">{ruleLabel(current, t)}</p> : null}
            {rules && !current ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.deadline.outOfCatalog")}</p> : null}
          </div>
        ) : <p className="text-ws-text-muted">{t("tasks.deadline.none")}</p>}

        {task.editable ? (
          <form className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-border p-3" onSubmit={(e) => { e.preventDefault(); void save(false); }}>
            {rulesError ? <p role="alert" className="text-ws-danger-ink">{t("tasks.deadline.loadRulesError")}</p> : null}
            <Field label={t("tasks.deadline.rule")} hint={t("tasks.deadline.ruleHint")} error={fieldErrors.ruleId}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} aria-describedby={describedBy} invalid={invalid} value={ruleId} disabled={!rules || busy} onChange={(e) => setRuleId(e.target.value)}
                  options={[{ value: "", label: t("tasks.deadline.choose") }, ...sorted.map((r) => ({ value: r.id ?? "", label: ruleLabel(r, t) }))]} />
              )}
            </Field>
            {chosen?.description ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted [overflow-wrap:anywhere]">{chosen.description}</p> : null}
            <Field label={t("tasks.deadline.start")} hint={t("tasks.deadline.startHint")} error={fieldErrors.startDate ?? (start && !isIsoDate(start) ? t("tasks.deadline.invalidStart") : undefined)}>
              {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={start} disabled={busy} onChange={(e) => setStart(e.target.value)} />}
            </Field>
            <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)]" data-testid="legal-preview">
              {preview ? <>{t("tasks.deadline.preview", { date: formatIsoDate(preview, intl) })} · <DeadlineStatusTag due={preview} today={today} legal={false} /></> : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy || !chosen || !preview} busy={busy}>{t("tasks.deadline.save")}</Button>
              {task.legalDeadlineRuleId ? <Button variant="ghost" disabled={busy} onClick={() => void save(true)}>{t("tasks.deadline.clear")}</Button> : null}
            </div>
          </form>
        ) : null}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.deadline.disclaimer")}</p>
      </div>
    </Card>
  );
}
