"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, EmptyState, Field, RadioCards, Select, Sheet, Tag, Textarea, cn } from "@/components/ui";
import { track } from "@/lib/decia/analytics";
import { DECISION_TEMPLATES } from "@/lib/decia/commands";
import { DEMO_PROJECTS } from "@/lib/decia/fixtures";
import type { DecisionRepository } from "@/lib/decia/repository";
import { suggestComplexity } from "@/lib/decia/rules";
import { DECISION_KIND, DECISION_LEVEL, DECISION_LIFECYCLE, type DecisionAggregate, type DecisionComplexity, type DecisionLevel, type PeopleDirectory } from "@/lib/decia/types";
import { toDecisionCardViewModel, type DecisionCardViewModel } from "@/lib/decia/view-model";
import { useI18n } from "@/lib/i18n/useI18n";
import { DecisionCard } from "./DecisionCard";
import { formatDay, useMediaQuery } from "./hooks";

export const workspaceHref = (id: string) => `/decia/decisoes/${id}`;

interface ViewProps {
  decisions: readonly DecisionAggregate[];
  now: Date;
  people: PeopleDirectory;
  currentUserId: string;
}

/** Folha com o card DETAIL (flip): "Por quê?" no STANDARD e detalhes longos no celular (04 §7). */
function DetailSheet({ aggregate, now, people, onClose }: { aggregate: DecisionAggregate | null; now: Date; people: PeopleDirectory; onClose: () => void }) {
  const { t } = useI18n();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const vm = aggregate ? toDecisionCardViewModel(aggregate, now, { people, includeBack: true }) : null;
  return (
    <Sheet open={!!aggregate} onOpenChange={(o) => !o && onClose()} side={desktop ? "right" : "bottom"} title={t("decia.card.detailTitle")} className={desktop ? "w-[min(92vw,30rem)]" : undefined}>
      {vm ? <DecisionCard vm={vm} mode="DETAIL" href={workspaceHref(vm.decisionId)} /> : null}
    </Sheet>
  );
}

function CardGrid({ items, now, people, mode = "STANDARD" }: { items: readonly DecisionAggregate[]; now: Date; people: PeopleDirectory; mode?: "STANDARD" | "COMPACT" }) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<DecisionAggregate | null>(null);
  const vms = items.map((a) => toDecisionCardViewModel(a, now, { people }));
  return (
    <>
      <ul className={cn("grid grid-cols-1 gap-[var(--ws-space-3)]", mode === "STANDARD" ? "sm:grid-cols-2 xl:grid-cols-3" : "")} aria-label={t("decia.list.results")}>
        {vms.map((vm, i) => (
          <li key={vm.decisionId} className="grid min-w-0 grid-cols-1">
            <DecisionCard vm={vm} mode={mode} href={workspaceHref(vm.decisionId)} onOpenDetails={mode === "STANDARD" ? () => setDetail(items[i]!) : undefined} />
          </li>
        ))}
      </ul>
      <DetailSheet aggregate={detail} now={now} people={people} onClose={() => setDetail(null)} />
    </>
  );
}

/* ================================================================================================
 * Precisa de atenção (caixa de entrada, padrão)
 * ================================================================================================ */
type InboxGroup = "awaitingMe" | "overdue" | "needsEvidence" | "reviewsDue";
const PRE = ["PESQUISA", "COMPARACAO", "AGUARDANDO_DECISAO", "REABERTA"];

export function inboxGroups(decisions: readonly DecisionAggregate[], now: Date, me: string): Record<InboxGroup, DecisionAggregate[]> {
  const out: Record<InboxGroup, DecisionAggregate[]> = { awaitingMe: [], overdue: [], needsEvidence: [], reviewsDue: [] };
  for (const a of decisions) {
    const vm = toDecisionCardViewModel(a, now);
    const d = a.decision;
    const mine = d.ownerUserId === me || a.participants.some((p) => p.userId === me && p.role === "APROVADOR");
    if (d.status === "AGUARDANDO_DECISAO" && mine) out.awaitingMe.push(a);
    else if (vm.overdue) out.overdue.push(a);
    else if (PRE.includes(d.status) && (vm.readiness.level === "PRECISA_DE_EVIDENCIA" || vm.evidenceStrength.level === "FRACA")) out.needsEvidence.push(a);
    else if (vm.freshness === "REVISAO_DEVIDA" || vm.freshness === "VENCIDA" || (d.status === "RESOLVIDA" && !a.retrospective)) out.reviewsDue.push(a);
  }
  return out;
}

