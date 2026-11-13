"use client";
/**
 * Simulador de Cenários e Riscos do projeto (RF31): monta até três cenários com alavancas (corte de orçamento, atraso de
 * fornecedor, mudança de escopo, indisponibilidade de pessoa, reajuste de preço), calcula o impacto de cada um sobre uma CÓPIA do
 * projeto (CPM, Monte Carlo com semente fixa, valor agregado, riscos, Espelho de Conformidade), compara lado a lado com a linha de
 * base, salva os cenários (DEMO) e envia o escolhido à aprovação como solicitação de mudança levada ao comitê no DECIA — sem
 * mudar o plano antes da decisão. Tudo que a "IA" diz (✦) é montado só com os números do motor (D-12).
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Dialog, Field, Input, Link, Select, Tabs, Tag, cn, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { CommandResult, ProjectCommand } from "@/lib/projects/commands";
import type { ComplianceChecklist, MirrorContext } from "@/lib/projects/compliance/types";
import { defaultChecklists } from "@/lib/projects/compliance/catalog";
import { dateToOffset, offsetToDate } from "@/lib/projects/engine/schedule";
import { approvalImpact, submitForApproval } from "@/lib/projects/simulation/approval";
import { simulateAll, type Outcome, type ScenarioResult } from "@/lib/projects/simulation/engine";
import { compareNarrative, scenarioNarrative, type NarrativeLine } from "@/lib/projects/simulation/narrative";
import { demoScenarioRepository, newScenarioId, useSavedScenarios, type SavedScenario, type ScenarioRepository } from "@/lib/projects/simulation/store";
import { DEFAULT_RUNS, DEFAULT_SEED, type Lever, type LeverKind, type Scenario, type SimulationAssumptions } from "@/lib/projects/simulation/types";
import type { ChangeImpact, ChangeRequest, ProjectModel, SevenRs } from "@/lib/projects/types";
import { fmt, nameOf, type PeopleDirectory } from "../shared";
import { CompareCharts, CompareTable } from "./CompareView";
import { ImpactReport, RiskList } from "./ImpactReport";
import { AddLeverMenu, LeverCard, newLever } from "./LeverEditor";
import { Heading, NumberField, SparkReading, fmtDays, formatVars, signed } from "./shared";

const LETTERS = ["A", "B", "C"] as const;
const MAX = 3;
const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const BODY_SM = "text-[length:var(--ws-text-body-sm)]";

interface Draft { key: string; savedId?: string; name: string; levers: Lever[] }
let draftSeq = 0;
const draftKey = () => `rascunho-${++draftSeq}`;
const fromSaved = (s: SavedScenario): Draft => ({ key: s.id, savedId: s.id, name: s.name, levers: s.levers });

export interface SimulatorViewProps {
  model: ProjectModel;
  dispatch: (cmd: ProjectCommand) => CommandResult;
  people: PeopleDirectory;
  actorId: string;
  /** projeto arquivado ou perfil sem edição: simula e salva, mas não envia à aprovação */
  readOnly: boolean;
  scenarios?: ScenarioRepository;
  /** contexto do Espelho (checklist do departamento, itens marcados e vínculos) para o cruzamento de conformidade */
  compliance?: MirrorContext;
  department?: ComplianceChecklist;
  /** ids de `?compare=a,b,c` (até 3) e os que passaram do limite */
  initialCompare?: readonly string[];
  ignoredCompare?: readonly string[];
  onCompareChange?: (savedIds: string[]) => void;
  /** ponte com o DECIA: leva a mudança ao comitê (openChangeDecision) */
  openChange: (model: ProjectModel, change: ChangeRequest) => { decisionId: string; commands: ProjectCommand[] };
  decisionHref: (decisionId: string) => string;
  source?: "DEMO" | "API";
}

