"use client";
import { useState, type ReactNode } from "react";
import { Badge, Button, Card, EmptyState, Tag, cn } from "@/components/ui";
import { track } from "@/lib/decia/analytics";
import { addCriteria, DECISION_TEMPLATES, setRecommendationStatus, setScore, setWeight } from "@/lib/decia/commands";
import {
  brier, CALIBRATION_MIN_N, divergence, evidenceStrengthOf, freshness, health, riskSeverity, scoreOf, toScoringInput, verifySnapshot,
} from "@/lib/decia/rules";
import type { DecisionAggregate, DecisionLevel, EvidenceNature, Likelihood, PeopleDirectory } from "@/lib/decia/types";
import { DECISION_LEVEL, isStructureEditable, LIKELIHOOD } from "@/lib/decia/types";
import { toDecisionCardViewModel } from "@/lib/decia/view-model";
import { useI18n } from "@/lib/i18n/useI18n";
import { AiSuggestion } from "./AiSuggestion";
import { DecisionTimeline, SensitivityPanel, TradeOffView } from "./Analysis";
import { DecisionStatusBadge, EvidenceStrengthBadge, FreshnessBadge, LevelChip, StatementNatureChip } from "./Badges";
import { CriteriaMatrix } from "./CriteriaMatrix";
import { DecisionCard } from "./DecisionCard";
import { AddAlternativeDialog, AddEvidenceDialog, RecordOutcomeDialog } from "./Dialogs";
import { formatDateTime, formatDay, formatScore } from "./hooks";
import { HEALTH_META, LEVEL_TONE } from "./meta";
import { ReadinessCheck } from "./ReadinessCheck";

export interface SectionProps {
  aggregate: DecisionAggregate;
  now: Date;
  currentUserId: string;
  people: PeopleDirectory;
  onSave: (next: DecisionAggregate) => void;
  /** abre o diálogo "Decidir" (guarda pré-decisão) */
  onDecide?: () => void;
  isOwner: boolean;
  defaultFlipped?: boolean;
}