export function AttentionInbox({ decisions, now, people, currentUserId, onNew }: ViewProps & { onNew: () => void }) {
  const { t } = useI18n();
  const groups = inboxGroups(decisions, now, currentUserId);
  const order: InboxGroup[] = ["awaitingMe", "overdue", "needsEvidence", "reviewsDue"];
  const total = order.reduce((s, g) => s + groups[g].length, 0);
  if (!total) {
    return <EmptyState title={t("decia.inbox.empty")} description={t("decia.inbox.emptyDesc")} action={<Button variant="primary" onClick={onNew}>{t("decia.newDecision")}</Button>} />;
  }
  const hero = groups.awaitingMe[0];
  return (
    <div className="grid gap-[var(--ws-space-6)]" data-testid="inbox">
      {order.map((g) => {
        const items = g === "awaitingMe" ? groups[g].slice(1) : groups[g];
        if (!groups[g].length) return null;
        return (
          <section key={g} aria-labelledby={`inbox-${g}`} className="grid gap-[var(--ws-space-3)]">
            <h2 id={`inbox-${g}`} className="flex items-center gap-2 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">
              {t(`decia.inbox.${g}`)} <Tag tone="neutral">{groups[g].length}</Tag>
            </h2>
            {g === "awaitingMe" && hero ? (
              <div className="max-w-3xl" data-testid="inbox-hero">
                <DecisionCard vm={toDecisionCardViewModel(hero, now, { people, includeBack: true })} mode="HERO" href={workspaceHref(hero.decision.id)} />
              </div>
            ) : null}
            {items.length ? <CardGrid items={items} now={now} people={people} /> : null}
          </section>
        );
      })}
    </div>
  );
}

/* ================================================================================================
 * Decisões (grade STANDARD / lista COMPACT + filtros)
 * ================================================================================================ */
const VIEW_KEY = "ws.decia.view";
type DeadlineFilter = "" | "overdue" | "week" | "month" | "none";
interface Filters { status: string; owner: string; project: string; risk: string; impact: string; deadline: DeadlineFilter; kind: string }
const NO_FILTERS: Filters = { status: "", owner: "", project: "", risk: "", impact: "", deadline: "", kind: "" };

export function filterDecisions(decisions: readonly DecisionAggregate[], vms: readonly DecisionCardViewModel[], f: Filters): DecisionAggregate[] {
  return decisions.filter((a, i) => {
    const vm = vms[i]!;
    const d = a.decision;
    if (f.status && d.status !== f.status) return false;
    if (f.owner && d.ownerUserId !== f.owner) return false;
    if (f.project && (f.project === "-" ? !!d.projectId : d.projectId !== f.project)) return false;
    if (f.risk && vm.risk !== f.risk) return false;
    if (f.impact && d.impact !== f.impact) return false;
    if (f.kind && d.kind !== f.kind) return false;
    if (f.deadline === "overdue" && !vm.overdue) return false;
    if (f.deadline === "week" && !(vm.daysToDeadline !== null && vm.daysToDeadline >= 0 && vm.daysToDeadline <= 7)) return false;
    if (f.deadline === "month" && !(vm.daysToDeadline !== null && vm.daysToDeadline >= 0 && vm.daysToDeadline <= 30)) return false;
    if (f.deadline === "none" && vm.deadline) return false;
    return true;
  });
}

