"use client";
/**
 * Aba "Riscos e equipe" da Mesa de Trabalho (RF22) — aula de planejamento §3.4–3.6 e de iniciação §2.3: registro de riscos com
 * análise qualitativa (matriz P × I 5 × 5) e quantitativa (VME = P × impacto), exposição líquida × reservas de contingência e
 * gerencial, partes interessadas na grade de Mendelow, equipe e matriz RACI ("exatamente um A"), responsável × revisor
 * ("quatro olhos") e carga por pessoa. Os números vêm do motor (`riskRows`, `riskExposure`, `riskSeverity`, `stakeholderMap`,
 * `raciMatrix`, `workload`, `computeMetrics`, `evaluateGate`); toda edição é um comando sobre o mesmo modelo.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Field, Input, PercentBar, Select, Tag, cn, type SelectOption, type Tone } from "@/components/ui";
import { CommitNumber, CommitText, MetricStatusTag, SectionTitle, Theory, metricText } from "@/components/projects/common";
import { fmt, nameOf, type PanelProps } from "@/components/projects/shared";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ProjectCommand } from "@/lib/projects/commands";
import {
  OPPORTUNITY_RESPONSES, THREAT_RESPONSES, emv, probabilityLevel, riskExposure, riskSeverity,
  type EngagementStrategy, type RaciLetter, type RiskBand, type RiskKind,
} from "@/lib/projects/engine/methods";
import { workload } from "@/lib/projects/feedback";
import { computeMetrics, evaluateGate, type Metric, type ProjectMetrics } from "@/lib/projects/metrics";
import type { ProjectModel, Risk } from "@/lib/projects/types";
import { evmView, raciMatrix, riskRows, stakeholderMap, type RiskRow } from "@/lib/projects/views";
import { CommunicationPlan } from "@/components/projects/CommunicationPlan";
import {
  AddForm, CAPTION, CommandNotice, LEAD, MONO, MUTED, PhaseGates, RemoveButton, STATUS_BAR, TabMetrics, personOptions, useCommand,
  type SectionProps,
} from "./ScopePanel";

const LEVELS = [1, 2, 3, 4, 5] as const;
const KINDS: readonly RiskKind[] = ["AMEACA", "OPORTUNIDADE"];
const RISK_STATUSES: readonly Risk["status"][] = ["ABERTO", "MITIGADO", "OCORREU", "ENCERRADO"];
const BANDS: readonly RiskBand[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
/** Faixa sempre com texto; a cor só reforça (crítica = etiqueta cheia). */
const BAND_TAG: Record<RiskBand, { tone: Tone; filled?: boolean }> = { BAIXA: { tone: "success" }, MEDIA: { tone: "warning" }, ALTA: { tone: "danger" }, CRITICA: { tone: "danger", filled: true } };
const BAND_CELL: Record<RiskBand, string> = {
  BAIXA: "bg-ws-success-soft",
  MEDIA: "bg-ws-warning-soft",
  ALTA: "bg-ws-danger-soft",
  CRITICA: "bg-ws-danger-soft [box-shadow:inset_0_0_0_2px_var(--ws-danger)]",
};
const STRATEGY_TONE: Record<EngagementStrategy, Tone> = { GERENCIAR_DE_PERTO: "accent", MANTER_SATISFEITO: "info", MANTER_INFORMADO: "success", MONITORAR: "neutral" };
const QUADRANT_BG: Record<EngagementStrategy, string> = {
  GERENCIAR_DE_PERTO: "bg-ws-accent-soft",
  MANTER_SATISFEITO: "bg-ws-info-soft",
  MANTER_INFORMADO: "bg-ws-success-soft",
  MONITORAR: "bg-ws-surface-2",
};
/** Opções de cada célula da RACI (R e A podem recair sobre a mesma pessoa). */
const RACI_VALUES = ["", "R", "A", "RA", "C", "I"] as const;
const TH = "px-2 py-1.5 font-semibold";
const TD = "px-2 py-1.5";

/** Probabilidade 0–1 ↔ % sem ruído de ponto flutuante (0,3 → 30). */
const toPercent = (p: number) => Math.round(p * 10000) / 100;
const responsesFor = (kind: RiskKind): readonly string[] => (kind === "AMEACA" ? THREAT_RESPONSES : OPPORTUNITY_RESPONSES);

/** Intervalo de P × I de cada faixa, lido do próprio motor (`riskSeverity`) — a legenda nunca diverge da regra. */
function bandRanges(): { band: RiskBand; min: number; max: number }[] {
  const found = new Map<RiskBand, { band: RiskBand; min: number; max: number }>();
  for (const p of LEVELS) {
    for (const i of LEVELS) {
      const { band, score } = riskSeverity(p, i);
      const r = found.get(band);
      found.set(band, r ? { band, min: Math.min(r.min, score), max: Math.max(r.max, score) } : { band, min: score, max: score });
    }
  }
  return BANDS.flatMap((b) => {
    const r = found.get(b);
    return r ? [r] : [];
  });
}