export function SimulatorView(props: SimulatorViewProps) {
  const { model, dispatch, people, actorId, readOnly, compliance, department, initialCompare = [], ignoredCompare = [], onCompareChange, openChange, decisionHref } = props;
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const repo = props.scenarios ?? demoScenarioRepository();
  const saved = useSavedScenarios(model.id, repo);

  // cenários em comparação: os de ?compare=; senão os salvos do projeto (até 3); senão um rascunho vazio
  const [initial] = useState(() => {
    const found = initialCompare.map((id) => repo.get(id)).filter((s): s is SavedScenario => Boolean(s && s.projectId === model.id));
    const missing = initialCompare.filter((id) => !found.some((s) => s.id === id));
    const slots = found.length ? found.map(fromSaved) : !initialCompare.length && repo.list(model.id).length ? repo.list(model.id).slice(0, MAX).map(fromSaved) : [{ key: draftKey(), name: "", levers: [] }];
    return { slots, missing };
  });
  const [slots, setSlots] = useState<Draft[]>(initial.slots);
  const [active, setActive] = useState(initial.slots[0]!.key);
  const [targetDate, setTargetDate] = useState<string>("");
  const [runs, setRuns] = useState(DEFAULT_RUNS);
  const [overhead, setOverhead] = useState(0);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, { code: string; decisionId: string }>>({});

  const assumptions = useMemo<SimulationAssumptions>(() => ({
    targetFinish: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? dateToOffset(model.startDate, targetDate) : undefined,
    runs, seed: DEFAULT_SEED, dailyOverhead: Number.isFinite(overhead) ? Math.max(0, overhead) : 0,
  }), [targetDate, runs, overhead, model.startDate]);
  const deferredSlots = useDeferredValue(slots);
  const deferredAssumptions = useDeferredValue(assumptions);
  const nameFor = (d: Draft, i: number) => d.name.trim() || t("sim.slot.unnamed", { letter: LETTERS[i] ?? String(i + 1) });
  const toScenario = (d: Draft, i: number): Scenario => ({ id: d.savedId ?? d.key, name: nameFor(d, i), levers: d.levers });
  // recalcula quando muda o projeto, um rascunho, uma premissa, o Espelho ou o idioma (nome padrão do cenário)
  const sim = useMemo(() => simulateAll(model, deferredSlots.map(toScenario), deferredAssumptions, compliance), [model, deferredSlots, deferredAssumptions, compliance, t]);
  const resultOf = (key: string) => sim.results[deferredSlots.findIndex((d) => d.key === key)];

  // ?compare= acompanha os cenários salvos em comparação
  const reported = useRef(initialCompare.join(","));
  useEffect(() => {
    const ids = slots.map((s) => s.savedId).filter((x): x is string => Boolean(x));
    const joined = ids.join(",");
    if (joined !== reported.current) {
      reported.current = joined;
      onCompareChange?.(ids);
    }
  }, [slots, onCompareChange]);

  const items = useMemo(() => new Map((compliance?.checklists ?? defaultChecklists(department)).flatMap((c) => c.items).map((i) => [i.id, i])), [compliance, department]);
  const itemTitle = (id: string) => {
    const it = items.get(id);
    return it ? `${it.code} · ${it.titleKey ? t(it.titleKey) : (it.title ?? id)}` : id;
  };

  const update = (key: string, patch: Partial<Draft>) => setSlots((all) => all.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const addSlot = () => {
    if (slots.length >= MAX) return;
    const d: Draft = { key: draftKey(), name: "", levers: [] };
    setSlots((all) => [...all, d]);
    setActive(d.key);
  };
  const removeSlot = (key: string) => {
    const rest = slots.filter((d) => d.key !== key);
    const next = rest.length ? rest : [{ key: draftKey(), name: "", levers: [] }];
    setSlots(next);
    if (active === key) setActive(next[0]!.key);
  };
  const compareSaved = (s: SavedScenario) => {
    const existing = slots.find((d) => d.savedId === s.id);
    if (existing) return setActive(existing.key);
    if (slots.length >= MAX) return;
    const d = fromSaved(s);
    setSlots((all) => [...all, d]);
    setActive(d.key);
  };

  const snapshotOf = (r: Outcome | undefined): SavedScenario["snapshot"] => (r ? { finish: r.schedule.finish, eac: r.cost.eac, probability: r.mc?.probability ?? null, p80: r.mc?.p80 ?? null } : undefined);
  const save = (d: Draft, i: number): string => {
    const id = d.savedId ?? newScenarioId();
    const prev = d.savedId ? repo.get(d.savedId) : undefined;
    const fresh = simulateAll(model, [toScenario(d, i)], assumptions, compliance).results[0];
    repo.save({ id, projectId: model.id, name: nameFor(d, i), levers: d.levers, savedAt: new Date().toISOString(), savedBy: actorId, projectVersion: model.version, snapshot: snapshotOf(fresh), submission: prev?.submission });
    if (d.savedId !== id) setSlots((all) => all.map((x) => (x.key === d.key ? { ...x, savedId: id } : x)));
    return id;
  };

  const submit = (d: Draft, i: number, title: string, sevenRs: SevenRs) => {
    const id = save(d, i);
    const fresh = simulateAll(model, [toScenario({ ...d, savedId: id }, i)], assumptions, compliance);
    const r = submitForApproval(dispatch, fresh.results[0]!, fresh.baseline, { title, sevenRs }, openChange);
    setSending(null);
    if (!r.ok) {
      toast({ title: t(`pm.err.${r.error}`), tone: "erro" });
      return;
    }
    const prev = repo.get(id);
    if (prev) repo.save({ ...prev, submission: { changeId: r.changeId, changeCode: r.changeCode, decisionId: r.decisionId, at: new Date().toISOString(), by: actorId } });
    setSent((s) => ({ ...s, [d.key]: { code: r.changeCode, decisionId: r.decisionId } }));
    toast({ title: t("sim.send.done", { code: r.changeCode }), description: t("pm.ws.openedInDecia"), tone: "sucesso" });
  };

  const narrative = (lines: readonly NarrativeLine[]) => lines.map((l) => t(`sim.ai.${l.key}`, formatVars(t, intl, l.vars, people)));
  const compareLines = narrative(compareNarrative(sim.results));
  const b = sim.baseline;
  const defaultTarget = b.mc ? b.mc.targetDate : offsetToDate(model.startDate, b.schedule.finish);
  const days = (v: number) => t("pm.ui.daysShort", { n: fmtDays(intl, v) });
  const sendingIdx = sending ? slots.findIndex((d) => d.key === sending) : -1;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-5)]" data-simulator={model.id}>
      {initial.missing.length || ignoredCompare.length ? (
        <div role="status" className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)]">
          {initial.missing.length ? <p>{t("sim.compare.missing", { ids: initial.missing.join(", ") })}</p> : null}
          {ignoredCompare.length ? <p>{t("sim.compare.ignored", { ids: ignoredCompare.join(", ") })}</p> : null}
        </div>
      ) : null}

      {/* linha de base e premissas comuns */}
      <Card as="section" aria-labelledby="sim-base" className="grid gap-[var(--ws-space-3)]">
        <Heading id="sim-base">{t("sim.base.title")}</Heading>
        <p className={CAPTION}>{t("sim.base.hint")}</p>
        <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" data-baseline>
          {[
            [t("sim.report.finish"), `${fmt.date(intl, b.schedule.finishDate)} · ${t("sim.report.dayN", { n: fmtDays(intl, b.schedule.finish) })}`],
            [t("sim.compare.critical"), b.schedule.critical.map((id) => model.tasks.find((x) => x.id === id)?.code ?? id).join(" → ") || "—"],
            [t("sim.report.probability", { date: b.mc ? fmt.date(intl, b.mc.targetDate) : "—" }), b.mc ? fmt.percent(intl, b.mc.probability) : "—"],
            [t("sim.report.p50p80"), b.mc ? `${days(b.mc.p50)} · ${days(b.mc.p80)}` : "—"],
            [t("sim.report.eac"), fmt.money(intl, b.cost.eac)],
            [t("sim.report.reserve"), `${fmt.money(intl, b.cost.reserveUsed)} · ${fmt.percent(intl, b.cost.reserveUsedPct)}`],
          ].map(([k, v]) => (
            <div key={k} className="grid content-start gap-0.5 rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2">
              <dt className={CAPTION}>{k}</dt>
              <dd className="font-semibold [overflow-wrap:anywhere]">{v}</dd>
            </div>
          ))}
        </dl>
        {b.risks.length ? (
          <div className="grid gap-1">
            <p className={cn(BODY_SM, "font-semibold")}>{t("sim.base.risks")}</p>
            <RiskList risks={b.risks.map((r) => ({ ...r, isNew: false }))} people={people} />
          </div>
        ) : null}
        <fieldset className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-border p-[var(--ws-space-3)] sm:grid-cols-3">
          <legend className="px-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t("sim.assume.title")}</legend>
          <Field label={t("sim.assume.target")} hint={t("sim.assume.targetHint", { date: fmt.date(intl, defaultTarget) })}>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="date" value={targetDate || defaultTarget} onChange={(e) => setTargetDate(e.target.value)} />}
          </Field>
          <Field label={t("sim.assume.runs")} hint={t("sim.assume.seed", { seed: DEFAULT_SEED })}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={String(runs)} onChange={(e) => setRuns(Number(e.target.value))}
                options={[500, 2000, 5000].map((n) => ({ value: String(n), label: fmt.number(intl, n, 0) }))} />
            )}
          </Field>
          <NumberField label={t("sim.assume.overhead")} value={overhead} onChange={setOverhead} suffix={t("sim.unit.perDay")} hint={t("sim.assume.overheadHint")} />
        </fieldset>
      </Card>

      {/* cenários */}
      <section aria-labelledby="sim-scenarios" className="grid gap-[var(--ws-space-3)]">
        <Heading id="sim-scenarios" actions={<Button size="sm" variant="primary" onClick={addSlot} disabled={slots.length >= MAX}>{t("sim.slot.new")}</Button>}>
          {t("sim.slot.title", { n: slots.length, max: MAX })}
        </Heading>
        {slots.length >= MAX ? <p className={CAPTION}>{t("sim.slot.full")}</p> : null}
        <Tabs
          label={t("sim.slot.tabs")}
          param={null}
          value={active}
          onChange={setActive}
          tabs={slots.map((d, i) => ({ slug: d.key, label: `${LETTERS[i]} · ${nameFor(d, i)}` }))}
        >
          {(key) => {
            const i = slots.findIndex((d) => d.key === key);
            const d = slots[i];
            if (!d) return null;
            const r = resultOf(key);
            const savedOne = d.savedId ? saved.find((s) => s.id === d.savedId) : undefined;
            const dirty = !savedOne || savedOne.name !== nameFor(d, i) || JSON.stringify(savedOne.levers) !== JSON.stringify(d.levers);
            const submitted = sent[key] ?? (savedOne?.submission ? { code: savedOne.submission.changeCode, decisionId: savedOne.submission.decisionId } : undefined);
            return (
              <div className="grid gap-[var(--ws-space-4)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" data-slot={LETTERS[i]}>
                <div className="grid content-start gap-[var(--ws-space-3)]">
                  <Field label={t("sim.slot.name")}>
                    {({ id }) => <Input id={id} value={d.name} placeholder={t("sim.slot.namePlaceholder")} onChange={(e) => update(key, { name: e.target.value })} />}
                  </Field>
                  {d.levers.length ? (
                    <ol className="grid gap-2" aria-label={t("sim.lever.listLabel")}>
                      {d.levers.map((lever, li) => (
                        <LeverCard
                          key={li}
                          lever={lever}
                          index={li}
                          model={model}
                          people={people}
                          onChange={(next) => update(key, { levers: d.levers.map((x, j) => (j === li ? next : x)) })}
                          onRemove={() => update(key, { levers: d.levers.filter((_, j) => j !== li) })}
                        />
                      ))}
                    </ol>
                  ) : (
                    <p className={cn(BODY_SM, "rounded-[var(--ws-radius-md)] border border-dashed border-ws-border p-3 text-ws-text-muted")}>{t("sim.lever.empty")}</p>
                  )}
                  <AddLeverMenu onAdd={(kind: LeverKind) => update(key, { levers: [...d.levers, newLever(kind, model)] })} />
                  <div className="flex flex-wrap items-center gap-2 border-t border-ws-border pt-[var(--ws-space-3)]">
                    <Button size="sm" onClick={() => {
                      save(d, i);
                      toast({ title: t("sim.slot.saved", { name: nameFor(d, i) }), tone: "sucesso" });
                    }} disabled={!dirty}>{t(d.savedId ? "sim.slot.saveChanges" : "sim.slot.save")}</Button>
                    <Button size="sm" variant="spark" icon="sessao-decia" onClick={() => setSending(key)} disabled={readOnly || !r || !r.schedule.ok}>{t("sim.send.open")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeSlot(key)}>{t("sim.slot.remove")}</Button>
                    {savedOne && !dirty ? <Tag tone="success"><span aria-hidden>✓</span>{t("sim.slot.isSaved")}</Tag> : d.savedId ? <Tag tone="warning"><span aria-hidden>!</span>{t("sim.slot.unsaved")}</Tag> : null}
                  </div>
                  {readOnly ? <p className={CAPTION}>{t("sim.send.readOnly")}</p> : null}
                  {savedOne && savedOne.projectVersion !== model.version ? <p className={CAPTION}>{t("sim.slot.stale", { v: savedOne.projectVersion, now: model.version })}</p> : null}
                  {submitted ? (
                    <div role="status" className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-success bg-ws-success-soft p-2.5 text-[length:var(--ws-text-body-sm)]" data-submitted={submitted.code}>
                      <p><span aria-hidden>✓ </span>{t("sim.send.sent", { code: submitted.code })}</p>
                      <p className="flex flex-wrap gap-3">
                        <Link href={decisionHref(submitted.decisionId)}>{t("pm.ui.openInDecia")}</Link>
                        <Link href={`/projects/${model.id}/edit?aba=controle`}>{t("sim.send.seeControl")}</Link>
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="grid content-start gap-[var(--ws-space-3)]">
                  {r ? (
                    <>
                      <ImpactReport result={r} baseline={sim.baseline} model={model} people={people} itemTitle={itemTitle} mirrorHref={`/projects/${model.id}/mirror`} />
                      <SparkReading title={t("sim.ai.title")} lines={narrative(scenarioNarrative(r, sim.baseline))} testId="scenario" />
                    </>
                  ) : null}
                </div>
              </div>
            );
          }}
        </Tabs>
      </section>

      {/* comparação lado a lado */}
      <section aria-labelledby="sim-compare" className="grid gap-[var(--ws-space-3)]">
        <Heading id="sim-compare">{t("sim.compare.title")}</Heading>
        <p className={CAPTION}>{t("sim.compare.hint", { seed: DEFAULT_SEED })}</p>
        <CompareTable baseline={sim.baseline} results={sim.results} />
        <CompareCharts baseline={sim.baseline} results={sim.results} />
        {compareLines.length ? <SparkReading title={t("sim.ai.compareTitle")} lines={compareLines} testId="compare" /> : null}
      </section>

      {/* cenários salvos */}
      <section aria-labelledby="sim-saved" className="grid gap-[var(--ws-space-3)]">
        <Heading id="sim-saved">{t("sim.saved.title")}</Heading>
        <p className={CAPTION}>{t("sim.saved.hint")}</p>
        {saved.length ? (
          <ul className="grid gap-2" data-saved-list>
            {saved.map((s) => {
              const inCompare = slots.some((d) => d.savedId === s.id);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2.5" data-saved={s.id}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold [overflow-wrap:anywhere]">{s.name}</span>
                    <span className={cn(CAPTION, "block")}>
                      {t("sim.saved.meta", { n: s.levers.length, date: fmt.date(intl, s.savedAt), v: s.projectVersion, who: nameOf(people, s.savedBy) })}
                      {s.snapshot ? ` · ${t("sim.saved.snapshot", { finish: days(s.snapshot.finish), eac: fmt.money(intl, s.snapshot.eac) })}` : ""}
                    </span>
                  </span>
                  {s.submission ? <Tag tone="info">{t("sim.saved.submitted", { code: s.submission.changeCode })}</Tag> : null}
                  {inCompare ? <Tag tone="accent">{t("sim.saved.inCompare")}</Tag> : (
                    <Button size="sm" onClick={() => compareSaved(s)} disabled={slots.length >= MAX} title={slots.length >= MAX ? t("sim.slot.full") : undefined}>{t("sim.saved.compare")}</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => {
                    repo.remove(s.id);
                    setSlots((all) => all.map((d) => (d.savedId === s.id ? { ...d, savedId: undefined } : d)));
                  }} aria-label={t("sim.saved.removeLabel", { name: s.name })}>{t("pm.ui.remove")}</Button>
                </li>
              );
            })}
          </ul>
        ) : <p className={cn(BODY_SM, "text-ws-text-muted")}>{t("sim.saved.empty")}</p>}
      </section>

      {sendingIdx >= 0 && sim.results[sendingIdx] ? (
        <ApprovalDialog
          key={sending!}
          open
          onOpenChange={(o) => !o && setSending(null)}
          result={sim.results[sendingIdx]!}
          baseline={sim.baseline}
          model={model}
          people={people}
          actorId={actorId}
          onConfirm={(title, sevenRs) => submit(slots[sendingIdx]!, sendingIdx, title, sevenRs)}
        />
      ) : null}
    </div>
  );
}

