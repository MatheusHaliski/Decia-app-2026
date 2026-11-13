"use client";
/**
 * Feedback da IA sobre o trabalho do grupo (janela segmentada da Mesa, RF22 + RF43). Regras do DECIA: indicadores SEPARADOS
 * (qualidade do gerenciamento · governança · trabalho em grupo), nunca um número mágico; todo número é do sistema
 * (`computeMetrics`) e a leitura é montada a partir dele (D-12) — nesta demonstração sem motor de IA, a interface diz isso.
 * Cada achado aponta a aula de origem e abre a área onde se corrige. Reage a cada edição: "o que mudou" compara com a versão
 * anterior e com o início da sessão.
 */
import { Badge, Button, Tag, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { digest, METRIC_GROUPS, metricChanges, narrative, participation, workload, type NarrativePart } from "@/lib/projects/feedback";
import type { Metric, MetricGroup, ProjectMetrics } from "@/lib/projects/metrics";
import { GateChecklist, MetricStatusTag, metricText } from "./common";
import { fmt, nameOf, type PanelProps } from "./shared";

export interface FeedbackPanelProps extends PanelProps {
  metrics: ProjectMetrics;
  /** indicadores da versão anterior do projeto ("o que mudou com a última edição") */
  previous?: ProjectMetrics | null;
  /** indicadores de quando a Mesa foi aberta nesta sessão */
  sessionStart?: ProjectMetrics | null;
}

export function FeedbackPanel(props: FeedbackPanelProps) {
  const { model, metrics, previous, sessionStart, goTo, people, decia, readOnly } = props;
  const { t, intl } = useI18n();
  const d = digest(metrics);
  const parts = narrative(model, metrics);
  const last = previous ? metricChanges(previous, metrics) : [];
  const session = sessionStart ? metricChanges(sessionStart, metrics) : [];
  const better = session.filter((c) => c.direction === "MELHOROU").length;
  const worse = session.length - better;
  const lastAt = model.versions.at(-1)?.at;
  const title = (id: string) => t(`pm.metric.${id}.title`);

  return (
    <div className="@container grid gap-[var(--ws-space-4)]" data-feedback>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
          <Badge tone="spark">{t("pm.fb.badge")}</Badge>
          <h2 className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold leading-tight">{t("pm.fb.title")}</h2>
        </div>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
          {t("pm.fb.version", { n: model.version })}
          {lastAt ? ` · ${t("pm.fb.updated", { when: new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" }).format(new Date(lastAt)) })}` : ""}
        </p>
        <ul className="grid grid-cols-3 gap-2" aria-label={t("pm.fb.countsLabel")}>
          {METRIC_GROUPS.map((g) => {
            const c = d.counts[g];
            return (
              <li key={g} className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2" data-group={g}>
                <span className="text-[length:var(--ws-text-caption)] font-semibold">{t(`pm.metricGroup.${g}`)}</span>
                <span className="flex flex-wrap gap-1 text-[length:var(--ws-text-caption)]">
                  {c.CRITICO ? <Tag tone="danger">{t("pm.fb.nCritical", { n: c.CRITICO })}</Tag> : null}
                  {c.ATENCAO ? <Tag tone="warning">{t("pm.fb.nAttention", { n: c.ATENCAO })}</Tag> : null}
                  <Tag tone="success">{t("pm.fb.nOk", { n: c.OK })}</Tag>
                  {c.SEM_DADOS ? <Tag>{t("pm.fb.nNoData", { n: c.SEM_DADOS })}</Tag> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.fb.noMagicNumber")}</p>
      </header>

      {/* leitura */}
      <section aria-labelledby="fb-reading" className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-ai-spark bg-ws-ai-spark-soft p-[var(--ws-space-3)]" data-origin="SISTEMA">
        <h3 id="fb-reading" className="text-[length:var(--ws-text-body)] font-semibold">{t("pm.fb.reading")}</h3>
        {parts.map((p, i) => <NarrativeLine key={i} part={p} title={title} goTo={goTo} />)}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.fb.engineNote")}</p>
      </section>

      {/* o que mudou */}
      <section aria-labelledby="fb-changes" className="grid gap-2" aria-live="polite">
        <h3 id="fb-changes" className="text-[length:var(--ws-text-body)] font-semibold">{t("pm.fb.changes")}</h3>
        {last.length ? (
          <ul className="grid gap-1">
            {last.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]" data-change={c.id}>
                <Tag tone={c.direction === "MELHOROU" ? "success" : "danger"}>{c.direction === "MELHOROU" ? "↑" : "↓"} {t(`pm.fb.dir.${c.direction}`)}</Tag>
                <span className="min-w-0 flex-1">{title(c.id)}: {t(`pm.metricStatus.${c.from}`)} → {t(`pm.metricStatus.${c.to}`)}</span>
                {goTo ? <Button size="sm" variant="ghost" onClick={() => goTo(c.tab)}>{t(`pm.tab.${c.tab}`)}</Button> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{previous ? t("pm.fb.noChange") : t("pm.fb.noPrevious")}</p>
        )}
        {sessionStart && session.length ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.fb.session", { better, worse })}</p> : null}
      </section>

      {/* prioridades */}
      <section aria-labelledby="fb-priorities" className="grid gap-2">
        <h3 id="fb-priorities" className="text-[length:var(--ws-text-body)] font-semibold">{t("pm.fb.priorities")}</h3>
        {d.priorities.length ? (
          <ol className="grid gap-2">
            {d.priorities.map((f, i) => {
              const txt = metricText(t, intl, { id: f.metricId, vars: f.vars });
              return (
                <li key={f.metricId} className={cn("grid gap-1 rounded-[var(--ws-radius-md)] border border-l-4 bg-ws-surface-1 p-2.5", f.severity === "CRITICO" ? "border-ws-border border-l-ws-danger" : "border-ws-border border-l-ws-warning")} data-priority={f.metricId}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{i + 1}</span>
                    <MetricStatusTag status={f.severity} />
                    <span className="min-w-0 flex-1 font-semibold">{txt.title}</span>
                  </div>
                  <p className="text-[length:var(--ws-text-body-sm)]">{txt.detail}</p>
                  <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{txt.advice}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`pm.ref.${f.ref}`)}</span>
                    {goTo ? <Button size="sm" variant="primary" onClick={() => goTo(f.tab)}>{t("pm.fb.fixIn", { tab: t(`pm.tab.${f.tab}`) })}</Button> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-success-ink">{t("pm.fb.n.allGood")}</p>
        )}
      </section>

      {/* portão da fase atual */}
      <section aria-labelledby="fb-gate" className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
        <h3 id="fb-gate" className="text-[length:var(--ws-text-body)] font-semibold">{t("pm.fb.gate", { phase: t(`pm.phase.${model.currentPhase}`) })}</h3>
        <GateChecklist model={model} phase={model.currentPhase} />
        {decia && !readOnly ? <Button size="sm" variant="spark" icon="sessao-decia" onClick={() => decia.openGate(model.currentPhase)} className="justify-self-start">{t("pm.board.requestGate")}</Button> : null}
      </section>

      {/* distribuição do trabalho no grupo */}
      <GroupWork {...props} />

      {/* indicadores por grupo */}
      <div className="grid gap-[var(--ws-space-3)] @3xl:grid-cols-3">
        {METRIC_GROUPS.map((g) => <MetricGroupList key={g} group={g} metrics={g === "QUALIDADE" ? metrics.quality : g === "GOVERNANCA" ? metrics.governance : metrics.group} goTo={goTo} people={people} />)}
      </div>
    </div>
  );
}

function NarrativeLine({ part, title, goTo }: { part: NarrativePart; title: (id: string) => string; goTo?: PanelProps["goTo"] }) {
  const { t } = useI18n();
  const cls = "text-[length:var(--ws-text-body-sm)] text-ws-text";
  switch (part.kind) {
    case "phase":
      return <p className={cls}>{t("pm.fb.n.phase", { ...part.vars, phase: t(`pm.phase.${part.vars.phase}`), dominant: t(`pm.process.${part.vars.dominant}`) })}</p>;
    case "critical":
      return <p className={cls}><strong className="text-ws-danger-ink">{t("pm.fb.n.criticalLead", { n: part.metricIds.length })}</strong> {part.metricIds.map(title).join("; ")}.</p>;
    case "attention":
      return <p className={cls}><strong className="text-ws-warning-ink">{t("pm.fb.n.attentionLead", { n: part.metricIds.length })}</strong> {part.metricIds.map(title).join("; ")}.</p>;
    case "strengths":
      return <p className={cls}><strong className="text-ws-success-ink">{t("pm.fb.n.strengthsLead")}</strong> {part.metricIds.map(title).join("; ")}.</p>;
    case "group":
      return <p className={cls}>{t("pm.fb.n.group", part.vars)}</p>;
    case "next":
      return (
        <p className={cn(cls, "flex flex-wrap items-center gap-2")}>
          <span>{t("pm.fb.n.next", { title: title(part.metricId), advice: t(`pm.metric.${part.metricId}.advice`) })}</span>
          {goTo ? <Button size="sm" variant="spark" onClick={() => goTo(part.tab)}>{t("pm.fb.fixIn", { tab: t(`pm.tab.${part.tab}`) })}</Button> : null}
        </p>
      );
    case "allGood":
      return <p className={cls}>{t("pm.fb.n.allGood")}</p>;
  }
}

function GroupWork({ model, people }: FeedbackPanelProps) {
  const { t, intl } = useI18n();
  const w = workload(model);
  const p = participation(model);
  const max = Math.max(1, ...w.people.map((x) => x.days));
  const roleOf = new Map(model.team.map((m) => [m.userId, m.role]));
  const done = model.tasks.filter((x) => x.status === "CONCLUIDA" && !x.milestone);
  const reviewed = done.filter((x) => x.reviewerId && x.reviewerId !== x.responsibleId).length;
  return (
    <section aria-labelledby="fb-group" className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
      <h3 id="fb-group" className="text-[length:var(--ws-text-body)] font-semibold">{t("pm.fb.groupTitle")}</h3>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.fb.groupHint")}</p>
      <ul className="grid gap-1.5" aria-label={t("pm.fb.loadLabel")}>
        {w.people.map((x) => (
          <li key={x.userId} className="grid grid-cols-[minmax(7rem,10rem)_1fr] items-center gap-2 text-[length:var(--ws-text-caption)]" data-load={x.userId}>
            <span className="truncate">
              <span className="font-semibold">{nameOf(people, x.userId)}</span>
              {roleOf.get(x.userId) ? <span className="text-ws-text-muted"> · {t(`pm.role.${roleOf.get(x.userId)}`)}</span> : null}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 rounded-[var(--ws-radius-pill)] bg-ws-accent" style={{ width: `${Math.max(2, (x.days / max) * 100)}%` }} aria-hidden />
              <span className="shrink-0 tabular-nums text-ws-text-muted">{t("pm.fb.loadRow", { days: fmt.number(intl, x.days, 1), tasks: x.tasks, critical: x.critical })}</span>
            </span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-3 gap-2 text-[length:var(--ws-text-caption)]">
        <div className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2"><dt className="text-ws-text-muted">{t("pm.fb.unassigned")}</dt><dd className="text-[length:var(--ws-text-body)] font-semibold tabular-nums">{w.unassigned}</dd></div>
        <div className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2"><dt className="text-ws-text-muted">{t("pm.fb.fourEyes")}</dt><dd className="text-[length:var(--ws-text-body)] font-semibold tabular-nums">{reviewed}/{done.length}</dd></div>
        <div className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2"><dt className="text-ws-text-muted">{t("pm.fb.editors")}</dt><dd className="text-[length:var(--ws-text-body)] font-semibold tabular-nums">{p.authors}/{p.team}</dd></div>
      </dl>
    </section>
  );
}

function MetricGroupList({ group, metrics, goTo }: { group: MetricGroup; metrics: Metric[]; goTo?: PanelProps["goTo"]; people: PanelProps["people"] }) {
  const { t, intl } = useI18n();
  const value = (m: Metric): string | null => {
    if (m.value === null || m.value === undefined) return null;
    if (m.id === "G_RUN_GROW_TRANSFORM") return t(`pm.spend.${m.value}`);
    if (m.id === "G_AUTORIDADE_GP") return t(`pm.org.${m.value}`);
    if (m.id === "G_TAP_PATROCINADOR") return null;
    if (m.id === "Q_RESERVA") return fmt.money(intl, Number(m.value));
    return typeof m.value === "number" ? fmt.number(intl, m.value, 2) : m.value;
  };
  return (
    <section aria-labelledby={`fb-g-${group}`} className="grid content-start gap-2">
      <h3 id={`fb-g-${group}`} className="text-[length:var(--ws-text-body)] font-semibold">{t(`pm.metricGroup.${group}`)}</h3>
      <ul className="grid gap-1.5">
        {metrics.map((m) => {
          const txt = metricText(t, intl, m);
          const v = value(m);
          return (
            <li key={m.id} data-metric={m.id} data-status={m.status}>
              <details className="group rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 px-2.5 py-2">
                <summary className="flex cursor-pointer select-none flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
                  <MetricStatusTag status={m.status} />
                  <span className="min-w-0 flex-1 font-semibold">{txt.title}</span>
                  {v ? <span className="font-[family-name:var(--ws-font-mono)] tabular-nums text-ws-text-muted">{v}</span> : null}
                </summary>
                <div className="mt-1.5 grid gap-1 text-[length:var(--ws-text-body-sm)]">
                  {m.status !== "SEM_DADOS" ? <p>{txt.detail}</p> : <p className="text-ws-text-muted">{t("pm.fb.noData")}</p>}
                  <p className="text-ws-text-muted">{txt.advice}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`pm.ref.${m.ref}`)}</span>
                    {goTo ? <Button size="sm" variant="ghost" onClick={() => goTo(m.tab)}>{t("pm.ui.goToTab", { tab: t(`pm.tab.${m.tab}`) })}</Button> : null}
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