function BandTag({ band, suffix }: { band: RiskBand; suffix?: string }) {
  const { t } = useI18n();
  const s = BAND_TAG[band];
  return (
    <Tag tone={s.tone} filled={s.filled}>
      {t(`pm.riskBand.${band}`)}
      {suffix ? <span className={MONO}>{suffix}</span> : null}
    </Tag>
  );
}

/** Indicador em uma linha (status + título + detalhe) com o conselho quando pede atenção. */
function MetricLine({ metric }: { metric: Metric }) {
  const { t, intl } = useI18n();
  const txt = metricText(t, intl, metric);
  const bad = metric.status === "ATENCAO" || metric.status === "CRITICO";
  return (
    <div data-metric-line={metric.id} className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2">
      <p className={cn(CAPTION, "flex flex-wrap items-center gap-2")}>
        <MetricStatusTag status={metric.status} />
        <span className="font-semibold">{txt.title}</span>
      </p>
      <p className={CAPTION}>{txt.detail}</p>
      {bad ? <p className={MUTED}>{txt.advice}</p> : null}
    </div>
  );
}

export function RisksTeamPanel(props: PanelProps) {
  const { t } = useI18n();
  const { model, readOnly } = props;
  const { run, error, clear } = useCommand(props.dispatch, readOnly);
  const metrics = useMemo(() => computeMetrics(model), [model]);
  const section: SectionProps = { ...props, run };
  return (
    <div className="@container grid gap-[var(--ws-space-6)]" data-panel="riscos">
      <CommandNotice error={error} onClose={clear} />
      {readOnly ? <p role="note" className={MUTED}>{t("pm.ui.readOnly")}</p> : null}
      <TabMetrics metrics={metrics} tab="riscos" label={t("pm.rt.metrics")} />
      <RiskSection {...section} />
      <ReserveSection {...section} metrics={metrics} />
      <StakeholderSection {...section} />
      <CommunicationPlan {...props} dispatch={run} />
      <RaciSection {...section} />
      <AssignmentSection {...section} metrics={metrics} />
      <PhaseGates model={model} phases={["PLANEJAMENTO", "ANALISE"]} title={t("pm.rt.gates.title")} hint={t("pm.rt.gates.hint")} />
    </div>
  );
}

// ------------------------------------------------------------------ registro de riscos + matriz P × I

