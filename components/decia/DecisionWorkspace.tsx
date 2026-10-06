"use client";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Select, cn } from "@/components/ui";
import { readiness } from "@/lib/decia/rules";
import { STAGE_SECTION, STAGES, stageStates, WORKSPACE_SECTIONS, type StageState, type WorkspaceSection } from "@/lib/decia/stages";
import type { DecisionAggregate, PeopleDirectory } from "@/lib/decia/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { DecisionStatusBadge } from "./Badges";
import { ChallengeDialog, DecideDialog } from "./Dialogs";
import { formatDay } from "./hooks";
import { ReadinessSummary } from "./ReadinessCheck";
import { CompareSection, DecisionSection, EvidenceSection, ExecutionSection, OverviewSection, RisksSection, type SectionProps } from "./WorkspaceSections";

export interface DecisionWorkspaceProps {
  aggregate: DecisionAggregate;
  now: Date;
  currentUserId: string;
  people: PeopleDirectory;
  onSave: (next: DecisionAggregate) => void;
  initialSection?: WorkspaceSection;
  /** avisado a cada troca de seção (a página espelha em ?secao=) */
  onSectionChange?: (s: WorkspaceSection) => void;
  /** abre já com o diálogo de decisão (capturas) */
  initialDecideOpen?: boolean;
  /** card da visão geral começa virado (capturas) */
  flipped?: boolean;
  backHref?: string;
}

const STAGE_ICON: Record<StageState, string> = { done: "✓", attention: "!", empty: "" };
const STAGE_CLASS: Record<StageState, string> = {
  done: "border-ws-success bg-ws-success-soft text-ws-success-ink",
  attention: "border-ws-warning bg-ws-warning-soft text-ws-warning-ink",
  empty: "border-ws-border bg-ws-surface-1 text-ws-text-muted",
};

/** "salvo há X s" (05 §5 visibilidade do estado). */
function SavedAgo({ at, now }: { at: string; now: Date }) {
  const { t } = useI18n();
  const s = Math.max(0, Math.round((now.getTime() - Date.parse(at)) / 1000));
  const text = s < 5 ? t("decia.ws.savedNow") : s < 60 ? t("decia.ws.savedSeconds", { n: s }) : s < 3600 ? t("decia.ws.savedMinutes", { n: Math.round(s / 60) }) : s < 86400 ? t("decia.ws.savedHours", { n: Math.round(s / 3600) }) : t("decia.ws.savedDays", { n: Math.round(s / 86400) });
  return <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted" role="status" data-testid="saved">{text}</span>;
}

/**
 * Decision Workspace (05 §3) — não é modal: cabeçalho (pergunta, estado, responsável, prazo, prontidão, Desafiar,
 * Decidir, "salvo"), trilha dos 9 estágios e 6 seções (rail à esquerda no desktop; seletor no celular).
 */