export function DecisionsBoard({ decisions, now, people, initialView }: ViewProps & { initialView?: "grid" | "list" }) {
  const { t } = useI18n();
  const mobile = useMediaQuery("(max-width: 639px)");
  const [view, setView] = useState<"grid" | "list" | null>(initialView ?? null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  useEffect(() => {
    if (initialView) return;
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch { /* armazenamento indisponível */ }
  }, [initialView]);
  const effective = view ?? (mobile ? "list" : "grid");
  const choose = (v: "grid" | "list") => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };
  const vms = useMemo(() => decisions.map((a) => toDecisionCardViewModel(a, now)), [decisions, now]);
  const shown = filterDecisions(decisions, vms, filters);
  const all = { value: "", label: t("decia.list.all") };
  const owners = [...new Set(decisions.map((a) => a.decision.ownerUserId).filter((x): x is string => !!x))];
  const set = (k: keyof Filters) => (e: { target: { value: string } }) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const active = Object.values(filters).some(Boolean);

  return (
    <div className="grid gap-[var(--ws-space-4)]" data-testid="decisions-board">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" role="status">{t("decia.list.count", { n: shown.length })}</p>
        <div className="flex gap-1 rounded-[var(--ws-radius-pill)] bg-ws-surface-2 p-1" role="group" aria-label={t("decia.list.viewLabel")}>
          <Button size="sm" variant={effective === "grid" ? "default" : "ghost"} aria-pressed={effective === "grid"} onClick={() => choose("grid")} data-testid="view-grid">▦ {t("decia.list.grid")}</Button>
          <Button size="sm" variant={effective === "list" ? "default" : "ghost"} aria-pressed={effective === "list"} onClick={() => choose("list")} data-testid="view-list">☰ {t("decia.list.list")}</Button>
        </div>
      </div>
      <details className="group rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1" open={!mobile}>
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[var(--ws-radius-md)] p-3 text-[length:var(--ws-text-body-sm)] font-semibold marker:content-none focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]">
          {t("decia.list.filters")} {active ? <Tag tone="accent">{t("decia.list.active")}</Tag> : null}
          <span aria-hidden className="ml-auto text-ws-text-muted transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="grid gap-3 border-t border-ws-border p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Field label={t("decia.list.filter.status")}>{({ id }) => <Select id={id} value={filters.status} onChange={set("status")} options={[all, ...DECISION_LIFECYCLE.map((s) => ({ value: s, label: t(`decia.status.${s}`) }))]} />}</Field>
          <Field label={t("decia.list.filter.owner")}>{({ id }) => <Select id={id} value={filters.owner} onChange={set("owner")} options={[all, ...owners.map((o) => ({ value: o, label: people[o]?.name ?? o }))]} />}</Field>
          <Field label={t("decia.list.filter.project")}>{({ id }) => <Select id={id} value={filters.project} onChange={set("project")} options={[all, ...Object.entries(DEMO_PROJECTS).map(([k, v]) => ({ value: k, label: v.name })), { value: "-", label: t("decia.list.noProject") }]} />}</Field>
          <Field label={t("decia.list.filter.risk")}>{({ id }) => <Select id={id} value={filters.risk} onChange={set("risk")} options={[all, ...DECISION_LEVEL.map((l) => ({ value: l, label: t(`decia.level.${l}`) })), { value: "NAO_AVALIADO", label: t("decia.chip.riskNone") }]} />}</Field>
          <Field label={t("decia.list.filter.impact")}>{({ id }) => <Select id={id} value={filters.impact} onChange={set("impact")} options={[all, ...DECISION_LEVEL.map((l) => ({ value: l, label: t(`decia.level.${l}`) }))]} />}</Field>
          <Field label={t("decia.list.filter.deadline")}>{({ id }) => <Select id={id} value={filters.deadline} onChange={set("deadline")} options={[all, ...(["overdue", "week", "month", "none"] as const).map((v) => ({ value: v, label: t(`decia.list.deadline.${v}`) }))]} />}</Field>
          <Field label={t("decia.list.filter.kind")}>{({ id }) => <Select id={id} value={filters.kind} onChange={set("kind")} options={[all, ...DECISION_KIND.map((k) => ({ value: k, label: t(`decia.kind.${k}`) }))]} />}</Field>
          {active ? <div className="flex items-end"><Button size="sm" variant="ghost" onClick={() => setFilters(NO_FILTERS)}>{t("decia.list.clear")}</Button></div> : null}
        </div>
      </details>
      {shown.length ? <CardGrid items={shown} now={now} people={people} mode={effective === "grid" ? "STANDARD" : "COMPACT"} /> : <EmptyState compact title={t("decia.list.empty")} />}
    </div>
  );
}

/* ================================================================================================
 * Revisões (resultados a registrar + retrospectivas)
 * ================================================================================================ */