function RiskSection({ model, people, readOnly, selected, onSelect, run }: SectionProps) {
  const { t, intl } = useI18n();
  const hid = useId();
  const editorId = useId();
  const editorTitle = useId();
  const rows = useMemo(() => riskRows(model), [model]);
  const byId = new Map(model.risks.map((r) => [r.id, r]));
  const taskCode = new Map(model.tasks.map((x) => [x.id, x.code]));
  const [cell, setCell] = useState<{ p: number; i: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [kind, setKind] = useState<RiskKind>("AMEACA");
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  const shown = cell ? rows.filter((r) => r.pLevel === cell.p && r.iLevel === cell.i) : rows;
  const current = editing ? byId.get(editing) : undefined;
  const openEditor = (id: string) => {
    setEditing(id);
    onSelect?.(`RISK:${id}`);
  };
  const kindOptions: SelectOption[] = KINDS.map((k) => ({ value: k, label: t(`pm.riskKind.${k}`) }));
  const columns = ["title", "kind", "p", "impact", "i", "score", "emv", "response", "owner", "status", "tasks"] as const;

  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.rt.risk.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.rt.risk.lead")}</p>

      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-[minmax(18rem,1fr)_minmax(0,1fr)]">
        <RiskMatrix rows={rows} cell={cell} onCell={setCell} />
        <div className="grid content-start gap-[var(--ws-space-3)]">
          <Theory refKey="MATRIZ_PXI">{t("pm.rt.matrix.theory")}</Theory>
          <Theory refKey="RESPOSTA_RISCO">{t("pm.rt.risk.theoryResponses")}</Theory>
        </div>
      </div>

      {cell ? (
        <p role="status" className={cn(CAPTION, "flex flex-wrap items-center gap-2")}>
          <span>{t("pm.rt.risk.filtered", { p: cell.p, i: cell.i, n: shown.length })}</span>
          <Button size="sm" variant="ghost" onClick={() => setCell(null)}>{t("pm.rt.risk.showAll")}</Button>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
        <table className="w-full min-w-[58rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-register>
          <caption className="sr-only">{t("pm.rt.risk.caption")}</caption>
          <thead className="bg-ws-surface-2 text-left text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <tr>
              {columns.map((c) => <th key={c} scope="col" className={TH}>{t(`pm.rt.risk.col.${c}`)}</th>)}
              {!readOnly ? <th scope="col" className={TH}><span className="sr-only">{t("pm.rt.risk.col.actions")}</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const risk = byId.get(r.id);
              if (!risk) return null;
              const isSel = selected === `RISK:${r.id}` || editing === r.id;
              return (
                <tr key={r.id} data-risk={r.id} data-band={r.band} data-selected={isSel || undefined}
                  className={cn("border-t border-ws-border align-top", isSel && "bg-ws-accent-soft", !r.open && "text-ws-text-muted")}>
                  <th scope="row" className={cn(TD, "text-left font-semibold")}>{r.title}</th>
                  <td className={TD}>{t(`pm.riskKind.${r.kind}`)}</td>
                  <td className={cn(TD, MONO)}>{fmt.percent(intl, r.probability)}<span className="block text-ws-text-muted">{t("pm.rt.risk.level", { n: r.pLevel })}</span></td>
                  <td className={cn(TD, MONO)}>{fmt.money(intl, r.impact)}</td>
                  <td className={cn(TD, MONO)}>{r.iLevel}</td>
                  <td className={TD}><span className={cn(MONO, "mr-1")}>{r.score}</span><BandTag band={r.band} /></td>
                  <td className={cn(TD, MONO, "font-semibold")} data-emv={r.id}>{fmt.money(intl, r.emv)}</td>
                  <td className={TD}>
                    {risk.response ? t(`pm.response.${risk.response}`) : r.open ? <Tag tone="warning"><span aria-hidden>!</span>{t("pm.rt.risk.noResponse")}</Tag> : "—"}
                  </td>
                  <td className={TD}>{nameOf(people, risk.ownerId)}</td>
                  <td className={TD}>{t(`pm.riskStatus.${risk.status}`)}</td>
                  <td className={cn(TD, MONO)}>{risk.taskIds.map((id) => taskCode.get(id) ?? "?").join(", ") || "—"}</td>
                  {!readOnly ? (
                    <td className={TD}>
                      <Button size="sm" variant={editing === r.id ? "primary" : "ghost"} aria-expanded={editing === r.id} aria-controls={editing === r.id ? editorId : undefined}
                        aria-label={t("pm.rt.risk.edit", { title: r.title })} onClick={() => (editing === r.id ? setEditing(null) : openEditor(r.id))}>
                        {t("pm.ui.edit")}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {!shown.length ? (
              <tr><td colSpan={columns.length + (readOnly ? 0 : 1)} className={cn(TD, "text-center text-ws-text-muted")}>{cell ? t("pm.rt.risk.noneInCell") : t("pm.rt.risk.empty")}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className={cn(MUTED, "font-[family-name:var(--ws-font-mono)]")}>{t("pm.rt.risk.emvLegend")}</p>

      {current && !readOnly ? (
        <div ref={editorRef} id={editorId} tabIndex={-1} role="group" aria-labelledby={editorTitle} data-editor={current.id}
          className="grid gap-3 rounded-[var(--ws-radius-lg)] border-2 border-ws-accent bg-ws-surface-1 p-[var(--ws-space-3)] outline-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id={editorTitle} className="font-semibold">{t("pm.rt.risk.editor", { title: current.title })}</p>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>{t("pm.ui.close")}</Button>
          </div>
          <RiskEditor risk={current} model={model} people={people} run={run} onRemoved={() => setEditing(null)} />
        </div>
      ) : null}

      {!readOnly ? (
        <Card padding="sm" tone="soft">
          <AddForm
            label={t("pm.rt.risk.new")}
            placeholder={t("pm.rt.risk.newPlaceholder")}
            submitLabel={t("pm.rt.risk.add")}
            extra={
              <Field label={t("pm.rt.risk.field.kind")} className="min-w-[9rem]">
                {({ id }) => <Select id={id} value={kind} options={kindOptions} onChange={(e) => setKind(e.target.value as RiskKind)} />}
              </Field>
            }
            onSubmit={(text) => {
              const r = run({ type: "RISK_ADD", title: text, kind });
              if (r.ok && r.createdRef) openEditor(r.createdRef.slice("RISK:".length));
              return r;
            }}
          />
        </Card>
      ) : null}
    </section>
  );
}

function RiskEditor({ risk, model, people, run, onRemoved }: { risk: Risk; model: ProjectModel; people: PanelProps["people"]; run: SectionProps["run"]; onRemoved: () => void }) {
  const { t, intl } = useI18n();
  const upd = (patch: Extract<ProjectCommand, { type: "RISK_UPDATE" }>["patch"]) => run({ type: "RISK_UPDATE", id: risk.id, patch });
  const levelOptions: SelectOption[] = LEVELS.map((n) => ({ value: String(n), label: t(`pm.rt.level.${n}`) }));
  return (
    <>
      <div className="grid gap-2 @2xl:grid-cols-2 @5xl:grid-cols-4">
        <CommitText label={t("pm.rt.risk.field.title")} value={risk.title} onCommit={(v) => upd({ title: v })} className="@2xl:col-span-2" />
        <Field label={t("pm.rt.risk.field.kind")}>
          {({ id }) => (
            <Select id={id} value={risk.kind} options={KINDS.map((k) => ({ value: k, label: t(`pm.riskKind.${k}`) }))}
              onChange={(e) => {
                const next = e.target.value as RiskKind;
                // a resposta de ameaça não serve para oportunidade (e vice-versa); "aceitar" vale para as duas
                upd(risk.response && !responsesFor(next).includes(risk.response) ? { kind: next, response: undefined } : { kind: next });
              }} />
          )}
        </Field>
        <Field label={t("pm.rt.risk.field.status")}>
          {({ id }) => (
            <Select id={id} value={risk.status} options={RISK_STATUSES.map((s) => ({ value: s, label: t(`pm.riskStatus.${s}`) }))}
              onChange={(e) => upd({ status: e.target.value as Risk["status"] })} />
          )}
        </Field>
        <CommitNumber label={t("pm.rt.risk.field.probability")} value={toPercent(risk.probability)} min={0} max={100} suffix="%"
          hint={t("pm.rt.risk.levelHint", { n: probabilityLevel(risk.probability) })} onCommit={(v) => upd({ probability: v / 100 })} />
        <CommitNumber label={t("pm.rt.risk.field.impact")} value={risk.impact} min={0} onCommit={(v) => upd({ impact: v })} />
        <Field label={t("pm.rt.risk.field.impactLevel")}>
          {({ id }) => <Select id={id} value={String(risk.impactLevel)} options={levelOptions} onChange={(e) => upd({ impactLevel: Number(e.target.value) })} />}
        </Field>
        <Field label={t("pm.rt.risk.field.owner")}>
          {({ id }) => (
            <Select id={id} value={risk.ownerId ?? ""} options={personOptions(model, people, t, t("pm.ui.unassigned"), risk.ownerId)}
              onChange={(e) => upd({ ownerId: e.target.value || undefined })} />
          )}
        </Field>
        <Field label={t("pm.rt.risk.field.response")} hint={t(`pm.rt.risk.responses.${risk.kind}`)} className="@2xl:col-span-2">
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} value={risk.response ?? ""}
              options={[{ value: "", label: t("pm.rt.risk.noResponse") }, ...responsesFor(risk.kind).map((r) => ({ value: r, label: t(`pm.response.${r}`) }))]}
              onChange={(e) => upd({ response: (e.target.value || undefined) as Risk["response"] })} />
          )}
        </Field>
      </div>
      <p className={cn(MUTED, "font-[family-name:var(--ws-font-mono)]")} data-formula>
        {t("pm.rt.risk.emvFormula", { p: fmt.percent(intl, risk.probability), impact: fmt.money(intl, risk.impact), emv: fmt.money(intl, emv(risk.probability, risk.impact)) })}
      </p>
      <fieldset className="grid gap-0.5 @2xl:grid-cols-2">
        <legend className={cn(CAPTION, "mb-1 font-semibold")}>{t("pm.rt.risk.field.tasks")}</legend>
        {model.tasks.map((x) => (
          <Checkbox key={x.id} checked={risk.taskIds.includes(x.id)} label={<><span className={MONO}>{x.code}</span> {x.title}</>}
            onCheckedChange={(on) => upd({ taskIds: on ? [...risk.taskIds, x.id] : risk.taskIds.filter((y) => y !== x.id) })} />
        ))}
      </fieldset>
      <div>
        <RemoveButton item={risk.title} text={t("pm.rt.risk.remove")} onConfirm={() => { if (run({ type: "RISK_REMOVE", id: risk.id }).ok) onRemoved(); }} />
      </div>
    </>
  );
}

function RiskMatrix({ rows, cell, onCell }: { rows: readonly RiskRow[]; cell: { p: number; i: number } | null; onCell: (c: { p: number; i: number } | null) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid content-start gap-2" data-matrix>
      <p className="font-semibold">{t("pm.rt.matrix.title")}</p>
      <p className={MUTED}>{t("pm.rt.matrix.hint")}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] table-fixed border-collapse text-center">
          <caption className="sr-only">{t("pm.rt.matrix.caption")}</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(MUTED, "w-14 p-1 text-left font-normal")}>{t("pm.rt.matrix.corner")}</th>
              {LEVELS.map((i) => <th key={i} scope="col" className={cn(CAPTION, "p-1 font-semibold")}>{t("pm.rt.matrix.col", { i })}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...LEVELS].reverse().map((p) => (
              <tr key={p}>
                <th scope="row" className={cn(CAPTION, "p-1 text-left font-semibold")}>{t("pm.rt.matrix.row", { p })}</th>
                {LEVELS.map((i) => {
                  const n = rows.filter((r) => r.pLevel === p && r.iLevel === i).length;
                  const { band, score } = riskSeverity(p, i);
                  const active = cell?.p === p && cell.i === i;
                  return (
                    <td key={i} data-cell={`${p}-${i}`} data-count={n} className={cn("border-2 border-ws-surface-1 p-0", BAND_CELL[band])}>
                      <Button variant="ghost" size="sm" aria-pressed={active} onClick={() => onCell(active ? null : { p, i })}
                        className={cn("h-14 w-full flex-col gap-0 px-1", active && "ring-2 ring-ws-text")}>
                        <span className="sr-only">{t("pm.rt.matrix.cell", { p, i, score })}</span>
                        <span className={cn(MONO, "text-[length:var(--ws-text-body)] font-bold", !n && "text-ws-text-faint")}>{n}</span>
                        <span className={cn(CAPTION, band === "CRITICA" ? "font-bold" : "font-normal")}>{t(`pm.riskBand.${band}`)}</span>
                      </Button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={MUTED}>{t("pm.rt.matrix.axes")}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label={t("pm.rt.matrix.legend")}>
        {bandRanges().map((r) => <li key={r.band}><BandTag band={r.band} suffix={`${r.min}–${r.max}`} /></li>)}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ exposição × reserva

function ReserveSection({ model, readOnly, run, metrics }: SectionProps & { metrics: ProjectMetrics }) {
  const { t, intl } = useI18n();
  const hid = useId();
  const money = (v: number) => fmt.money(intl, v);
  // mesma exposição do critério de portão e do indicador Q_RESERVA: só riscos abertos; ameaças − oportunidades
  const exposure = riskExposure(model.risks.map((r) => ({ ...r, closed: r.status !== "ABERTO" })));
  const { contingency, management } = model.reserves;
  const covers = evaluateGate(model, "PLANEJAMENTO").find((c) => c.id === "RESERVA_COBRE_VME")?.ok ?? false;
  const status = metrics.quality.find((m) => m.id === "Q_RESERVA")?.status ?? "SEM_DADOS";
  const coverage = exposure.net > 0 ? Math.min(100, (contingency / exposure.net) * 100) : 100;
  const work = evmView(model).bac;
  const verdict = exposure.net <= 0
    ? t("pm.rt.reserve.noExposure")
    : covers
      ? t("pm.rt.reserve.yes", { reserve: money(contingency), net: money(exposure.net) })
      : t("pm.rt.reserve.no", { reserve: money(contingency), net: money(exposure.net), gap: money(exposure.net - contingency) });
  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.rt.reserve.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.rt.reserve.lead")}</p>
      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-2">
        <Card padding="sm" className="grid content-start gap-3">
          <dl className="grid grid-cols-3 gap-2">
            {([["threats", exposure.threats], ["opportunities", exposure.opportunities], ["net", exposure.net]] as const).map(([k, v]) => (
              <div key={k} className="grid content-start gap-0.5 rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2">
                <dt className={MUTED}>{t(`pm.rt.reserve.${k}`)}</dt>
                <dd className={cn(MONO, "font-semibold")} data-exposure={k}>{money(v)}</dd>
              </div>
            ))}
          </dl>
          <p className={cn(MUTED, "font-[family-name:var(--ws-font-mono)]")}>
            {t("pm.rt.reserve.formula", { threats: money(exposure.threats), opportunities: money(exposure.opportunities), net: money(exposure.net) })}
          </p>
          <div className="grid gap-2 @xl:grid-cols-2">
            <CommitNumber label={t("pm.rt.reserve.contingency")} hint={t("pm.rt.reserve.contingencyHint")} value={contingency} min={0} disabled={readOnly}
              onCommit={(v) => run({ type: "RESERVES_SET", contingency: v, management })} />
            <CommitNumber label={t("pm.rt.reserve.management")} hint={t("pm.rt.reserve.managementHint")} value={management} min={0} disabled={readOnly}
              onCommit={(v) => run({ type: "RESERVES_SET", contingency, management: v })} />
          </div>
        </Card>
        <Card padding="sm" className="grid content-start gap-3" data-verdict={covers ? "covers" : "short"}>
          <p className="font-semibold">{t("pm.rt.reserve.question")}</p>
          <PercentBar value={coverage} label={t("pm.rt.reserve.coverage")} tone={STATUS_BAR[status]} />
          <p role="status" className={cn("text-[length:var(--ws-text-body-sm)] font-semibold", covers ? "text-ws-success-ink" : "text-ws-danger-ink")}>
            <span aria-hidden>{covers ? "✓ " : "✕ "}</span>
            {verdict}
          </p>
          {!covers && exposure.net > 0 && !readOnly ? (
            <Button size="sm" variant="primary" className="justify-self-start" onClick={() => run({ type: "RESERVES_SET", contingency: exposure.net, management })}>
              {t("pm.rt.reserve.match", { net: money(exposure.net) })}
            </Button>
          ) : null}
          <p className={cn(MUTED, "font-[family-name:var(--ws-font-mono)]")}>
            {t("pm.rt.reserve.composition", { work: money(work), contingency: money(contingency), baseline: money(work + contingency), management: money(management), total: money(work + contingency + management) })}
          </p>
        </Card>
      </div>
      <Theory refKey="VME_RESERVA">{t("pm.rt.reserve.theory")}</Theory>
    </section>
  );
}

// ------------------------------------------------------------------ partes interessadas

function StakeholderSection({ model, readOnly, selected, run }: SectionProps) {
  const { t } = useI18n();
  const hid = useId();
  const [role, setRole] = useState("");
  const map = stakeholderMap(model);
  const strategyOf = new Map<string, EngagementStrategy>();
  for (const [strategy, list] of Object.entries(map) as [EngagementStrategy, ProjectModel["stakeholders"]][]) for (const s of list) strategyOf.set(s.id, strategy);
  const levelOptions: SelectOption[] = LEVELS.map((n) => ({ value: String(n), label: t(`pm.rt.level.${n}`) }));
  const quadrant = (s: EngagementStrategy) => (
    <td data-quadrant={s} className={cn("border border-ws-border p-2 align-top", QUADRANT_BG[s])}>
      <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t(`pm.engagement.${s}`)}</p>
      {map[s].length ? (
        <ul className={cn("mt-1 grid gap-0.5", CAPTION)}>
          {map[s].map((x) => <li key={x.id}>{x.name}{x.role ? <>{" "}<span className="text-ws-text-muted">· {x.role}</span></> : null}</li>)}
        </ul>
      ) : <p className={MUTED}>—</p>}
    </td>
  );
  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.rt.stk.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.rt.stk.lead")}</p>
      <div className="grid gap-[var(--ws-space-4)] @5xl:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <div className="grid content-start gap-3">
          <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
            <table className="w-full min-w-[40rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-stakeholders>
              <caption className="sr-only">{t("pm.rt.stk.caption")}</caption>
              <thead className="bg-ws-surface-2 text-left text-[length:var(--ws-text-caption)] text-ws-text-muted">
                <tr>
                  {(["name", "role", "power", "interest", "strategy"] as const).map((c) => <th key={c} scope="col" className={TH}>{t(`pm.rt.stk.col.${c}`)}</th>)}
                  {!readOnly ? <th scope="col" className={TH}><span className="sr-only">{t("pm.rt.risk.col.actions")}</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {model.stakeholders.map((s) => {
                  const isSel = selected === `STK:${s.id}`;
                  const strategy = strategyOf.get(s.id);
                  const upd = (patch: Extract<ProjectCommand, { type: "STK_UPDATE" }>["patch"]) => run({ type: "STK_UPDATE", id: s.id, patch });
                  return (
                    <tr key={s.id} data-stk={s.id} data-selected={isSel || undefined} className={cn("border-t border-ws-border align-top", isSel && "bg-ws-accent-soft")}>
                      <th scope="row" className={cn(TD, "text-left font-normal")}>
                        <CommitText bare label={t("pm.rt.stk.nameOf", { name: s.name })} value={s.name} disabled={readOnly} onCommit={(v) => upd({ name: v })} />
                      </th>
                      <td className={TD}>
                        <CommitText bare label={t("pm.rt.stk.roleOf", { name: s.name })} value={s.role ?? ""} disabled={readOnly} onCommit={(v) => upd({ role: v.trim() || undefined })} />
                      </td>
                      <td className={TD}>
                        <Select aria-label={t("pm.rt.stk.powerOf", { name: s.name })} value={String(s.power)} disabled={readOnly} options={levelOptions} onChange={(e) => upd({ power: Number(e.target.value) })} />
                      </td>
                      <td className={TD}>
                        <Select aria-label={t("pm.rt.stk.interestOf", { name: s.name })} value={String(s.interest)} disabled={readOnly} options={levelOptions} onChange={(e) => upd({ interest: Number(e.target.value) })} />
                      </td>
                      <td className={TD} data-strategy={strategy}>{strategy ? <Tag tone={STRATEGY_TONE[strategy]}>{t(`pm.engagement.${strategy}`)}</Tag> : null}</td>
                      {!readOnly ? <td className={TD}><RemoveButton item={s.name} onConfirm={() => run({ type: "STK_REMOVE", id: s.id })} /></td> : null}
                    </tr>
                  );
                })}
                {!model.stakeholders.length ? <tr><td colSpan={readOnly ? 5 : 6} className={cn(TD, "text-center text-ws-text-muted")}>{t("pm.ui.noneYet")}</td></tr> : null}
              </tbody>
            </table>
          </div>
          {!readOnly ? (
            <Card padding="sm" tone="soft">
              <AddForm
                label={t("pm.rt.stk.new")}
                placeholder={t("pm.rt.stk.newPlaceholder")}
                submitLabel={t("pm.rt.stk.add")}
                extra={
                  <Field label={t("pm.rt.stk.col.role")} className="min-w-[9rem] flex-1">
                    {({ id }) => <Input id={id} value={role} onChange={(e) => setRole(e.target.value)} />}
                  </Field>
                }
                onSubmit={(name) => {
                  const r = run({ type: "STK_ADD", name, role: role.trim() || undefined });
                  if (r.ok) setRole("");
                  return r;
                }}
              />
            </Card>
          ) : null}
        </div>
        <div className="grid content-start gap-2" data-mendelow>
          <p className="font-semibold">{t("pm.rt.stk.grid")}</p>
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">{t("pm.rt.stk.gridCaption")}</caption>
            <thead>
              <tr>
                <td className="w-24" />
                <th scope="col" className={cn(CAPTION, "p-1 font-semibold")}>{t("pm.rt.stk.lowInterest")}</th>
                <th scope="col" className={cn(CAPTION, "p-1 font-semibold")}>{t("pm.rt.stk.highInterest")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={cn(CAPTION, "p-1 text-left font-semibold")}>{t("pm.rt.stk.highPower")}</th>
                {quadrant("MANTER_SATISFEITO")}
                {quadrant("GERENCIAR_DE_PERTO")}
              </tr>
              <tr>
                <th scope="row" className={cn(CAPTION, "p-1 text-left font-semibold")}>{t("pm.rt.stk.lowPower")}</th>
                {quadrant("MONITORAR")}
                {quadrant("MANTER_INFORMADO")}
              </tr>
            </tbody>
          </table>
          <Theory refKey="PODER_INTERESSE">{t("pm.rt.stk.theory")}</Theory>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ equipe e RACI

function RaciSection({ model, people, readOnly, selected, run }: SectionProps) {
  const { t } = useI18n();
  const hid = useId();
  const rows = raciMatrix(model);
  const teamIds = new Set(model.team.map((m) => m.userId));
  // quem aparece na RACI sem estar na equipe continua visível (e corrigível)
  const outsiders = [...new Set(model.raci.map((e) => e.userId))].filter((u) => !teamIds.has(u));
  const columns = [...model.team.map((m) => ({ userId: m.userId, role: m.role as string | undefined })), ...outsiders.map((userId) => ({ userId, role: undefined }))];
  const bad = rows.filter((r) => r.problems.length).length;
  const label = (v: string) => (v === "" ? t("pm.rt.raci.none") : v === "RA" ? t("pm.rt.raci.RA") : t(`pm.raci.${v}`));
  const choices = (letters: readonly RaciLetter[]): SelectOption[] => {
    const current = letters.join("");
    const base = RACI_VALUES.map((v) => ({ value: v, label: label(v) }));
    return (RACI_VALUES as readonly string[]).includes(current) ? base : [...base, { value: current, label: letters.join(" + ") }];
  };
  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.rt.raci.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.rt.raci.lead")}</p>
      <div className="grid gap-1">
        <p className={cn(CAPTION, "font-semibold")}>{t("pm.rt.team.title")}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label={t("pm.rt.team.title")} data-team>
          {model.team.map((m) => (
            <li key={m.userId}>
              <Tag tone={m.role === "PATROCINADOR" || m.role === "GERENTE" ? "accent" : "neutral"}>
                <span className="font-semibold">{nameOf(people, m.userId)}</span> · {t(`pm.role.${m.role}`)}
              </Tag>
            </li>
          ))}
        </ul>
      </div>
      <p className={cn("flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]", bad ? "text-ws-danger-ink" : "text-ws-success-ink")}>
        <span aria-hidden className="font-bold">{bad ? "✕" : "✓"}</span>
        {t("pm.rt.raci.summary", { n: bad, total: rows.length })}
      </p>
      <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
        <table className="w-full min-w-[56rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-raci-matrix>
          <caption className="sr-only">{t("pm.rt.raci.caption")}</caption>
          <thead className="bg-ws-surface-2 text-left text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <tr>
              <th scope="col" className={TH}>{t("pm.rt.raci.activity")}</th>
              {columns.map((c) => (
                <th key={c.userId} scope="col" className={TH}>
                  <span className="text-ws-text">{nameOf(people, c.userId)}</span>
                  {c.role ? <span className="block font-normal">{t(`pm.role.${c.role}`)}</span> : null}
                </th>
              ))}
              <th scope="col" className={TH}>{t("pm.rt.raci.check")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSel = selected === `TASK:${row.taskId}`;
              return (
                <tr key={row.taskId} data-raci={row.taskId} data-problems={row.problems.join(" ") || undefined} className={cn("border-t border-ws-border align-top", isSel && "bg-ws-accent-soft")}>
                  <th scope="row" className={cn(TD, "text-left font-normal", row.problems.length ? "border-l-4 border-l-ws-danger" : null)}>
                    <span className={cn(MONO, "font-semibold")}>{row.code}</span> {row.title}
                  </th>
                  {columns.map((c) => {
                    const letters = row.cells[c.userId] ?? [];
                    return (
                      <td key={c.userId} className="px-1 py-1">
                        <Select aria-label={t("pm.rt.raci.cell", { person: nameOf(people, c.userId), code: row.code })} value={letters.join("")} disabled={readOnly}
                          options={choices(letters)} className="min-w-[6.5rem]"
                          onChange={(e) => run({ type: "RACI_SET", taskId: row.taskId, userId: c.userId, letters: e.target.value.split("") as RaciLetter[] })} />
                      </td>
                    );
                  })}
                  <td className={TD} data-check={row.taskId}>
                    {row.problems.length ? (
                      <span className="flex flex-wrap gap-1">
                        {row.problems.map((p) => <Tag key={p} tone="danger"><span aria-hidden>✕</span>{t(`pm.raciProblem.${p}`)}</Tag>)}
                      </span>
                    ) : (
                      <Tag tone="success"><span aria-hidden>✓</span>{t("pm.rt.raci.ok")}</Tag>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Theory refKey="RACI_UM_A">{t("pm.rt.raci.theory")}</Theory>
    </section>
  );
}

// ------------------------------------------------------------------ responsável × revisor e carga

function AssignmentSection({ model, people, readOnly, selected, run, metrics }: SectionProps & { metrics: ProjectMetrics }) {
  const { t, intl } = useI18n();
  const hid = useId();
  const work = model.tasks.filter((x) => !x.milestone);
  const load = workload(model);
  const roleOf = new Map(model.team.map((m) => [m.userId, m.role]));
  const carga = metrics.group.find((m) => m.id === "W_CARGA");
  const fourEyes = metrics.group.find((m) => m.id === "W_QUATRO_OLHOS");
  // a pessoa sinalizada pelo indicador (o limite de concentração é do motor)
  const concentrated = carga?.status === "ATENCAO" ? String(carga.vars.userId ?? "") : null;
  return (
    <section aria-labelledby={hid} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={hid}>{t("pm.rt.assign.title")}</SectionTitle>
      <p className={LEAD}>{t("pm.rt.assign.lead")}</p>
      <div className="grid gap-[var(--ws-space-4)] @5xl:grid-cols-[minmax(0,3fr)_minmax(16rem,2fr)]">
        <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
          <table className="w-full min-w-[40rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-assignments>
            <caption className="sr-only">{t("pm.rt.assign.caption")}</caption>
            <thead className="bg-ws-surface-2 text-left text-[length:var(--ws-text-caption)] text-ws-text-muted">
              <tr>
                {(["activity", "responsible", "reviewer", "fourEyes"] as const).map((c) => <th key={c} scope="col" className={TH}>{t(`pm.rt.assign.col.${c}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {work.map((x) => {
                const same = Boolean(x.reviewerId && x.reviewerId === x.responsibleId);
                const isSel = selected === `TASK:${x.id}`;
                const upd = (patch: Extract<ProjectCommand, { type: "TASK_UPDATE" }>["patch"]) => run({ type: "TASK_UPDATE", id: x.id, patch });
                return (
                  <tr key={x.id} data-assign={x.id} data-four-eyes={same ? "same" : x.reviewerId ? "ok" : "none"} className={cn("border-t border-ws-border align-top", isSel && "bg-ws-accent-soft")}>
                    <th scope="row" className={cn(TD, "text-left font-normal")}>
                      <span className={cn(MONO, "font-semibold")}>{x.code}</span> {x.title}
                      <span className={cn(MUTED, "block")}>{t(`pm.status.${x.status}`)}</span>
                    </th>
                    <td className={TD}>
                      <Select aria-label={t("pm.rt.assign.responsibleOf", { code: x.code })} value={x.responsibleId ?? ""} disabled={readOnly}
                        options={personOptions(model, people, t, t("pm.ui.unassigned"), x.responsibleId)} onChange={(e) => upd({ responsibleId: e.target.value || undefined })} />
                    </td>
                    <td className={TD}>
                      <Select aria-label={t("pm.rt.assign.reviewerOf", { code: x.code })} value={x.reviewerId ?? ""} disabled={readOnly}
                        options={personOptions(model, people, t, t("pm.rt.assign.noReviewer"), x.reviewerId)} onChange={(e) => upd({ reviewerId: e.target.value || undefined })} />
                    </td>
                    <td className={TD}>
                      {same ? (
                        <Tag tone="danger"><span aria-hidden>✕</span>{t("pm.rt.assign.same")}</Tag>
                      ) : x.reviewerId ? (
                        <Tag tone="success"><span aria-hidden>✓</span>{t("pm.rt.assign.ok")}</Tag>
                      ) : (
                        <Tag><span aria-hidden>–</span>{t("pm.rt.assign.none")}</Tag>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid content-start gap-3">
          <p className="font-semibold">{t("pm.rt.load.title")}</p>
          <p className={MUTED}>{t("pm.rt.load.hint")}</p>
          <ul className="grid gap-2" aria-label={t("pm.rt.load.title")}>
            {load.people.map((p) => {
              const role = roleOf.get(p.userId);
              return (
                <li key={p.userId} data-load={p.userId} data-days={p.days}>
                  <PercentBar
                    value={load.assignedDays ? (p.days / load.assignedDays) * 100 : 0}
                    label={t("pm.rt.load.bar", { name: role ? `${nameOf(people, p.userId)} · ${t(`pm.role.${role}`)}` : nameOf(people, p.userId), days: fmt.number(intl, p.days, 1), tasks: p.tasks })}
                    tone={p.userId === concentrated ? "warning" : "accent"}
                  />
                </li>
              );
            })}
          </ul>
          {load.unassigned ? <p className={cn(CAPTION, "text-ws-warning-ink")}><span aria-hidden>! </span>{t("pm.rt.load.unassigned", { n: load.unassigned })}</p> : null}
          {carga ? <MetricLine metric={carga} /> : null}
          {fourEyes ? <MetricLine metric={fourEyes} /> : null}
        </div>
      </div>
      <div className="grid gap-[var(--ws-space-3)] @3xl:grid-cols-2">
        <Theory refKey="QUALIDADE_REVISAO">{t("pm.rt.assign.theory")}</Theory>
        <Theory refKey="RECURSOS_EQUIPE">{t("pm.rt.load.theory")}</Theory>
      </div>
    </section>
  );
}