/* ---------- blocos comuns ---------- */
function Block({ title, children, actions, className, testId }: { title: ReactNode; children: ReactNode; actions?: ReactNode; className?: string; testId?: string }) {
  return (
    <Card as="section" padding="md" className={cn("grid content-start gap-[var(--ws-space-3)]", className)} title={title} actions={actions} data-testid={testId}>
      {children}
    </Card>
  );
}
function Dl({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-[length:var(--ws-text-body-sm)] sm:grid-cols-[11rem_minmax(0,1fr)]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-semibold text-ws-text-muted">{k}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
const muted = (s: string) => <span className="text-ws-text-muted">{s}</span>;
function AiUnavailable() {
  const { t } = useI18n();
  return <p role="alert" className="rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-3 text-[length:var(--ws-text-body-sm)] font-semibold" data-testid="ai-unavailable">{t("decia.ai.unavailable")}</p>;
}

/* ================================================================================================
 * 1. Visão geral
 * ================================================================================================ */
export function OverviewSection({ aggregate, now, people, defaultFlipped }: SectionProps) {
  const { t, intl } = useI18n();
  const d = aggregate.decision;
  const vm = toDecisionCardViewModel(aggregate, now, { people, includeBack: true });
  const h = health(aggregate, now);
  const ns = t("decia.ws.notSet");
  return (
    <div className="grid gap-[var(--ws-space-4)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-[var(--ws-space-4)]">
        <div data-testid="overview-card"><DecisionCard vm={vm} mode="DETAIL" defaultFlipped={defaultFlipped} /></div>
        {d.contextNoteKey ? (
          <aside className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-info bg-ws-info-soft p-3 text-[length:var(--ws-text-body-sm)]" data-testid="context-note">
            <p className="font-semibold text-ws-info-ink"><span aria-hidden>ⓘ </span>{t("decia.note.title")}</p>
            <p>{t(d.contextNoteKey)}</p>
          </aside>
        ) : null}
        <Block title={t("decia.overview.framing")}>
          <Dl items={[
            [t("decia.overview.question"), d.question],
            [t("decia.overview.objective"), d.objective ?? muted(ns)],
            [t("decia.overview.scope"), d.scope ?? muted(ns)],
            [t("decia.overview.constraints"), d.constraintsMd ?? muted(ns)],
            [t("decia.overview.context"), d.contextMd ?? muted(ns)],
            [t("decia.overview.stakeholders"), d.stakeholders.length ? d.stakeholders.join(" · ") : muted(ns)],
            [t("decia.overview.complexity"), <span key="c" className="flex flex-wrap gap-1.5"><Tag tone="neutral">{t(`decia.complexity.${d.complexity}`)}</Tag><LevelChip kind="impact" level={d.impact} /><LevelChip kind="urgency" level={d.urgency} /></span>],
          ]} />
        </Block>
        <Block title={t("decia.overview.participants")}>
          <ul className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
            {aggregate.participants.map((p) => (
              <li key={p.userId} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{people[p.userId]?.name ?? p.userId}</span>
                <Tag tone="neutral">{t(`decia.role.${p.role}`)}</Tag>
                {p.assessmentsSubmittedAt ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.overview.submitted")}</span> : null}
              </li>
            ))}
          </ul>
        </Block>
      </div>
      <div className="grid content-start gap-[var(--ws-space-4)]">
        <Block title={t("decia.ws.readiness")}><ReadinessCheck readiness={vm.readiness} /></Block>
        <Block title={t("decia.overview.health")}>
          <ul className="grid gap-1.5" data-testid="health">
            {h.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-[length:var(--ws-text-body-sm)]">
                <Tag tone={c.applicable ? HEALTH_META[c.state].tone : "neutral"} className="min-w-[5.5rem] justify-center whitespace-nowrap">
                  <span aria-hidden>{c.applicable ? HEALTH_META[c.state].icon : "–"}</span>
                  {c.applicable ? t(`decia.healthState.${c.state}`) : t("decia.overview.healthNA")}
                </Tag>
                <span className="pt-0.5">{t(`decia.health.${c.key}`)}{c.ratio !== null ? <span className="text-ws-text-muted"> · {Math.round(c.ratio * 100)} %</span> : null}</span>
              </li>
            ))}
          </ul>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.overview.noAggregate")}</p>
        </Block>
        <Block title={t("decia.timeline.title")}><DecisionTimeline items={vm.timeline} /></Block>
        <Block title={t("decia.changes.title")} testId="structure-changes">
          {vm.changes.length ? (
            <ol className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]" aria-label={t("decia.changes.title")}>
              {vm.changes.map((c, i) => (
                <li key={`${c.type}-${c.at}-${i}`} className="grid grid-cols-[1fr_auto] gap-2" data-change={c.type}>
                  <span>{t(`decia.changes.${c.type}`, { actor: c.actor, subject: c.subject ?? "—", value: c.value === null ? "—" : String(c.value) })}</span>
                  <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{formatDateTime(c.at, intl)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.changes.empty")}</p>}
        </Block>
      </div>
    </div>
  );
}

/* ================================================================================================
 * 2. Evidências
 * ================================================================================================ */
export function EvidenceSection(props: SectionProps) {
  const { aggregate, currentUserId, onSave } = props;
  const { t, intl } = useI18n();
  const [adding, setAdding] = useState(false);
  const altLabel = (id: string) => aggregate.alternatives.find((a) => a.id === id)?.label ?? "?";
  const target = (type: string, id: string) =>
    type === "ALTERNATIVA" ? altLabel(id) : type === "CRITERIO" ? aggregate.criteria.find((c) => c.id === id)?.name ?? id : type === "PREMISSA" ? t("decia.nature.PREMISSA") : type === "RISCO" ? t("decia.card.node.risk") : t("decia.evidence.assessment");
  const dialog = <AddEvidenceDialog open={adding} onOpenChange={setAdding} aggregate={aggregate} currentUserId={currentUserId} onSave={onSave} />;
  if (!aggregate.evidence.length) {
    return (
      <>
        <EmptyState title={t("decia.evidence.emptyTitle")} description={t("decia.evidence.emptyDesc")} action={<Button variant="primary" onClick={() => setAdding(true)}>{t("decia.evidence.add")}</Button>} />
        {dialog}
      </>
    );
  }
  const alts = aggregate.alternatives.filter((a) => a.status === "ATIVA").sort((a, b) => a.position - b.position);
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Block title={t("decia.evidence.strengthByAlt")} actions={<Button size="sm" variant="primary" onClick={() => setAdding(true)}>{t("decia.evidence.add")}</Button>}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {alts.map((a) => {
            const s = evidenceStrengthOf(aggregate, a.id);
            return (
              <li key={a.id} className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border p-3 text-[length:var(--ws-text-body-sm)]">
                <span className="font-semibold">{a.label} — {a.title}</span>
                <EvidenceStrengthBadge level={s.level} none={s.reason === "SEM_EVIDENCIA"} className="w-fit" />
                <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.evidence.supportContra", { support: formatScore(s.support, intl, 1), contra: formatScore(s.contra, intl, 1) })}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.evidence.contraryNote")}</p>
      </Block>
      <ul className="grid gap-[var(--ws-space-3)]" aria-label={t("decia.ws.section.evidencias")}>
        {aggregate.evidence.map((e) => {
          const links = aggregate.evidenceLinks.filter((l) => l.evidenceId === e.id);
          return (
            <li key={e.id}>
              <Card padding="md" className={cn("grid gap-2", e.supersededAt && "opacity-70")}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatementNatureChip nature={e.nature as EvidenceNature} />
                  {e.origin === "IA" ? <Badge tone="spark">✦ {t("decia.ai.badge")}</Badge> : null}
                  {e.supersededAt ? <Tag tone="neutral">{t("decia.evidence.superseded")}</Tag> : null}
                  <h3 className="min-w-0 flex-1 font-semibold">{e.title}</h3>
                </div>
                {e.summary ? <p className="text-[length:var(--ws-text-body-sm)]">{e.summary}</p> : null}
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
                  <span>{t("decia.evidence.source")}: <span className="text-ws-text">{e.authorLabel ? `${e.sourceLabel} · ${e.authorLabel}` : e.sourceLabel}</span></span>
                  {e.observedAt ? <span>{t("decia.evidence.observed")}: {formatDay(e.observedAt, intl)}</span> : null}
                  {e.retrievedAt ? <span>{t("decia.evidence.retrieved")}: {formatDay(e.retrievedAt, intl)}</span> : null}
                  <span>{t("decia.evidence.quality")}: {t(`decia.quality.${e.sourceQuality}`)}</span>
                  <span>{t("decia.evidence.relevance")}: {t(`decia.rel.${e.relevance}`)}</span>
                  <span>{t("decia.evidence.reliability")}: {t(`decia.rel.${e.reliability}`)}</span>
                </p>
                {links.length ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label={t("decia.evidence.links")}>
                    {links.map((l) => (
                      <li key={l.id}>
                        <Tag tone={l.stance === "SUSTENTA" ? "success" : l.stance === "CONTRADIZ" ? "danger" : "neutral"}>
                          <span aria-hidden>{l.stance === "SUSTENTA" ? "+" : l.stance === "CONTRADIZ" ? "−" : "·"}</span>
                          {t(`decia.stance.${l.stance}`)} {target(l.targetType, l.targetId)}
                        </Tag>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
      {dialog}
    </div>
  );
}

/* ================================================================================================
 * 3. Comparar
 * ================================================================================================ */
export function CompareSection(props: SectionProps) {
  const { aggregate, currentUserId, people, onSave } = props;
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [aiAsked, setAiAsked] = useState(false);
  const alts = [...aggregate.alternatives].sort((a, b) => a.position - b.position);
  const editable = isStructureEditable(aggregate.decision.status);
  const divs = divergence(toScoringInput(aggregate)).filter((d) => d.level !== "BAIXA");
  const altName = (id: string) => { const a = aggregate.alternatives.find((x) => x.id === id); return a ? `${a.label} — ${a.title}` : id; };
  const critName = (id: string) => aggregate.criteria.find((c) => c.id === id)?.name ?? id;
  const dialog = <AddAlternativeDialog open={adding} onOpenChange={setAdding} aggregate={aggregate} currentUserId={currentUserId} onSave={onSave} />;
  const tpl = DECISION_TEMPLATES[aggregate.decision.templateKey ?? ""] ?? (aggregate.decision.kind === "PRODUTO" ? DECISION_TEMPLATES.priorizacao! : aggregate.decision.kind === "TECNICA" ? DECISION_TEMPLATES.arquitetura! : DECISION_TEMPLATES.fornecedor!);

  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Block
        title={t("decia.compare.alternatives")}
        actions={alts.length && editable ? <Button size="sm" onClick={() => setAdding(true)}>{t("decia.compare.addAlternative")}</Button> : undefined}
        testId="alternatives"
      >
        {alts.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {alts.map((a) => (
              <li key={a.id} className={cn("grid content-start gap-1.5 rounded-[var(--ws-radius-md)] border p-3 text-[length:var(--ws-text-body-sm)]", a.status === "DESCARTADA" ? "border-dashed border-ws-border-strong opacity-80" : "border-ws-border")}>
                <span className="font-semibold">{a.label} — {a.title}</span>
                <span className="flex flex-wrap gap-1">
                  {a.doNothing ? <Tag tone="neutral">{t("decia.compare.doNothing")}</Tag> : null}
                  {a.status === "DESCARTADA" ? <Tag tone="neutral"><span aria-hidden>✕</span>{t("decia.compare.discarded")}</Tag> : null}
                  {a.origin === "IA" ? <Badge tone="spark">✦ {t("decia.ai.badge")}</Badge> : null}
                </span>
                {a.discardReason ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.compare.discardReason", { reason: a.discardReason })}</span> : null}
                {a.estimatedCost || a.estimatedDurationDays ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{[a.estimatedCost, a.estimatedDurationDays ? t("decia.compare.days", { n: a.estimatedDurationDays }) : null].filter(Boolean).join(" · ")}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            title={t("decia.compare.noAlternatives")}
            action={editable ? <div className="flex flex-wrap justify-center gap-2"><Button variant="primary" onClick={() => setAdding(true)}>{t("decia.compare.addAlternative")}</Button><Button variant="spark" onClick={() => setAiAsked(true)}>✦ {t("decia.compare.suggestAi")}</Button></div> : undefined}
          />
        )}
        {aiAsked ? <AiUnavailable /> : null}
      </Block>

      <Block title={t("decia.compare.matrix")} testId="matrix">
        {!aggregate.criteria.length ? (
          <EmptyState
            compact
            title={t("decia.compare.noCriteria")}
            action={editable ? <Button variant="primary" onClick={() => onSave(addCriteria(aggregate, tpl.criteria, currentUserId, new Date()))}>{t("decia.compare.chooseTemplate")}</Button> : undefined}
          />
        ) : !alts.some((a) => a.status === "ATIVA") ? (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.compare.matrixNeedsAlternatives")}</p>
        ) : (
          <>
            {aggregate.decision.independentScoring ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.compare.independentNote")}</p> : null}
            {editable ? null : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="matrix-locked">{t("decia.compare.lockedAfterDecision")}</p>}
            <CriteriaMatrix
              aggregate={aggregate}
              currentUserId={currentUserId}
              readOnly={!editable}
              onScore={editable ? (altId, critId, score) => onSave(setScore(aggregate, altId, critId, currentUserId, score, new Date())) : undefined}
              onWeight={editable ? (critId, pct) => onSave(setWeight(aggregate, critId, pct, currentUserId, new Date())) : undefined}
            />
          </>
        )}
      </Block>

      {aggregate.criteria.length && alts.length ? (
        <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-2">
          <Block title={t("decia.compare.sensitivity")}><SensitivityPanel aggregate={aggregate} /></Block>
          <Block title={t("decia.compare.divergence")} testId="divergence">
            {divs.length ? (
              <ul className="grid gap-2 text-[length:var(--ws-text-body-sm)]">
                {divs.map((d) => (
                  <li key={`${d.alt}-${d.crit}`} className="grid gap-1">
                    <span className="flex flex-wrap items-center gap-2"><Tag tone={d.level === "ALTA" ? "danger" : "warning"}>{t(`decia.divergence.${d.level}`)}</Tag><span className="font-semibold">{altName(d.alt)} · {critName(d.crit)}</span></span>
                    <span className="text-ws-text-muted">
                      {aggregate.assessments.filter((x) => x.alternativeId === d.alt && x.criterionId === d.crit).map((x) => `${people[x.assessorUserId]?.name ?? x.assessorUserId}: ${x.score}`).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.divergence.none")}</p>}
            <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.divergence.signal")}</p>
          </Block>
        </div>
      ) : null}

      {alts.length ? <Block title={t("decia.compare.tradeoffs")}><TradeOffView aggregate={aggregate} /></Block> : null}

      {aggregate.scenarios.length ? (
        <Block title={t("decia.compare.scenarios")}>
          <ul className="grid gap-2 sm:grid-cols-3">
            {aggregate.scenarios.map((s) => (
              <li key={s.id} className="grid content-start gap-1 rounded-[var(--ws-radius-md)] border border-ws-border p-3 text-[length:var(--ws-text-body-sm)]">
                <span className="flex flex-wrap items-center gap-1.5"><Tag tone={s.case === "MELHOR" ? "success" : s.case === "PIOR" ? "danger" : "info"}>{t(`decia.scenario.${s.case}`)}</Tag>{s.alternativeId ? <span className="text-ws-text-muted">{altName(s.alternativeId)}</span> : null}</span>
                <span>{s.description}</span>
                <span className="text-ws-text-muted">{s.expectedResult} · {t(`decia.likelihood.${s.likelihood}`)}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
      {dialog}
    </div>
  );
}

/* ================================================================================================
 * 4. Riscos e premissas
 * ================================================================================================ */
export function RisksSection({ aggregate, people }: SectionProps) {
  const { t } = useI18n();
  const [aiAsked, setAiAsked] = useState(false);
  const altLabel = (id?: string) => (id ? aggregate.alternatives.find((a) => a.id === id)?.label ?? "?" : t("decia.risks.general"));
  const open = aggregate.risks.filter((r) => r.status === "ABERTO");
  const count = (l: Likelihood, i: DecisionLevel) => open.filter((r) => r.likelihood === l && r.impact === i).length;
  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <Block title={t("decia.risks.assumptions")} testId="assumptions">
        {aggregate.assumptions.length ? (
          <ul className="grid gap-2">
            {aggregate.assumptions.map((a) => (
              <li key={a.id} className="grid gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-border p-3 text-[length:var(--ws-text-body-sm)]">
                <span className="flex flex-wrap items-center gap-2">
                  <StatementNatureChip nature="PREMISSA" />
                  <span className="min-w-0 flex-1 font-semibold">{a.statement}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Tag tone={LEVEL_TONE[a.importance]}>{t("decia.risks.importance")}: {t(`decia.level.${a.importance}`)}</Tag>
                  <Tag tone={a.validationStatus === "VALIDADA" ? "success" : a.validationStatus === "INVALIDADA" ? "danger" : a.validationStatus === "EM_VALIDACAO" ? "info" : "warning"}>{t(`decia.validation.${a.validationStatus}`)}</Tag>
                  {a.confidencePct != null ? <span className="text-ws-text-muted">{t("decia.risks.confidence")}: {a.confidencePct} %</span> : null}
                  {a.alternativeId ? <span className="text-ws-text-muted">· {altLabel(a.alternativeId)}</span> : null}
                  {a.ownerUserId ? <span className="text-ws-text-muted">· {people[a.ownerUserId]?.name}</span> : null}
                </span>
                {a.validationNote ? <span className="text-ws-text-muted">{a.validationNote}</span> : null}
              </li>
            ))}
          </ul>
        ) : <EmptyState compact title={t("decia.risks.emptyAssumptions")} />}
      </Block>
      <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Block title={t("decia.risks.title")} testId="risks">
          {aggregate.risks.length ? (
            <ul className="grid gap-2">
              {aggregate.risks.map((r) => {
                const sev = riskSeverity(r.likelihood, r.impact);
                return (
                  <li key={r.id} className={cn("grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border p-3 text-[length:var(--ws-text-body-sm)]", r.status !== "ABERTO" && "opacity-75")}>
                    <span className="flex flex-wrap items-center gap-2">
                      <Tag tone={LEVEL_TONE[sev]}><span aria-hidden>▲</span>{t("decia.chip.risk", { level: t(`decia.level.${sev}`) })}</Tag>
                      <span className="min-w-0 flex-1 font-semibold">{r.title}</span>
                      <Tag tone="neutral">{t(`decia.riskStatus.${r.status}`)}</Tag>
                    </span>
                    <span className="text-ws-text-muted">{t(`decia.likelihood.${r.likelihood}`)} × {t(`decia.level.${r.impact}`)} · {altLabel(r.alternativeId)} · {t(`decia.riskSource.${r.source}`)}</span>
                    {r.mitigation ? <span>{t("decia.risks.mitigation")}: {r.mitigation}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : <EmptyState compact title={t("decia.risks.emptyRisks")} />}
        </Block>
        <Block title={t("decia.risks.matrixTitle")}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-[length:var(--ws-text-caption)]">
              <caption className="sr-only">{t("decia.risks.matrixTitle")}</caption>
              <thead><tr><th scope="col" className="p-1 text-left text-ws-text-muted">{t("decia.risks.likelihood")} \ {t("decia.risks.impact")}</th>{DECISION_LEVEL.map((i) => <th key={i} scope="col" className="p-1 font-semibold">{t(`decia.level.${i}`)}</th>)}</tr></thead>
              <tbody>
                {[...LIKELIHOOD].reverse().map((l) => (
                  <tr key={l}>
                    <th scope="row" className="p-1 text-left font-semibold">{t(`decia.likelihood.${l}`)}</th>
                    {DECISION_LEVEL.map((i) => {
                      const sev = riskSeverity(l, i);
                      const n = count(l, i);
                      return (
                        <td key={i} className="p-0.5">
                          <span className={cn("flex min-h-9 flex-col items-center justify-center rounded-[var(--ws-radius-sm)] border", sev === "CRITICO" ? "border-ws-danger bg-ws-danger-soft" : sev === "ALTO" ? "border-ws-warning bg-ws-warning-soft" : sev === "MEDIO" ? "border-ws-info bg-ws-info-soft" : "border-ws-border bg-ws-surface-2")}>
                            <span className="text-[10px] text-ws-text-muted">{t(`decia.level.${sev}`)}</span>
                            {n ? <span className="font-bold">{n}</span> : null}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.risks.matrixNote")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="spark" onClick={() => setAiAsked(true)}>✦ {t("decia.risks.premortem")}</Button>
            <Button size="sm" variant="spark" onClick={() => setAiAsked(true)}>✦ {t("decia.risks.redTeam")}</Button>
          </div>
          {aiAsked ? <AiUnavailable /> : null}
        </Block>
      </div>
    </div>
  );
}

/* ================================================================================================
 * 5. Decisão
 * ================================================================================================ */
export function DecisionSection({ aggregate, people, onDecide, isOwner, currentUserId, onSave }: SectionProps) {
  const { t, intl } = useI18n();
  const d = aggregate.decision;
  const sc = scoreOf(aggregate);
  const altName = (id?: string | null) => { const a = aggregate.alternatives.find((x) => x.id === id); return a ? `${a.label} — ${a.title}` : "—"; };
  const model = aggregate.recommendations.filter((r) => r.source === "MODELO");
  const ai = aggregate.recommendations.filter((r) => r.source === "IA");
  // depois de decidir, a sugestão da IA não entra mais no registro: botões indisponíveis com o motivo (Amershi G2/G9)
  const aiEditable = isStructureEditable(aggregate.decision.status);
  const snap = [...aggregate.snapshots].filter((s) => s.kind === "DECISAO").sort((a, b) => b.versionNumber - a.versionNumber)[0];
  const decided = !!snap;
  const assumptionText = (id: string) => aggregate.assumptions.find((a) => a.id === id)?.statement ?? id;
  const preDecision = ["COMPARACAO", "AGUARDANDO_DECISAO", "PESQUISA", "ENQUADRAMENTO", "RASCUNHO", "REABERTA"].includes(d.status);
  const snapContent = snap ? (JSON.parse(snap.contentJson) as { ranking?: { alt: string; score: number }[] }) : null;
  return (
    <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-2">
      <div className="grid content-start gap-[var(--ws-space-4)]">
        <Block title={t("decia.decision.recommendation")} testId="recommendation">
          {model.length ? model.map((r) => (
            <div key={r.id} className="grid gap-2 text-[length:var(--ws-text-body-sm)]">
              <p className="flex flex-wrap items-center gap-2"><Tag tone="accent"><span aria-hidden>✓</span>{t("decia.decision.modelRec")}</Tag><span className="font-semibold">{altName(r.alternativeId)}</span></p>
              <p>{r.reasoningMd}</p>
              <Dl items={[
                [t("decia.decision.whySupport"), r.supporting.join(" · ")],
                [t("decia.decision.whyContradict"), r.contradicting.join(" · ")],
                [t("decia.decision.whyAssumptions"), r.criticalAssumptionIds.length ? r.criticalAssumptionIds.map(assumptionText).join(" · ") : muted(t("decia.decision.noneCritical"))],
                [t("decia.decision.whyChange"), r.whatWouldChangeMd],
                [t("decia.decision.limitations"), r.limitationsMd],
              ]} />
            </div>
          )) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{sc.leader ? t("decia.decision.leaderOnly", { alt: altName(sc.leader) }) : t("decia.decision.noRecommendation")}</p>}
          {ai.map((r) => (
            <AiSuggestion
              key={r.id}
              title={r.reasoningMd}
              status={r.status}
              disabled={!aiEditable}
              onAccept={() => { onSave(setRecommendationStatus(aggregate, r.id, "ACEITA", currentUserId, new Date())); track("ai_suggestion_accepted", { decisionId: d.id, suggestionId: r.id }); }}
              onDismiss={() => { onSave(setRecommendationStatus(aggregate, r.id, "DESCARTADA", currentUserId, new Date())); track("ai_suggestion_dismissed", { decisionId: d.id, suggestionId: r.id }); }}
            >
              <span className="text-ws-text-muted">{t("decia.decision.whyChange")}: {r.whatWouldChangeMd}</span>
              {!aiEditable && r.status === "SUGERIDA" ? <span className="block text-ws-text-muted" data-testid="ai-locked">{t("decia.ai.lockedAfterDecision")}</span> : null}
            </AiSuggestion>
          ))}
        </Block>
        <Block title={t("decia.decision.triggers")}>
          {aggregate.triggers.length ? (
            <ul className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
              {aggregate.triggers.map((tr) => <li key={tr.id} className="flex flex-wrap items-center gap-2"><Tag tone={tr.status === "DISPARADO" ? "danger" : "neutral"}>{t(`decia.trigger.${tr.status}`)}</Tag>{tr.conditionText}</li>)}
            </ul>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.decision.noTriggers")}</p>}
        </Block>
      </div>
      <div className="grid content-start gap-[var(--ws-space-4)]">
        <Block title={t("decia.decision.current")} testId="current-state">
          <Dl items={[
            [t("decia.decision.status"), <DecisionStatusBadge key="s" status={d.status} />],
            [t("decia.decision.selected"), d.selectedAlternativeId ? altName(d.selectedAlternativeId) : muted(t("decia.card.noOption"))],
            [t("decia.decision.leader"), sc.leader ? `${altName(sc.leader)} · ${formatScore(sc.ranking[0]!.score, intl)}` : muted(t("decia.matrix.tie"))],
          ]} />
          {preDecision ? (
            <div className="grid gap-1.5">
              <Button variant="primary" onClick={onDecide} disabled={!isOwner} className="w-fit" data-testid="decide-section">{t("decia.ws.decide")}</Button>
              {!isOwner ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.ws.onlyOwner")}</p> : null}
            </div>
          ) : null}
        </Block>
        <Block title={t("decia.decision.snapshot")} testId="snapshot">
          {decided && snap ? (
            <div className="grid gap-3 text-[length:var(--ws-text-body-sm)]">
              <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.decision.snapshotNote")}</p>
              <Dl items={[
                [t("decia.decision.selected"), <span key="sel" className="font-semibold">{altName(aggregate.alternatives.find((a) => a.label === snap.selectedAlternativeLabel)?.id)}</span>],
                [t("decia.decision.rationale"), snap.rationale],
                [t("decia.decision.confidenceShort"), snap.confidencePct != null ? `${snap.confidencePct} %` : "—"],
                [t("decia.decision.ranking"), snapContent?.ranking?.map((r) => `${aggregate.alternatives.find((a) => a.id === r.alt)?.label ?? r.alt} ${formatScore(r.score, intl)}`).join(" · ") || "—"],
                [t("decia.decision.takenAt"), `${formatDateTime(snap.takenAt, intl)} · ${people[snap.takenByUserId]?.name ?? snap.takenByUserId}`],
                [t("decia.decision.modelVersion"), snap.modelVersion],
                ["SHA-256", <code key="h" className="block break-all font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)]" data-testid="snapshot-hash">{snap.contentSha256}</code>],
              ]} />
              <Tag tone={verifySnapshot(snap) ? "success" : "danger"} className="w-fit"><span aria-hidden>{verifySnapshot(snap) ? "✓" : "✕"}</span>{t(verifySnapshot(snap) ? "decia.decision.hashOk" : "decia.decision.hashBad")}</Tag>
              {d.selectedAlternativeId && aggregate.alternatives.find((a) => a.id === d.selectedAlternativeId)?.label !== snap.selectedAlternativeLabel ? <p className="text-ws-warning-ink">{t("decia.decision.differs")}</p> : null}
            </div>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.decision.noSnapshot")}</p>}
        </Block>
      </div>
    </div>
  );
}

/* ================================================================================================
 * 6. Execução e revisão
 * ================================================================================================ */
export function ExecutionSection(props: SectionProps) {
  const { aggregate, now, people, currentUserId, onSave } = props;
  const { t, intl } = useI18n();
  const [recording, setRecording] = useState(false);
  const d = aggregate.decision;
  const decided = ["DECIDIDA", "EM_EXECUCAO", "RESOLVIDA", "REVISADA", "ARQUIVADA"].includes(d.status);
  if (!decided) return <EmptyState title={t("decia.execution.notDecided")} description={t("decia.execution.notDecidedDesc")} />;
  const fresh = freshness(aggregate, now);
  const nextCp = aggregate.checkpoints.filter((c) => c.status === "AGENDADO").sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const b = brier(aggregate.forecasts);
  const retro = aggregate.retrospective;
  const out = aggregate.outcome;
  const assumptionText = (id: string) => aggregate.assumptions.find((a) => a.id === id)?.statement ?? id;
  return (
    <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-2">
      <div className="grid content-start gap-[var(--ws-space-4)]">
        <Block title={t("decia.execution.plan")} actions={fresh ? <FreshnessBadge value={fresh} /> : undefined}>
          {aggregate.workLinks.length ? (
            <ul className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
              {aggregate.workLinks.map((w) => <li key={w.id} className="flex flex-wrap items-center gap-2"><Tag tone="neutral">{t(`decia.workLink.${w.targetType}`)}</Tag><span className="min-w-0 flex-1">{w.label}</span><Tag tone={w.done ? "success" : "warning"}>{t(w.done ? "decia.execution.done" : "decia.execution.pending")}</Tag></li>)}
            </ul>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.execution.noPlan")}</p>}
        </Block>
        <Block title={t("decia.execution.checkpoints")}>
          {aggregate.checkpoints.length ? (
            <ul className="grid gap-2 text-[length:var(--ws-text-body-sm)]">
              {aggregate.checkpoints.map((c) => (
                <li key={c.id} className="grid gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <Tag tone={c.status === "CONCLUIDO" ? "success" : c.status === "PERDIDO" ? "danger" : "info"}>{t(`decia.checkpoint.${c.status}`)}</Tag>
                    <span className="font-semibold">{formatDay(c.dueAt, intl)}</span>
                    {c.action ? <Tag tone="neutral">{t(`decia.checkpointAction.${c.action}`)}</Tag> : null}
                    {c.confidencePctAfter != null ? <span className="text-ws-text-muted">{t("decia.execution.confidenceAfter", { pct: c.confidencePctAfter })}</span> : null}
                  </span>
                  {c.note ? <span className="text-ws-text-muted">{c.note}</span> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.execution.noCheckpoints")}</p>}
        </Block>
        <Block title={t("decia.execution.forecasts")} testId="forecasts">
          {aggregate.forecasts.length ? (
            <ul className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
              {aggregate.forecasts.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2">
                  <StatementNatureChip nature="PREVISAO" />
                  <span className="min-w-0 flex-1">{f.statement}</span>
                  <span className="font-[family-name:var(--ws-font-mono)] tabular-nums text-ws-text-muted">{f.probabilityPct} %</span>
                  <Tag tone={f.resolution === "OCORREU" ? "success" : f.resolution === "NAO_OCORREU" ? "danger" : "neutral"}>{t(`decia.forecast.${f.resolution}`)}</Tag>
                </li>
              ))}
            </ul>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.execution.noForecasts")}</p>}
          {b.n ? <p className="text-[length:var(--ws-text-body-sm)]" data-testid="brier">{t("decia.execution.brier", { value: formatScore(b.brier ?? 0, intl, 4), n: b.n })}</p> : null}
          {b.n < CALIBRATION_MIN_N ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.execution.calibrationHidden", { n: CALIBRATION_MIN_N })}</p> : null}
        </Block>
      </div>
      <div className="grid content-start gap-[var(--ws-space-4)]">
        <Block title={t("decia.execution.outcome")} testId="outcome">
          {out ? (
            <div className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
              <p className="flex flex-wrap items-center gap-2"><Tag tone={out.result === "SUCESSO" ? "success" : out.result === "PARCIAL" ? "warning" : "danger"}><span aria-hidden>◉</span>{t(`decia.outcome.${out.result}`)}</Tag><span className="text-ws-text-muted">{formatDay(out.observedAt, intl)} · {people[out.recordedByUserId]?.name}</span></p>
              <p>{out.summary}</p>
            </div>
          ) : (
            <EmptyState
              compact
              title={nextCp ? t("decia.execution.noOutcomeCheckpoint", { date: formatDay(nextCp.dueAt, intl) }) : t("decia.execution.noOutcome")}
              action={<Button variant="primary" onClick={() => setRecording(true)}>{t("decia.execution.recordOutcome")}</Button>}
            />
          )}
        </Block>
        <Block title={t("decia.execution.retrospective")} testId="retrospective">
          {retro ? (
            <div className="grid gap-3 text-[length:var(--ws-text-body-sm)]">
              <div className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-3" data-testid="quadrant">
                <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] font-bold uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t("decia.execution.quadrant")}</p>
                <p className="flex flex-wrap items-center gap-2">
                  <Tag tone={retro.processQuality === "ADEQUADA" ? "success" : retro.processQuality === "PARCIAL" ? "warning" : "danger"}>{t("decia.execution.process", { q: t(`decia.processQuality.${retro.processQuality}`) })}</Tag>
                  {out ? <Tag tone={out.result === "SUCESSO" ? "success" : out.result === "PARCIAL" ? "warning" : "danger"}>{t("decia.execution.result", { r: t(`decia.outcome.${out.result}`) })}</Tag> : null}
                </p>
                {out ? <p className="font-semibold">{t(`decia.quadrant.${retro.processQuality === "INADEQUADA" ? "bad" : "good"}.${out.result === "SUCESSO" ? "good" : out.result === "PARCIAL" ? "partial" : "bad"}`)}</p> : null}
              </div>
              <Dl items={[
                [t("decia.retro.whatHappened"), retro.whatHappened],
                [t("decia.retro.whatExpected"), retro.whatExpected],
                [t("decia.retro.whatWasRight"), retro.whatWasRight],
                [t("decia.retro.whatWasWrong"), retro.whatWasWrong],
                [t("decia.retro.failedAssumptions"), retro.failedAssumptionIds.length ? retro.failedAssumptionIds.map(assumptionText).join(" · ") : "—"],
              ]} />
              <div className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border p-3">
                <p className="font-semibold">{t("decia.retro.lessons")}{retro.shareAsLesson ? <Tag tone="info" className="ml-2">{t("decia.retro.shared")}</Tag> : null}</p>
                <p>{retro.lessonsMd}</p>
              </div>
            </div>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{out ? t("decia.execution.retroPending") : t("decia.execution.retroAfterOutcome")}</p>}
        </Block>
      </div>
      <RecordOutcomeDialog open={recording} onOpenChange={setRecording} aggregate={aggregate} currentUserId={currentUserId} onSave={onSave} />
    </div>
  );
}