export function ReviewsView({ decisions, now, people }: ViewProps) {
  const { t, intl } = useI18n();
  const toRecord = decisions.filter((a) => ["DECIDIDA", "EM_EXECUCAO"].includes(a.decision.status) || (a.decision.status === "RESOLVIDA" && !a.retrospective));
  const reviewed = decisions.filter((a) => a.retrospective);
  if (!toRecord.length && !reviewed.length) return <EmptyState title={t("decia.reviews.empty")} description={t("decia.reviews.emptyDesc")} />;
  return (
    <div className="grid gap-[var(--ws-space-6)]" data-testid="reviews">
      <section className="grid gap-3" aria-labelledby="rev-pending">
        <h2 id="rev-pending" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("decia.reviews.toRecord")}</h2>
        {toRecord.length ? <CardGrid items={toRecord} now={now} people={people} mode="COMPACT" /> : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.reviews.none")}</p>}
      </section>
      <section className="grid gap-3" aria-labelledby="rev-done">
        <h2 id="rev-done" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("decia.reviews.done")}</h2>
        <ul className="grid gap-3">
          {reviewed.map((a) => (
            <li key={a.decision.id} className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-4)]">
              <Button variant="ghost" href={workspaceHref(a.decision.id)} className="w-fit whitespace-normal px-0 text-left font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)]">{a.decision.question}</Button>
              <p className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
                <Tag tone="success">{t("decia.execution.process", { q: t(`decia.processQuality.${a.retrospective!.processQuality}`) })}</Tag>
                {a.outcome ? <Tag tone={a.outcome.result === "SUCESSO" ? "success" : a.outcome.result === "PARCIAL" ? "warning" : "danger"}>{t("decia.execution.result", { r: t(`decia.outcome.${a.outcome.result}`) })}</Tag> : null}
                <span className="text-ws-text-muted">{formatDay(a.retrospective!.reviewedAt, intl)} · {people[a.retrospective!.reviewedByUserId]?.name}</span>
              </p>
              <p className="text-[length:var(--ws-text-body-sm)]">{a.retrospective!.lessonsMd}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ================================================================================================
 * Nova decisão (+ Criar → ?acao=nova)
 * ================================================================================================ */
export function NewDecisionDialog({ open, onOpenChange, repository, currentUserId, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; repository: DecisionRepository; currentUserId: string; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const [question, setQuestion] = useState("");
  const [impact, setImpact] = useState<DecisionLevel>("MEDIO");
  const [complexity, setComplexity] = useState<DecisionComplexity | null>(null);
  const [template, setTemplate] = useState("");
  const [touched, setTouched] = useState(false);
  const suggested = suggestComplexity({ impact });
  const effective = complexity ?? suggested;
  const q = question.trim();
  const valid = q.length >= 15 && q.endsWith("?");
  const create = () => {
    const agg = repository.create({ question: q, impact, complexity: effective, templateKey: template || undefined, ownerUserId: currentUserId });
    track("decision_created", { decisionId: agg.decision.id, complexity: effective, templateKey: template || undefined });
    setQuestion(""); setComplexity(null); setTemplate(""); setTouched(false);
    onCreated(agg.decision.id);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("decia.new.title")} description={t("decia.new.desc")} className="w-[min(94vw,38rem)]">
      <div className="grid gap-[var(--ws-space-4)]">
        <Field label={t("decia.new.question")} hint={t("decia.new.questionHint")} error={touched && !valid ? t("decia.new.questionError") : undefined} required>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} value={question} onChange={(e) => setQuestion(e.target.value)} onBlur={() => setTouched(true)} className="min-h-20" />}
        </Field>
        <Field label={t("decia.new.impact")}>
          {({ id }) => <Select id={id} value={impact} onChange={(e) => setImpact(e.target.value as DecisionLevel)} options={DECISION_LEVEL.map((l) => ({ value: l, label: t(`decia.level.${l}`) }))} />}
        </Field>
        <div className="grid gap-1.5">
          <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("decia.new.complexity")} <Tag tone="info" className="ml-1">{t("decia.new.suggested", { level: t(`decia.complexity.${suggested}`) })}</Tag></p>
          <RadioCards
            label={t("decia.new.complexity")}
            value={effective}
            onValueChange={(v) => setComplexity(v as DecisionComplexity)}
            options={(["RAPIDA", "PADRAO", "PROFUNDA"] as const).map((c) => ({ value: c, label: t(`decia.complexity.${c}`), hint: t(`decia.complexityHint.${c}`) }))}
          />
        </div>
        <Field label={t("decia.new.template")}>
          {({ id }) => <Select id={id} value={template} onChange={(e) => setTemplate(e.target.value)} options={[{ value: "", label: t("decia.new.noTemplate") }, ...Object.keys(DECISION_TEMPLATES).map((k) => ({ value: k, label: t(`decia.new.templates.${k}`) }))]} />}
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("decia.common.cancel")}</Button>
          <Button variant="primary" disabled={!valid} onClick={create} data-testid="create-decision">{t("decia.new.create")}</Button>
        </div>
      </div>
    </Dialog>
  );
}
