"use client";
import { Input, Select, Tag, cn } from "@/components/ui";
import { consensus, divergence, dominance, scoreMatrix, toScoringInput } from "@/lib/decia/rules";
import type { DecisionAggregate } from "@/lib/decia/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { formatScore, useMediaQuery } from "./hooks";

/**
 * Matriz de critérios (§6.1–§6.3): notas 1–5 editáveis (a nota do avaliador atual; o consenso é a mediana), pesos
 * editáveis com validação da soma ("os pesos somam X %"), contribuição de cada critério sempre visível, etiquetas de
 * dominância, linhas incompletas fora do ranking (nunca imputar zero) e divergência alta destacada. No celular vira
 * lista por alternativa (05 §6).
 */
export interface CriteriaMatrixProps {
  aggregate: DecisionAggregate;
  currentUserId: string;
  onScore?: (altId: string, critId: string, score: number | null) => void;
  onWeight?: (critId: string, weightPct: number | null) => void;
  readOnly?: boolean;
}

export function CriteriaMatrix({ aggregate, currentUserId, onScore, onWeight, readOnly }: CriteriaMatrixProps) {
  const { t, intl } = useI18n();
  const mobile = useMediaQuery("(max-width: 767px)");
  const inp = toScoringInput(aggregate);
  const sc = scoreMatrix(inp);
  const cons = consensus(inp);
  const doms = dominance(inp);
  const divs = divergence(inp).filter((d) => d.level === "ALTA");
  const alts = [...aggregate.alternatives].filter((a) => a.status === "ATIVA").sort((a, b) => a.position - b.position);
  const crits = [...aggregate.criteria].sort((a, b) => a.position - b.position);
  const label = (id: string) => aggregate.alternatives.find((a) => a.id === id)?.label ?? "?";
  const weighting = aggregate.decision.weightingEnabled;
  const weightSum = crits.reduce((s, c) => s + (c.weightPct ?? 0), 0);
  const badWeight = weighting && crits.some((c) => c.weightPct === null || c.weightPct < 0 || c.weightPct > 100);
  const rowOf = (altId: string) => sc.ranking.find((r) => r.alt === altId);
  const rankOf = (altId: string) => sc.ranking.findIndex((r) => r.alt === altId) + 1;
  const mine = (altId: string, critId: string) => aggregate.assessments.find((a) => a.alternativeId === altId && a.criterionId === critId && a.assessorUserId === currentUserId)?.score;
  const countOf = (altId: string, critId: string) => aggregate.assessments.filter((a) => a.alternativeId === altId && a.criterionId === critId).length;
  const scoreOptions = [{ value: "", label: t("decia.matrix.noScore") }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))];

  const altHeader = (altId: string) => {
    const a = alts.find((x) => x.id === altId)!;
    const dominatedBy = doms.filter((d) => d.dominated === altId).map((d) => label(d.dominant));
    const dominates = doms.filter((d) => d.dominant === altId).map((d) => label(d.dominated));
    return (
      <div className="grid gap-1">
        <span className="font-semibold [overflow-wrap:anywhere]">{a.label} — {a.title}</span>
        <span className="flex flex-wrap gap-1">
          {a.doNothing ? <Tag tone="neutral">{t("decia.compare.doNothing")}</Tag> : null}
          {sc.incomplete.includes(altId) ? <Tag tone="warning"><span aria-hidden>!</span>{t("decia.matrix.incomplete")}</Tag> : null}
          {dominatedBy.length ? <Tag tone="brown">{t("decia.matrix.dominatedBy", { alt: dominatedBy.join(", ") })}</Tag> : null}
          {dominates.length ? <Tag tone="green">{t("decia.matrix.dominates", { alt: dominates.join(", ") })}</Tag> : null}
        </span>
      </div>
    );
  };

  const cell = (altId: string, critId: string, critName: string, altLabel: string) => {
    const median = cons[altId]?.[critId];
    const contrib = rowOf(altId)?.contributions[critId];
    const n = countOf(altId, critId);
    const div = divs.some((d) => d.alt === altId && d.crit === critId);
    return (
      <div className="grid gap-1" data-testid={`cell-${altId}-${critId}`}>
        {readOnly ? (
          <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-body)] tabular-nums">{median ?? t("decia.matrix.noScore")}</span>
        ) : (
          <div className="w-[4.75rem]"><Select
            aria-label={t("decia.matrix.scoreOf", { alt: altLabel, criterion: critName })}
            value={mine(altId, critId)?.toString() ?? ""}
            onChange={(e) => onScore?.(altId, critId, e.target.value ? Number(e.target.value) : null)}
            options={scoreOptions}
            className="min-h-[var(--ws-control-sm)] text-[length:var(--ws-text-body-sm)]"
          /></div>
        )}
        {n > 1 && median !== undefined ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.matrix.median", { value: formatScore(median, intl), n })}</span> : null}
        {contrib !== undefined ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.matrix.contributes", { value: formatScore(contrib, intl, 2) })}</span> : null}
        {div ? <Tag tone="danger" className="w-fit"><span aria-hidden>≠</span>{t("decia.matrix.divergenceHigh")}</Tag> : null}
      </div>
    );
  };

  const weightControl = (c: (typeof crits)[number]) =>
    weighting ? (
      readOnly ? (
        <span className="font-[family-name:var(--ws-font-mono)] tabular-nums">{c.weightPct ?? "—"} %</span>
      ) : (
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          aria-label={t("decia.matrix.weightOf", { criterion: c.name })}
          value={c.weightPct ?? ""}
          invalid={c.weightPct === null || c.weightPct < 0 || c.weightPct > 100}
          onChange={(e) => onWeight?.(c.id, e.target.value === "" ? null : Number(e.target.value))}
          className="min-h-[var(--ws-control-sm)] w-[5rem] text-[length:var(--ws-text-body-sm)]"
        />
      )
    ) : (
      <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.matrix.equalWeights")}</span>
    );

  const total = (altId: string) => {
    const row = rowOf(altId);
    if (!row) return <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{sc.valid ? t("decia.matrix.incomplete") : "—"}</span>;
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums" data-testid={`total-${altId}`}>{formatScore(row.score, intl, 2)}</span>
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.matrix.rank", { n: rankOf(altId) })}</span>
        {sc.leader === altId ? <Tag tone="accent">{t("decia.matrix.leader")}</Tag> : null}
      </span>
    );
  };

  const sumMessage = weighting ? (
    <p role={sc.valid ? "status" : "alert"} data-testid="weight-sum" className={cn("text-[length:var(--ws-text-body-sm)] font-semibold", sc.valid ? "text-ws-success-ink" : "text-ws-danger-ink")}>
      {badWeight ? t("decia.matrix.invalidWeight") : sc.valid ? t("decia.matrix.sumOk") : t("decia.matrix.sumBad", { sum: formatScore(weightSum, intl, Number.isInteger(weightSum) ? 0 : 2) })}
    </p>
  ) : null;
  const tie = sc.valid && sc.ranking.length >= 2 && sc.leader === null;

  if (mobile) {
    return (
      <div className="grid gap-3">
        {sumMessage}
        {weighting ? (
          <ul className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-3">
            {crits.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 text-[length:var(--ws-text-body-sm)]"><span>{c.name}</span>{weightControl(c)}</li>)}
          </ul>
        ) : null}
        {alts.map((a) => (
          <section key={a.id} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-3" aria-label={`${a.label} — ${a.title}`}>
            {altHeader(a.id)}
            <ul className="grid gap-2">
              {crits.map((c) => <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-[length:var(--ws-text-body-sm)]"><span className="pt-1.5">{c.name}</span>{cell(a.id, c.id, c.name, a.label)}</li>)}
            </ul>
            <div className="border-t border-ws-border pt-2">{total(a.id)}</div>
          </section>
        ))}
        {tie ? <Tag tone="warning">{t("decia.matrix.tie")}</Tag> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
        <table className="w-full min-w-[40rem] border-collapse text-left text-[length:var(--ws-text-body-sm)]">
          <caption className="sr-only">{t("decia.compare.matrix")}</caption>
          <thead className="bg-ws-surface-2 align-bottom">
            <tr>
              <th scope="col" className="p-3 font-semibold">{t("decia.matrix.criterion")}</th>
              <th scope="col" className="p-3 font-semibold">{t("decia.matrix.weight")}</th>
              {alts.map((a) => <th key={a.id} scope="col" className="min-w-[9rem] p-3 font-normal">{altHeader(a.id)}</th>)}
            </tr>
          </thead>
          <tbody>
            {crits.map((c) => (
              <tr key={c.id} className="border-t border-ws-border align-top">
                <th scope="row" className="p-3 font-semibold">
                  {c.name}
                  {c.description ? <span className="block text-[length:var(--ws-text-caption)] font-normal text-ws-text-muted">{c.description}</span> : null}
                </th>
                <td className="p-3">{weightControl(c)}</td>
                {alts.map((a) => <td key={a.id} className="p-3">{cell(a.id, c.id, c.name, a.label)}</td>)}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ws-border-strong bg-ws-surface-2 align-top">
              <th scope="row" className="p-3 font-semibold">{t("decia.matrix.total")}</th>
              <td className="p-3 text-[length:var(--ws-text-caption)] text-ws-text-muted">{weighting ? `${formatScore(weightSum, intl, 0)} %` : null}</td>
              {alts.map((a) => <td key={a.id} className="p-3">{total(a.id)}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {sumMessage}
        {tie ? <Tag tone="warning">{t("decia.matrix.tie")}</Tag> : null}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.matrix.scaleHint")}</p>
      </div>
    </div>
  );
}
