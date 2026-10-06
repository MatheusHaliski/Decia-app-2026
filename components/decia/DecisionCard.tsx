"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { Button, Link, Tag, cn } from "@/components/ui";
import { track } from "@/lib/decia/analytics";
import type { CardMode, DecisionCardViewModel } from "@/lib/decia/view-model";
import { useI18n } from "@/lib/i18n/useI18n";
import { ConfidenceIndicator, DecisionStatusBadge, EvidenceStrengthBadge, FreshnessBadge, LevelChip, RiskBadge } from "./Badges";
import { formatDay, formatScore, useReducedMotion } from "./hooks";
import { CRITICAL_BAR, STATUS_META } from "./meta";
import { ReadinessSummary } from "./ReadinessCheck";

/** A prontidão só orienta antes da decisão; depois dela o card mostra resultado/frescor. */
const PRE_DECISION = ["RASCUNHO", "ENQUADRAMENTO", "PESQUISA", "COMPARACAO", "AGUARDANDO_DECISAO", "REABERTA"];

/* ------------------------------------------------------------------------------------------------
 * Partes da frente
 * ------------------------------------------------------------------------------------------------ */
function OptionLine({ vm }: { vm: DecisionCardViewModel }) {
  const { t, intl } = useI18n();
  if (vm.selectedAlternative) {
    return (
      <p className="text-[length:var(--ws-text-body-sm)]" data-testid="option-line">
        <span className="text-ws-text-muted">{t("decia.card.chosen")}:</span>{" "}
        <span className="font-semibold">{vm.selectedAlternative.label} — {vm.selectedAlternative.title}</span>
      </p>
    );
  }
  if (vm.leadingAlternative) {
    return (
      <p className="text-[length:var(--ws-text-body-sm)]" data-testid="option-line">
        <span className="text-ws-text-muted">{t("decia.card.leading")}:</span>{" "}
        <span className="font-semibold">{vm.leadingAlternative.label} — {vm.leadingAlternative.title}</span>{" "}
        <span className="tabular-nums font-semibold text-ws-accent-ink">{formatScore(vm.leadingAlternative.score, intl)}</span>
      </p>
    );
  }
  return <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="option-line">{vm.technicalTie ? t("decia.card.tie") : t("decia.card.noOption")}</p>;
}

function OwnerDeadline({ vm, className }: { vm: DecisionCardViewModel; className?: string }) {
  const { t, intl } = useI18n();
  let deadline = t("decia.card.noDeadline");
  if (vm.deadline && vm.daysToDeadline !== null) {
    const date = formatDay(vm.deadline, intl);
    deadline = vm.daysToDeadline > 0 ? t("decia.card.deadlineIn", { date, days: vm.daysToDeadline }) : vm.daysToDeadline === 0 ? t("decia.card.deadlineToday", { date }) : t("decia.card.deadlineAgo", { date, days: -vm.daysToDeadline });
  }
  return (
    <p className={cn("text-[length:var(--ws-text-caption)] text-ws-text-muted", className)}>
      <span className="font-semibold text-ws-text">{vm.owner?.name ?? t("decia.card.noOwner")}</span> · {deadline}
    </p>
  );
}

/** Estados transversais (04 §5): atrasada, risco crítico, revisão vencida, confiança acima da evidência — sempre em texto. */
function CrossStates({ vm }: { vm: DecisionCardViewModel }) {
  const { t } = useI18n();
  const items: ReactNode[] = [];
  if (vm.criticalRisk) items.push(<Tag key="crit" tone="danger" filled><span aria-hidden>▲</span>{t("decia.card.criticalRisk")}</Tag>);
  if (vm.overdue) items.push(<Tag key="late" tone="danger"><span aria-hidden>⏰</span>{t("decia.card.overdue")}</Tag>);
  if (vm.freshness === "VENCIDA") items.push(<Tag key="stale" tone="danger"><span aria-hidden>⏰</span>{t("decia.card.reviewOverdue")}</Tag>);
  if (vm.overconfident) items.push(<Tag key="over" tone="warning"><span aria-hidden>⚠</span>{t("decia.card.overconfident")}</Tag>);
  return items.length ? <div className="flex flex-wrap gap-1.5">{items}</div> : null;
}