export function DecisionWorkspace({ aggregate, now, currentUserId, people, onSave, initialSection = "visao-geral", onSectionChange, initialDecideOpen, flipped, backHref }: DecisionWorkspaceProps) {
  const { t, intl } = useI18n();
  const [section, setSection] = useState<WorkspaceSection>(initialSection);
  const [deciding, setDeciding] = useState(!!initialDecideOpen);
  const [challenging, setChallenging] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const d = aggregate.decision;
  const stages = stageStates(aggregate, now);
  const r = readiness(aggregate);
  const isOwner = d.ownerUserId === currentUserId;
  const preDecision = ["RASCUNHO", "ENQUADRAMENTO", "PESQUISA", "COMPARACAO", "AGUARDANDO_DECISAO", "REABERTA"].includes(d.status);

  useEffect(() => setSection(initialSection), [initialSection]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    headingRef.current?.focus();
  }, [section]);

  const go = (s: WorkspaceSection) => {
    setSection(s);
    onSectionChange?.(s);
  };
  const sectionProps: SectionProps = { aggregate, now, currentUserId, people, onSave, isOwner, onDecide: () => setDeciding(true), defaultFlipped: flipped };
  const deadline = d.targetDate ? formatDay(d.targetDate, intl) : t("decia.card.noDeadline");

  return (
    <div className="grid gap-[var(--ws-space-4)]" data-testid="workspace">
      <header className="grid gap-[var(--ws-space-3)] rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-4)] shadow-ws-1">
        <div className="flex flex-wrap items-center gap-2">
          {backHref ? <Button size="sm" variant="ghost" href={backHref}>← {t("decia.ws.back")}</Button> : null}
          <DecisionStatusBadge status={d.status} />
          <Badge tone="neutral">{t(`decia.complexity.${d.complexity}`)}</Badge>
          <Badge tone="neutral" title={t("decia.demoHint")}>{t("decia.demo")}</Badge>
          <span className="ml-auto"><SavedAgo at={d.updatedAt} now={now} /></span>
        </div>
        <h1 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h1)] font-semibold leading-[var(--ws-text-h1--lh)] [overflow-wrap:break-word]">{d.question}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[length:var(--ws-text-body-sm)]">
          <span><span className="text-ws-text-muted">{t("decia.ws.owner")}:</span> <span className="font-semibold">{d.ownerUserId ? people[d.ownerUserId]?.name ?? d.ownerUserId : t("decia.card.noOwner")}</span></span>
          <span><span className="text-ws-text-muted">{t("decia.ws.deadline")}:</span> <span className="font-semibold">{deadline}</span></span>
          {preDecision ? <ReadinessSummary readiness={r} /> : null}
          <span className="flex flex-1 flex-wrap justify-end gap-2">
            <Button size="sm" variant="spark" onClick={() => setChallenging(true)} data-testid="challenge">✦ {t("decia.ws.challenge")}</Button>
            {preDecision ? <Button size="sm" variant="primary" onClick={() => setDeciding(true)} disabled={!isOwner} title={!isOwner ? t("decia.ws.onlyOwner") : undefined} data-testid="decide">{t("decia.ws.decide")}</Button> : null}
          </span>
        </div>
        {!isOwner && preDecision ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.ws.onlyOwner")}</p> : null}
        <nav aria-label={t("decia.ws.stagesLabel")}>
          <ol className="flex flex-wrap items-center gap-1" data-testid="stages">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => go(STAGE_SECTION[s])}
                  className="gap-1.5 px-1.5"
                  aria-label={`${i + 1}. ${t(`decia.stage.${s}`)} — ${t(`decia.stageState.${stages[s]}`)}`}
                  data-state={stages[s]}
                >
                  <span aria-hidden className={cn("flex size-5 items-center justify-center rounded-full border text-[11px] font-bold", STAGE_CLASS[stages[s]])}>{STAGE_ICON[stages[s]] || i + 1}</span>
                  <span className="text-[length:var(--ws-text-caption)]">{t(`decia.stage.${s}`)}</span>
                </Button>
                {i < STAGES.length - 1 ? <span aria-hidden className="text-ws-text-faint">→</span> : null}
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="lg:hidden">
          <Select aria-label={t("decia.ws.sectionsLabel")} value={section} onChange={(e) => go(e.target.value as WorkspaceSection)} options={WORKSPACE_SECTIONS.map((s) => ({ value: s, label: t(`decia.ws.section.${s}`) }))} />
        </div>
        <nav aria-label={t("decia.ws.sectionsLabel")} className="hidden lg:block">
          <ul className="sticky top-[calc(var(--ws-shell-header)+var(--ws-space-4))] grid gap-1">
            {WORKSPACE_SECTIONS.map((s) => (
              <li key={s}>
                <Button
                  variant="ghost"
                  onClick={() => go(s)}
                  aria-current={section === s ? "true" : undefined}
                  className={cn("w-full justify-start rounded-[var(--ws-radius-md)] text-left", section === s && "bg-ws-accent-soft text-ws-accent-ink [box-shadow:inset_3px_0_0_var(--ws-accent)]")}
                  data-testid={`section-${s}`}
                >
                  {t(`decia.ws.section.${s}`)}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
        <section aria-labelledby="ws-section-title" className="grid min-w-0 content-start gap-[var(--ws-space-3)]">
          <h2 id="ws-section-title" ref={headingRef} tabIndex={-1} className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold focus-visible:outline-none">{t(`decia.ws.section.${section}`)}</h2>
          {section === "visao-geral" ? <OverviewSection {...sectionProps} /> : null}
          {section === "evidencias" ? <EvidenceSection {...sectionProps} /> : null}
          {section === "comparar" ? <CompareSection {...sectionProps} /> : null}
          {section === "riscos" ? <RisksSection {...sectionProps} /> : null}
          {section === "decisao" ? <DecisionSection {...sectionProps} /> : null}
          {section === "execucao" ? <ExecutionSection {...sectionProps} /> : null}
        </section>
      </div>

      <DecideDialog open={deciding} onOpenChange={setDeciding} aggregate={aggregate} currentUserId={currentUserId} onSave={onSave} onDecided={() => go("decisao")} />
      <ChallengeDialog open={challenging} onOpenChange={setChallenging} decisionId={d.id} />
    </div>
  );
}