const IMPACT_KEYS: readonly (keyof ChangeImpact)[] = ["scope", "scheduleDays", "cost", "quality", "resources", "risk"];

/** Prévia do que vai ao comitê: a solicitação de mudança com o impacto calculado e os 7 Rs preenchidos a partir do cenário. */
function ApprovalDialog({ open, onOpenChange, result: r, baseline, model, people, actorId, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ScenarioResult;
  baseline: Outcome;
  model: ProjectModel;
  people: PeopleDirectory;
  actorId: string;
  onConfirm: (title: string, sevenRs: SevenRs) => void;
}) {
  const { t, intl } = useI18n();
  const [title, setTitle] = useState(() => t("sim.send.titleDefault", { name: r.scenario.name }));
  const impact = approvalImpact(r, baseline);
  const days = (v: number) => t("pm.ui.daysShort", { n: fmtDays(intl, v) });
  const money = (v: number) => fmt.money(intl, v);
  const newRisks = r.risks.filter((x) => x.isNew);
  const resourceLevers = r.scenario.levers.filter((l) => l.kind === "INDISPONIBILIDADE");
  const sevenRs: SevenRs = {
    raised: t("sim.send.raised", { name: nameOf(people, actorId) }),
    reason: t("sim.send.reason", { name: r.scenario.name, levers: r.scenario.levers.map((l) => t(`sim.lever.${l.kind}`)).join(", ") || "—" }),
    returnExpected: t("sim.send.return", {
      finish: fmt.date(intl, r.schedule.finishDate), delta: signed(days(Math.abs(r.deltas.finishDays)), r.deltas.finishDays), eac: money(r.cost.eac),
      deltaBrl: signed(money(Math.abs(r.deltas.eacBrl)), r.deltas.eacBrl), probability: r.mc ? fmt.percent(intl, r.mc.probability) : "—",
    }),
    risks: newRisks.length ? newRisks.map((x) => t(`sim.risk.${x.id}`, formatVars(t, intl, x.vars, people))).join(" · ") : t("sim.send.noRisks"),
    resources: resourceLevers.length
      ? resourceLevers.map((l) => (l.kind === "INDISPONIBILIDADE" ? t(`sim.send.resource.${l.mode}`, { name: nameOf(people, l.userId), days: fmtDays(intl, l.days), pct: fmt.number(intl, l.capacityPct, 0) }) : "")).join(" · ")
      : t("sim.send.noResources"),
    responsible: nameOf(people, model.charter.managerId ?? actorId),
    relationship: t("sim.send.relationship", { id: r.scenario.id, v: model.version }),
  };
  const shown = (k: keyof ChangeImpact) =>
    k === "cost" ? signed(money(Math.abs(impact.cost)), impact.cost) : k === "scheduleDays" ? signed(days(Math.abs(impact.scheduleDays)), impact.scheduleDays) : t(`pm.ctl.chg.level.${impact[k]}`);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("sim.send.dialogTitle")} description={t("sim.send.dialogDesc")} className="w-[min(94vw,44rem)]">
      <div className="grid gap-[var(--ws-space-3)]" data-approval-dialog>
        <Field label={t("sim.send.titleLabel")}>
          {({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <div className="grid gap-1">
          <p className={cn(BODY_SM, "font-semibold")}>{t("pm.ctl.chg.impactTitle")}</p>
          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {IMPACT_KEYS.map((k) => (
              <div key={k} className="flex justify-between gap-2 border-b border-ws-border py-1" data-impact-key={k}>
                <dt className={CAPTION}>{t(`pm.impact.${k}`)}</dt>
                <dd className={cn(BODY_SM, "tabular-nums")}>{shown(k)}</dd>
              </div>
            ))}
          </dl>
          <p className={CAPTION}>{t("sim.send.impactRule")}</p>
        </div>
        <div className="grid gap-1">
          <p className={cn(BODY_SM, "font-semibold")}>{t("pm.ctl.chg.sevenRsTitle")}</p>
          <dl className="grid gap-1">
            {(Object.keys(sevenRs) as (keyof SevenRs)[]).map((k) => (
              <div key={k} className="grid gap-0.5 border-b border-ws-border py-1">
                <dt className={CAPTION}>{t(`pm.sevenRs.${k}`)}</dt>
                <dd className={cn(BODY_SM, "break-words")}>{sevenRs[k]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p role="note" className="rounded-[var(--ws-radius-md)] border border-ws-info bg-ws-info-soft p-2.5 text-[length:var(--ws-text-body-sm)]">{t("sim.send.noChange")}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("pm.ui.cancel")}</Button>
          <Button variant="primary" icon="sessao-decia" disabled={!title.trim()} onClick={() => onConfirm(title.trim(), sevenRs)}>{t("sim.send.confirm")}</Button>
        </div>
      </div>
    </Dialog>
  );
}