function QuestionHeading({ vm, href, lines, headingRef, id, size = "md" }: { vm: DecisionCardViewModel; href?: string; lines: 1 | 3; headingRef?: Ref<HTMLHeadingElement>; id?: string; size?: "md" | "lg" }) {
  const cls = cn(
    "font-[family-name:var(--ws-font-display)] font-semibold text-ws-text [overflow-wrap:break-word] [hyphens:auto]",
    size === "lg" ? "text-[length:var(--ws-text-h2)] leading-[var(--ws-text-h2--lh)]" : "text-[length:var(--ws-text-h3)] leading-[var(--ws-text-h3--lh)]",
    lines === 1 ? "truncate" : "line-clamp-3",
  );
  return (
    <h3 ref={headingRef} id={id} tabIndex={-1} className={cn(cls, "focus-visible:outline-none")} title={lines === 1 ? vm.question : undefined}>
      {href ? (
        // link "esticado": tocar em qualquer ponto do card abre o workspace (mobile, 04 §7)
        <Link href={href} variant="plain" className="after:absolute after:inset-0 after:content-[''] hover:underline">{vm.question}</Link>
      ) : vm.question}
    </h3>
  );
}

/** Frente: O QUÊ / ESTADO / SINAL — pergunta + no máximo 5 sinais (04 §4.1). */
export function DecisionCardFront({ vm, mode, href, headingRef, headingId }: { vm: DecisionCardViewModel; mode: CardMode; href?: string; headingRef?: Ref<HTMLHeadingElement>; headingId?: string }) {
  const { t } = useI18n();
  const detail = mode === "DETAIL" || mode === "HERO";
  return (
    <div className="grid content-start gap-[var(--ws-space-3)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DecisionStatusBadge status={vm.status} />
        <ConfidenceIndicator value={vm.confidence} showPct={detail} className="relative z-[2]" />
      </div>
      <QuestionHeading vm={vm} href={href} lines={3} headingRef={headingRef} id={headingId} size={mode === "HERO" ? "lg" : "md"} />
      <OptionLine vm={vm} />
      <OwnerDeadline vm={vm} />
      <div className="flex flex-wrap gap-1.5">
        <RiskBadge level={vm.risk} />
        <LevelChip kind="impact" level={vm.impact} />
        <EvidenceStrengthBadge level={vm.evidenceStrength.level} none={vm.evidenceStrength.reason === "SEM_EVIDENCIA"} />
        {vm.freshness && vm.freshness !== "FRESCA" && vm.freshness !== "VENCIDA" ? <FreshnessBadge value={vm.freshness} /> : null}
        {vm.outcome ? <Tag tone="neutral"><span aria-hidden>◉</span>{t("decia.card.outcome", { result: t(`decia.outcome.${vm.outcome}`) })}</Tag> : null}
      </div>
      <CrossStates vm={vm} />
      {PRE_DECISION.includes(vm.status) ? <ReadinessSummary readiness={vm.readiness} /> : null}
      {mode === "HERO" ? (
        <div className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]">
          <p><span className="font-semibold">{t("decia.card.nextLabel")}:</span> {t(vm.nextAction.key, vm.nextAction.vars)}</p>
          {vm.stakeholders.length ? <p className="text-ws-text-muted"><span className="font-semibold text-ws-text">{t("decia.card.stakeholders")}:</span> {vm.stakeholders.join(" · ")}</p> : null}
          {vm.recommendation?.label ? <p className="text-ws-text-muted"><span className="font-semibold text-ws-text">{t("decia.card.recommendation")}:</span> {vm.recommendation.label}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Verso — mapa de lógica resumido (04 §4.2)
 * ------------------------------------------------------------------------------------------------ */
const NODE: Record<string, string> = {
  evidence: "bg-ws-decision-node-evidence", assumption: "bg-ws-decision-node-assumption", criteria: "bg-ws-decision-node-criteria", tradeoff: "bg-ws-decision-node-tradeoff",
  risk: "bg-ws-decision-node-risk", rejected: "bg-ws-decision-node-rejected", sensitive: "bg-ws-warning", checkpoint: "bg-ws-info",
};

function LogicNode({ kind, label, children }: { kind: keyof typeof NODE; label: string; children: ReactNode }) {
  return (
    <li className="relative grid grid-cols-[auto_6.5rem_1fr] items-start gap-2 pl-1 text-[length:var(--ws-text-body-sm)]">
      <span aria-hidden className={cn("relative z-[1] mt-1.5 size-2.5 rounded-full ring-2 ring-ws-surface-1", NODE[kind])} />
      <span className="font-semibold text-ws-text-muted">{label}</span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </li>
  );
}

export function DecisionCardBack({ vm, headingRef, headingId }: { vm: DecisionCardViewModel; headingRef?: Ref<HTMLHeadingElement>; headingId?: string }) {
  const { t, intl } = useI18n();
  const b = vm.back;
  const dash = <span className="text-ws-text-muted">{t("decia.card.none")}</span>;
  return (
    <div className="grid content-start gap-[var(--ws-space-3)]">
      <h3 ref={headingRef} id={headingId} tabIndex={-1} className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] font-bold uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted focus-visible:outline-none">
        {t("decia.card.backTitle")}
      </h3>
      {b ? (
        <ul className="relative grid gap-2 before:absolute before:bottom-2 before:left-[0.6rem] before:top-2 before:w-px before:bg-ws-border" aria-label={t("decia.card.backTitle")}>
          <LogicNode kind="evidence" label={t("decia.card.node.evidence")}>
            {b.topEvidence.length ? b.topEvidence.map((e) => <span key={e.id} className="block">{e.title} <span className="text-ws-text-muted">({t(`decia.stance.${e.stance}`)}, {t(`decia.rel.${e.reliability}`)})</span></span>) : dash}
          </LogicNode>
          <LogicNode kind="assumption" label={t("decia.card.node.assumption")}>
            {b.topAssumptions.length ? b.topAssumptions.map((a) => <span key={a.id} className="block">{a.statement}{a.confidencePct !== null ? <span className="whitespace-nowrap text-ws-text-muted"> · {a.confidencePct} %</span> : null}</span>) : dash}
          </LogicNode>
          <LogicNode kind="criteria" label={t("decia.card.node.criteria")}>
            {b.keyCriteria.length ? b.keyCriteria.map((c) => (c.weightPct !== null ? `${c.name} ${c.weightPct} %` : c.name)).join(" · ") : dash}
          </LogicNode>
          <LogicNode kind="tradeoff" label={t("decia.card.node.tradeoff")}>
            {b.mainTradeOff && (b.mainTradeOff.pro || b.mainTradeOff.con) ? (
              <>
                {b.mainTradeOff.pro ? <span className="text-ws-success-ink">+ {b.mainTradeOff.pro}</span> : null}
                {b.mainTradeOff.pro && b.mainTradeOff.con ? "  " : null}
                {b.mainTradeOff.con ? <span className="text-ws-danger-ink">− {b.mainTradeOff.con}</span> : null}
              </>
            ) : dash}
          </LogicNode>
          <LogicNode kind="risk" label={t("decia.card.node.risk")}>
            {b.principalRisk ? <>{b.principalRisk.title} <span className="text-ws-text-muted">({t(`decia.likelihood.${b.principalRisk.likelihood}`)} × {t(`decia.level.${b.principalRisk.impact}`)})</span></> : dash}
          </LogicNode>
          <LogicNode kind="rejected" label={t("decia.card.node.rejected")}>
            {b.rejectedAlternative ? <>{b.rejectedAlternative.label} — {b.rejectedAlternative.title}{b.rejectedAlternative.dominatedBy ? <span className="text-ws-text-muted"> ({t("decia.card.dominatedBy", { alt: b.rejectedAlternative.dominatedBy })})</span> : null}</> : dash}
          </LogicNode>
          <LogicNode kind="sensitive" label={t("decia.card.node.sensitive")}>
            {b.sensitivity ? t("decia.card.sensitivityText", { criterion: b.sensitivity.criterionName, from: b.sensitivity.fromPct, to: b.sensitivity.toPct, alt: b.sensitivity.newLeaderLabel }) : dash}
          </LogicNode>
          <LogicNode kind="checkpoint" label={t("decia.card.node.checkpoint")}>
            {b.nextCheckpoint ? formatDay(b.nextCheckpoint, intl) : dash}
          </LogicNode>
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Card
 * ------------------------------------------------------------------------------------------------ */
export interface DecisionCardProps {
  vm: DecisionCardViewModel;
  mode?: CardMode;
  /** rota do workspace (o card inteiro vira link) */
  href?: string;
  /** STANDARD: "Por quê?" abre o DETAIL (folha) — não há flip em grade */
  onOpenDetails?: () => void;
  /** começa virado (capturas/testes) */
  defaultFlipped?: boolean;
  className?: string;
}

function CompactCard({ vm, href, className }: DecisionCardProps) {
  const { t } = useI18n();
  return (
    <article className={cn("relative grid grid-cols-[minmax(0,1fr)] gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)] sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3", STATUS_META[vm.status].faded && "opacity-80", className)} data-mode="COMPACT" data-status={vm.status}>
      <DecisionStatusBadge status={vm.status} className="w-fit" />
      <div className="min-w-0">
        <QuestionHeading vm={vm} href={href} lines={1} />
        <p className="truncate text-[length:var(--ws-text-caption)] text-ws-text-muted">
          {vm.selectedAlternative ? `${t("decia.card.chosen")}: ${vm.selectedAlternative.label} — ${vm.selectedAlternative.title}` : vm.leadingAlternative ? `${t("decia.card.leading")}: ${vm.leadingAlternative.label} — ${vm.leadingAlternative.title}` : t("decia.card.noOption")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        {vm.criticalRisk ? <Tag tone="danger" filled><span aria-hidden>▲</span>{t("decia.card.criticalRisk")}</Tag> : null}
        {vm.overdue ? <Tag tone="danger"><span aria-hidden>⏰</span>{t("decia.card.overdue")}</Tag> : null}
        <OwnerDeadline vm={vm} className="sm:text-right" />
      </div>
    </article>
  );
}

/**
 * Decision Card (04 §6): COMPACT · STANDARD · DETAIL · HERO. Flip só em DETAIL/HERO (04 §7): botão explícito com
 * aria-pressed/aria-controls, Enter/Espaço e atalho F com o card focado, as duas faces no DOM (a oculta com inert +
 * aria-hidden), foco no título da face nova, anúncio aria-live, altura fixa (faces sobrepostas) e 3D de 320 ms só sem
 * redução de movimento. Nunca só hover.
 */
export function DecisionCard(props: DecisionCardProps) {
  const { vm, mode = "STANDARD", href, onOpenDetails, defaultFlipped = false, className } = props;
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [flipped, setFlipped] = useState(defaultFlipped);
  const [announce, setAnnounce] = useState("");
  const toggled = useRef(false);
  const frontRef = useRef<HTMLHeadingElement>(null);
  const backRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();
  const facesId = `${uid}-faces`;
  const frontHeadingId = `${uid}-front-title`;
  const flippable = mode === "DETAIL" || mode === "HERO";

  useEffect(() => {
    if (!toggled.current) return;
    (flipped ? backRef : frontRef).current?.focus();
  }, [flipped]);

  if (mode === "COMPACT") return <CompactCard {...props} />;

  const meta = STATUS_META[vm.status];
  const toggle = () => {
    const next = !flipped;
    toggled.current = true;
    setFlipped(next);
    setAnnounce(t(next ? "decia.card.announceBack" : "decia.card.announceFront"));
    track("card_flipped", { decisionId: vm.decisionId, to: next ? "back" : "front", mode });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!flippable || e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <article
      className={cn(
        "relative grid grid-rows-[auto_1fr] overflow-hidden rounded-[var(--ws-decision-card-radius)] border bg-ws-surface-1 text-ws-text shadow-ws-1",
        meta.dashed ? "border-dashed border-ws-border-strong" : "border-ws-border",
        meta.faded && "opacity-80",
        flippable && "focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]",
        className,
      )}
      data-mode={mode}
      data-status={vm.status}
      data-critical={vm.criticalRisk || undefined}
      tabIndex={flippable ? 0 : undefined}
      aria-labelledby={frontHeadingId}
      aria-keyshortcuts={flippable ? "F" : undefined}
      onKeyDown={onKeyDown}
    >
      <span aria-hidden className={cn("block h-[var(--ws-decision-status-bar)]", vm.criticalRisk ? CRITICAL_BAR : meta.bar)} />
      <div className="grid grid-rows-[1fr_auto_auto] gap-[var(--ws-space-3)] p-[var(--ws-decision-card-pad)]">
        {flippable ? (
          <div className="ws-decision-flip" data-motion={reduced ? "reduced" : "3d"} data-flipped={flipped}>
            <div className="ws-decision-flip__inner" id={facesId}>
              <section className="ws-decision-face ws-decision-face--front bg-ws-surface-1" inert={flipped} aria-hidden={flipped} data-face="front">
                <DecisionCardFront vm={vm} mode={mode} href={href} headingRef={frontRef} headingId={frontHeadingId} />
              </section>
              <section className="ws-decision-face ws-decision-face--back bg-ws-surface-1" inert={!flipped} aria-hidden={!flipped} data-face="back">
                <DecisionCardBack vm={vm} headingRef={backRef} />
              </section>
            </div>
          </div>
        ) : (
          <DecisionCardFront vm={vm} mode={mode} href={href} headingId={frontHeadingId} />
        )}
        <div className="relative z-[2] flex flex-wrap items-center justify-end gap-2 border-t border-ws-border pt-[var(--ws-space-3)]">
          {flippable ? (
            <>
              <span className="mr-auto text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.card.flipHint")}</span>
              {href && flipped ? <Button size="sm" variant="ghost" href={href}>{t("decia.card.openWorkspace")} →</Button> : null}
              <Button size="sm" variant="default" aria-pressed={flipped} aria-controls={facesId} onClick={toggle} data-testid="flip">
                {flipped ? t("decia.card.front") : t("decia.card.why")} <span aria-hidden>↻</span>
              </Button>
            </>
          ) : (
            <>
              {href ? <Button size="sm" variant="ghost" href={href} className="mr-auto">{t("decia.card.open")}</Button> : null}
              {onOpenDetails ? <Button size="sm" variant="default" onClick={onOpenDetails}>{t("decia.card.why")}</Button> : null}
            </>
          )}
        </div>
        {flippable ? <p aria-live="polite" className="sr-only" data-testid="flip-live">{announce}</p> : null}
      </div>
    </article>
  );
}
