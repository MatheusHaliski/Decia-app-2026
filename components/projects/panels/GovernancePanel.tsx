"use client";
/**
 * Aba "Governança" da Mesa de Trabalho (RF22) — aula de Governança de TI: quem decide o quê. Governança × gestão (EDM × APO, BAI,
 * DSS e MEA; modelo ADM da ISO/IEC 38500), cascata de objetivos (PEI/PDTIC/BSC → objetivos de TI → projeto), priorização da
 * demanda (GUT e tipo de necessidade do PDTIC), Run/Grow/Transform com as linhas de orçamento, estrutura organizacional ×
 * autoridade do GP, os seis princípios da ISO/IEC 38500, as decisões de governança no DECIA e uma calculadora AHP (Saaty).
 *
 * Toda edição do projeto é um comando (`dispatch`); em `readOnly` nada é despachado. A calculadora AHP tem estado LOCAL: é uma
 * simulação para pesar critérios de seleção e nunca altera o projeto (por isso continua disponível na leitura).
 */
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Checkbox, Field, Input, Link, PercentBar, RadioCards, Select, Tag, cn } from "@/components/ui";
import { CommitNumber, CommitText, MetricStatusTag, SectionTitle, Theory, metricText } from "@/components/projects/common";
import { fmt, type DeciaActions, type PanelProps } from "@/components/projects/shared";
import { useI18n } from "@/lib/i18n/useI18n";
import { newId, type ProjectCommand } from "@/lib/projects/commands";
import { RANDOM_INDEX, ahp, pairwiseMatrix } from "@/lib/projects/engine/ahp";
import { ORG_STRUCTURES, PM_AUTHORITY, gut } from "@/lib/projects/engine/methods";
import { computeMetrics, type Metric, type MetricId, type WorkspaceTab } from "@/lib/projects/metrics";
import type { BudgetLine, Governance, OrgStructure, ProjectModel } from "@/lib/projects/types";

type T = (key: string, vars?: Record<string, string | number>) => string;
type Spend = BudgetLine["spend"];
type GoalSource = Governance["goals"][number]["source"];
type Need = NonNullable<Governance["need"]>;
type IsoPrinciple = keyof Governance["iso38500"];
type GutDim = "g" | "u" | "t";

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const BODY_SM = "text-[length:var(--ws-text-body-sm)] text-ws-text";
const SUBTITLE = "font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold text-ws-text";
/** variável `{x}` que sobrou no texto do indicador (indicador sem dados vem sem as variáveis do detalhe) */
const UNRESOLVED_VAR = /\{\s*[A-Za-z0-9_]+\s*\}/;
const H4 = "text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text";
const TABLE = "w-full border-collapse text-left text-[length:var(--ws-text-body-sm)]";

const SPENDS: readonly Spend[] = ["RUN", "GROW", "TRANSFORM"];
const SPEND_TONE: Record<Spend, "info" | "accent" | "spark"> = { RUN: "info", GROW: "accent", TRANSFORM: "spark" };
const SOURCES: readonly GoalSource[] = ["PEI", "PDTIC", "BSC"];
const NEEDS: readonly Need[] = ["INFORMACAO", "SERVICO", "INFRAESTRUTURA", "CONTRATACAO", "PESSOAL"];
const ISO_PRINCIPLES: readonly IsoPrinciple[] = ["RESPONSABILIDADE", "ESTRATEGIA", "AQUISICAO", "DESEMPENHO", "CONFORMIDADE", "COMPORTAMENTO_HUMANO"];
const GUT_DIMS: readonly GutDim[] = ["g", "u", "t"];
/** Indicadores que dependem das decisões do DECIA, que o painel não recebe (`PanelProps` não traz `decisions`). */
const NEEDS_DECISIONS: ReadonlySet<MetricId> = new Set<MetricId>(["W_PARTICIPACAO_DECISOES"]);

/** Quem decide o quê na Mesa: governança decide e cobra (no DECIA); gestão planeja e faz. */
const WHO_DECIDES: readonly { row: string; by: string; at: string; governance: boolean }[] = [
  { row: "selection", by: "committee", at: "decia", governance: true },
  { row: "tap", by: "sponsor", at: "tap", governance: true },
  { row: "gate", by: "committee", at: "decia", governance: true },
  { row: "changeNormal", by: "ccb", at: "decia", governance: true },
  { row: "changeStandard", by: "manager", at: "control", governance: false },
  { row: "work", by: "team", at: "mesa", governance: false },
];

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
/** Mesmo critério do `CommitNumber`: aceita vírgula decimal; vazio é zero; inválido vira NaN (o comando recusa). */
const parseAmount = (s: string) => (s.trim() === "" ? 0 : Number(s.trim().replace(/\s/g, "").replace(",", ".")));

interface Notice { where: string; key: string; vars?: Record<string, string | number> }

interface Ctx {
  model: ProjectModel;
  readOnly: boolean;
  goTo?: (tab: WorkspaceTab) => void;
  decia?: DeciaActions;
  metrics: Metric[];
  t: T;
  intl: string;
  /** despacha o comando (nunca em `readOnly`); devolve se foi aceito e guarda a recusa para `alertAt(where)` */
  run: (cmd: ProjectCommand, where: string) => boolean;
  /** recusa local (validação que o comando não faz), mostrada no mesmo lugar */
  warn: (where: string, key: string, vars?: Record<string, string | number>) => void;
  alertAt: (where: string) => ReactNode;
}

export function GovernancePanel({ model, dispatch, readOnly, goTo, decia }: PanelProps) {
  const { t, intl } = useI18n();
  const [notice, setNotice] = useState<Notice | null>(null);
  const run = (cmd: ProjectCommand, where: string): boolean => {
    if (readOnly) return false;
    const r = dispatch(cmd);
    setNotice(r.ok ? null : { where, key: `pm.err.${r.error}` });
    return r.ok;
  };
  const warn = (where: string, key: string, vars?: Record<string, string | number>) => setNotice({ where, key, vars });
  const alertAt = (where: string) => (notice?.where === where ? <Alert>{t(notice.key, notice.vars)}</Alert> : null);
  const metrics = useMemo(() => {
    const all = computeMetrics(model);
    return [...all.quality, ...all.governance, ...all.group];
  }, [model]);
  const ctx: Ctx = { model, readOnly, goTo, decia, metrics, t, intl, run, warn, alertAt };

  return (
    <div className="@container grid gap-[var(--ws-space-5)]" data-panel="governanca">
      <header className="grid gap-1">
        <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-[var(--ws-text-h2--lh)] text-ws-text">
          {t("pm.tab.governanca")}
        </h2>
        <p className={BODY_SM}>{t("pm.gov.subtitle")}</p>
      </header>
      <TabMetrics ctx={ctx} />
      <GovernanceVsManagement ctx={ctx} />
      <CascadeSection ctx={ctx} />
      <GutSection ctx={ctx} />
      <RunGrowTransformSection ctx={ctx} />
      <div className="grid gap-[var(--ws-space-5)] @5xl:grid-cols-2">
        <OrgStructureSection ctx={ctx} />
        <IsoSection ctx={ctx} />
      </div>
      <DeciaSection ctx={ctx} />
      <AhpCalculator />
    </div>
  );
}

// ---------------------------------------------------------------- peças pequenas

/** Recusa junto do campo (a área de trabalho já anuncia o erro do comando num aviso; aqui ele fica visível no lugar). */
function Alert({ children }: { children: ReactNode }) {
  return (
    <p className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink" data-refusal>
      <span aria-hidden>✕ </span>
      {children}
    </p>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="grid content-start gap-0.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" data-testid={testId}>
      <dt className={CAPTION}>{label}</dt>
      <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums text-ws-text">{value}</dd>
    </div>
  );
}

function Note({ tone, children, testId }: { tone: "warning" | "danger" | "success"; children: ReactNode; testId?: string }) {
  const ink = tone === "warning" ? "text-ws-warning-ink" : tone === "danger" ? "text-ws-danger-ink" : "text-ws-success-ink";
  return (
    <p className={cn("text-[length:var(--ws-text-body-sm)]", ink)} data-testid={testId}>
      <span aria-hidden>{tone === "success" ? "✓ " : tone === "danger" ? "✕ " : "! "}</span>
      {children}
    </p>
  );
}

/** Indicadores (de `computeMetrics`) que apontam para esta aba — os mesmos do "Feedback da IA". */
function TabMetrics({ ctx }: { ctx: Ctx }) {
  const { metrics, t, intl } = ctx;
  const id = useId();
  const mine = metrics.filter((m) => m.tab === "governanca" && !NEEDS_DECISIONS.has(m.id));
  if (!mine.length) return null;
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={id} className={SUBTITLE}>{t("pm.gov.metrics")}</h3>
        <p className={CAPTION}>{t("pm.gov.metricsHint")}</p>
      </div>
      <ul className="grid gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {mine.map((m) => {
          const text = metricText(t, intl, m);
          // indicador sem dados (ex.: GUT ainda não avaliada) vem sem as variáveis do detalhe: mostra a orientação no lugar
          const detail = UNRESOLVED_VAR.test(text.detail) ? null : text.detail;
          return (
            <li key={m.id} data-metric={m.id} data-status={m.status} className="grid content-start gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-ws-text">{text.title}</span>
                <MetricStatusTag status={m.status} className="shrink-0" />
              </div>
              <p className={BODY_SM}>{detail ?? text.advice}</p>
              {detail && (m.status === "ATENCAO" || m.status === "CRITICO") ? <p className={CAPTION}>{text.advice}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- governança × gestão

function GovernanceVsManagement({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const id = useId();
  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={id}>{t("pm.gov.gx.title")}</SectionTitle>
      <div className="grid gap-[var(--ws-space-3)] @2xl:grid-cols-2">
        <div className="grid content-start gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-accent bg-ws-accent-soft p-[var(--ws-space-3)]" data-side="governanca">
          <h4 className={H4}>{t("pm.gov.gx.governance")}</h4>
          <p className={BODY_SM}>{t("pm.gov.gx.governanceQ")}</p>
          <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-accent-ink">{t("pm.cobit.EDM")}</p>
        </div>
        <div className="grid content-start gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)]" data-side="gestao">
          <h4 className={H4}>{t("pm.gov.gx.management")}</h4>
          <p className={BODY_SM}>{t("pm.gov.gx.managementQ")}</p>
          <ul className="grid gap-0.5 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">
            {(["APO", "BAI", "DSS", "MEA"] as const).map((d) => <li key={d}>{t(`pm.cobit.${d}`)}</li>)}
          </ul>
        </div>
      </div>
      <div className="grid gap-1.5">
        <h4 className={H4}>{t("pm.gov.who.title")}</h4>
        <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
          <table className={cn(TABLE, "min-w-[36rem]")}>
            <caption className="sr-only">{t("pm.gov.who.caption")}</caption>
            <thead className="bg-ws-surface-2 align-bottom">
              <tr>
                <th scope="col" className="p-2 font-semibold">{t("pm.gov.who.col.decision")}</th>
                <th scope="col" className="p-2 font-semibold">{t("pm.gov.who.col.by")}</th>
                <th scope="col" className="p-2 font-semibold">{t("pm.gov.who.col.at")}</th>
                <th scope="col" className="p-2 font-semibold">{t("pm.gov.who.col.nature")}</th>
              </tr>
            </thead>
            <tbody>
              {WHO_DECIDES.map((r) => (
                <tr key={r.row} className="border-t border-ws-border align-top" data-row={r.row}>
                  <th scope="row" className="p-2 font-medium">{t(`pm.gov.who.row.${r.row}`)}</th>
                  <td className="p-2">{t(`pm.gov.who.by.${r.by}`)}</td>
                  <td className="p-2">{t(`pm.gov.who.at.${r.at}`)}</td>
                  <td className="p-2">
                    <Tag tone={r.governance ? "accent" : "neutral"}>{t(r.governance ? "pm.gov.who.nature.gov" : "pm.gov.who.nature.mgmt")}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Theory refKey="GOVERNANCA_X_GESTAO">{t("pm.gov.gx.theory")}</Theory>
    </Card>
  );
}

// ---------------------------------------------------------------- cascata de objetivos

function CascadeSection({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, goTo, t, alertAt } = ctx;
  const id = useId();
  const goals = model.governance.goals;
  const objectives = model.charter.objectives;
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const aligned = objectives.filter((o) => o.goalId && goalById.has(o.goalId)).length;
  const corporate = goals.filter((g) => g.source !== "PDTIC").length;
  const goalOptions = [
    { value: "", label: t("pm.gov.align.none") },
    ...goals.map((g) => ({ value: g.id, label: t("pm.gov.align.goalOption", { code: g.code, text: g.text }) })),
  ];
  const removeGoal = (goalId: string) => {
    // a cascata não fica com referência solta: os objetivos do projeto ligados a ele são desligados antes
    for (const o of objectives.filter((x) => x.goalId === goalId)) {
      if (!run({ type: "OBJECTIVE_UPDATE", id: o.id, goalId: null }, "goals")) return;
    }
    run({ type: "GOVERNANCE_UPDATE", patch: { goals: goals.filter((g) => g.id !== goalId) } }, "goals");
  };

  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-4)]">
      <div className="grid gap-1">
        <SectionTitle id={id}>{t("pm.gov.cascade.title")}</SectionTitle>
        <p className={BODY_SM}>{t("pm.gov.cascade.subtitle")}</p>
      </div>
      <ol className="grid gap-1 text-[length:var(--ws-text-body-sm)] @3xl:grid-cols-[1fr_auto_1fr_auto_1fr] @3xl:items-center" data-testid="cascade-levels">
        <li className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-2 text-center">{t("pm.gov.cascade.corporate", { n: corporate })}</li>
        <li aria-hidden className="text-center text-ws-text-muted">
          <span className="@3xl:hidden">↓</span>
          <span className="hidden @3xl:inline">→</span>
        </li>
        <li className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-2 text-center">{t("pm.gov.cascade.it", { n: goals.length - corporate })}</li>
        <li aria-hidden className="text-center text-ws-text-muted">
          <span className="@3xl:hidden">↓</span>
          <span className="hidden @3xl:inline">→</span>
        </li>
        <li className={cn("rounded-[var(--ws-radius-md)] border p-2 text-center", objectives.length && aligned === objectives.length ? "border-ws-success bg-ws-success-soft" : "border-ws-warning bg-ws-warning-soft")}>
          {t("pm.gov.cascade.project", { aligned, total: objectives.length })}
        </li>
      </ol>

      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-2">
        <div className="grid content-start gap-2" data-testid="goals">
          <h4 className={H4}>{t("pm.gov.goals.title")}</h4>
          {goals.length ? (
            <ul className="grid gap-1.5">
              {goals.map((g) => {
                const n = objectives.filter((o) => o.goalId === g.id).length;
                return (
                  <li key={g.id} data-goal={g.id} className="flex flex-wrap items-start gap-2 rounded-[var(--ws-radius-sm)] bg-ws-surface-2 px-2 py-1.5 text-[length:var(--ws-text-body-sm)]">
                    <Tag tone="info">{t(`pm.goalSource.${g.source}`)}</Tag>
                    <span className="font-[family-name:var(--ws-font-mono)] font-semibold">{g.code}</span>
                    <span className="min-w-0 flex-1 break-words">{g.text}</span>
                    <span className={CAPTION}>{n ? t("pm.gov.goals.supports", { n }) : t("pm.gov.goals.unused")}</span>
                    {!readOnly ? (
                      <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: `${g.code} ${g.text}` })} onClick={() => removeGoal(g.id)} className="min-h-0 px-2 py-0">
                        ×
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={CAPTION}>{t("pm.gov.goals.empty")}</p>
          )}
          {!readOnly ? <GoalForm ctx={ctx} /> : null}
          {alertAt("goals")}
        </div>

        <div className="grid content-start gap-2" data-testid="alignment">
          <h4 className={H4}>{t("pm.gov.align.title")}</h4>
          {objectives.length ? (
            <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
              <table className={cn(TABLE, "min-w-[30rem]")}>
                <caption className="sr-only">{t("pm.gov.align.caption")}</caption>
                <thead className="bg-ws-surface-2 align-bottom">
                  <tr>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.align.col.objective")}</th>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.align.col.goal")}</th>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.align.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {objectives.map((o) => {
                    const goal = o.goalId ? goalById.get(o.goalId) : undefined;
                    return (
                      <tr key={o.id} className="border-t border-ws-border align-top" data-objective={o.id}>
                        <th scope="row" className="p-2 font-normal">{o.text}</th>
                        <td className="p-2">
                          {readOnly ? (
                            goal ? t("pm.gov.align.goalOption", { code: goal.code, text: goal.text }) : t("pm.gov.align.none")
                          ) : (
                            <Select
                              aria-label={t("pm.gov.align.goalOf", { objective: o.text })}
                              value={goal?.id ?? ""}
                              options={goalOptions}
                              onChange={(e) => run({ type: "OBJECTIVE_UPDATE", id: o.id, goalId: e.target.value || null }, "alignment")}
                              className="min-h-[var(--ws-control-sm)] min-w-[11rem] text-[length:var(--ws-text-body-sm)]"
                            />
                          )}
                        </td>
                        <td className="p-2">
                          {goal ? (
                            <Tag tone="success"><span aria-hidden>✓</span>{t("pm.gov.align.aligned")}</Tag>
                          ) : (
                            <Tag tone="warning"><span aria-hidden>!</span>{t("pm.gov.align.notAligned")}</Tag>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className={CAPTION}>{t("pm.gov.align.noObjectives")}</p>
              {goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("iniciacao")}>{t("pm.ui.goToTab", { tab: t("pm.tab.iniciacao") })}</Button> : null}
            </div>
          )}
          {alertAt("alignment")}
        </div>
      </div>
      <Theory refKey="CASCATA_OBJETIVOS">{t("pm.gov.cascade.theory")}</Theory>
    </Card>
  );
}

function GoalForm({ ctx }: { ctx: Ctx }) {
  const { model, run, warn, t } = ctx;
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState<GoalSource>("PEI");
  const goals = model.governance.goals;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = clean(code);
    const x = clean(text);
    if (!c || !x) return warn("goals", "pm.gov.goals.needCodeText");
    if (goals.some((g) => g.code.toLocaleLowerCase() === c.toLocaleLowerCase())) return warn("goals", "pm.gov.goals.duplicate", { code: c });
    if (run({ type: "GOVERNANCE_UPDATE", patch: { goals: [...goals, { id: newId("g"), code: c, text: x, source }] } }, "goals")) {
      setCode("");
      setText("");
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-dashed border-ws-border p-[var(--ws-space-3)] @xl:grid-cols-[7rem_minmax(0,1fr)_8rem] @xl:items-end" data-testid="goal-form">
      <Field label={t("pm.gov.goals.code")}>
        {({ id }) => <Input id={id} value={code} placeholder={t("pm.gov.goals.codePlaceholder")} onChange={(e) => setCode(e.target.value)} />}
      </Field>
      <Field label={t("pm.gov.goals.text")}>{({ id }) => <Input id={id} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
      <Field label={t("pm.gov.goals.source")}>
        {({ id }) => (
          <Select id={id} value={source} onChange={(e) => setSource(e.target.value as GoalSource)} options={SOURCES.map((s) => ({ value: s, label: t(`pm.goalSource.${s}`) }))} />
        )}
      </Field>
      <div className="@xl:col-span-3">
        <Button type="submit" size="sm">{t("pm.gov.goals.add")}</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- priorização da demanda (GUT)

function GutSection({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, t, alertAt } = ctx;
  const id = useId();
  const current = model.governance.gut;
  // sem avaliação ainda: guarda as notas escolhidas até as três existirem (uma só versão, com o produto completo)
  const [draft, setDraft] = useState<Partial<Record<GutDim, number>>>({});
  const valueOf = (d: GutDim) => draft[d] ?? current?.[d];
  const choose = (d: GutDim, v: number) => {
    const next = { g: d === "g" ? v : valueOf("g"), u: d === "u" ? v : valueOf("u"), t: d === "t" ? v : valueOf("t") };
    if (next.g && next.u && next.t) {
      if (run({ type: "GOVERNANCE_UPDATE", patch: { gut: { g: next.g, u: next.u, t: next.t } } }, "gut")) setDraft({});
    } else setDraft((x) => ({ ...x, [d]: v }));
  };
  const result = current ? gut(current.g, current.u, current.t) : null;
  const need = model.governance.need;
  const pending = !current && Object.keys(draft).length > 0;

  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-4)]">
      <div className="grid gap-1">
        <SectionTitle id={id}>{t("pm.gov.gut.title")}</SectionTitle>
        <p className={BODY_SM}>{t("pm.gov.gut.subtitle")}</p>
      </div>
      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-[var(--ws-space-3)]">
          <div className="grid gap-3 @2xl:grid-cols-3">
            {GUT_DIMS.map((d) => {
              const v = valueOf(d);
              return (
                <Field key={d} label={t(`pm.gov.gut.${d}`)} hint={t(`pm.gov.gut.${d}Hint`)}>
                  {({ id: fieldId, describedBy }) => (
                    <Select
                      id={fieldId}
                      aria-describedby={describedBy}
                      value={v === undefined ? "" : String(v)}
                      disabled={readOnly}
                      onChange={(e) => {
                        if (e.target.value) choose(d, Number(e.target.value));
                      }}
                      options={[
                        ...(v === undefined ? [{ value: "", label: t("pm.ui.select") }] : []),
                        ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: t(`pm.gov.gut.scale.${d}.${n}`) })),
                      ]}
                    />
                  )}
                </Field>
              );
            })}
          </div>
          {pending ? <Note tone="warning">{t("pm.gov.gut.pending")}</Note> : null}
          {alertAt("gut")}
          <Field label={t("pm.gov.need.label")} hint={t("pm.gov.need.hint")}>
            {({ id: fieldId, describedBy }) => (
              <Select
                id={fieldId}
                aria-describedby={describedBy}
                value={need ?? ""}
                disabled={readOnly}
                onChange={(e) => run({ type: "GOVERNANCE_UPDATE", patch: { need: (e.target.value || undefined) as Need | undefined } }, "need")}
                options={[{ value: "", label: t("pm.gov.need.unset") }, ...NEEDS.map((n) => ({ value: n, label: t(`pm.need.${n}`) }))]}
              />
            )}
          </Field>
          {alertAt("need")}
        </div>
        <div className="grid content-start gap-[var(--ws-space-3)]" data-testid="gut-result">
          {current && result ? (
            <div className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
              <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums text-ws-text">
                {t("pm.gov.gut.formula", { g: current.g, u: current.u, t: current.t, score: result.score })}
              </p>
              <span>
                <Tag tone={result.band === "MAXIMA" || result.band === "ALTA" ? "warning" : "neutral"}>{t("pm.gov.gut.band", { band: t(`pm.gutBand.${result.band}`) })}</Tag>
              </span>
              <PercentBar value={(result.score / 125) * 100} showValue={false} label={t("pm.gov.gut.of125", { score: result.score })} />
              <p className={CAPTION}>{t("pm.gov.gut.product")}</p>
            </div>
          ) : (
            <Note tone="warning" testId="gut-missing">{t("pm.gov.gut.notAssessed")}</Note>
          )}
          <Theory refKey="GUT">{t("pm.gov.gut.theory")}</Theory>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Run · Grow · Transform

function RunGrowTransformSection({ ctx }: { ctx: Ctx }) {
  const { model, run, warn, readOnly, goTo, metrics, t, intl, alertAt } = ctx;
  const id = useId();
  const lines = model.budgetLines;
  const sums: Record<Spend, number> = { RUN: 0, GROW: 0, TRANSFORM: 0 };
  for (const b of lines) sums[b.spend] += b.amount;
  const total = sums.RUN + sums.GROW + sums.TRANSFORM;
  // percentuais do próprio indicador (os mesmos números do Feedback da IA)
  const vars = metrics.find((m) => m.id === "G_RUN_GROW_TRANSFORM")?.vars ?? {};
  const share = (s: Spend) => Number(vars[s === "RUN" ? "run" : s === "GROW" ? "grow" : "transform"] ?? 0);
  const tap = model.charter.summaryBudget;
  const diff = tap - total;
  const spendOptions = SPENDS.map((s) => ({ value: s, label: t(`pm.gov.rgt.short.${s}`) }));

  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-4)]">
      <div className="grid gap-1">
        <SectionTitle id={id}>{t("pm.gov.rgt.title")}</SectionTitle>
        <p className={BODY_SM}>{t("pm.gov.rgt.subtitle")}</p>
      </div>
      <div className="grid gap-1.5">
        <h4 className={H4}>{t("pm.gov.rgt.class")}</h4>
        <RadioCards
          label={t("pm.gov.rgt.class")}
          value={model.governance.spend}
          columns={1}
          className="@2xl:grid-cols-3"
          onValueChange={(v) => {
            if (v !== model.governance.spend) run({ type: "GOVERNANCE_UPDATE", patch: { spend: v as Spend } }, "spend");
          }}
          options={SPENDS.map((s) => ({ value: s, disabled: readOnly, label: t(`pm.spend.${s}`), hint: t(`pm.gov.rgt.classHint.${s}`) }))}
        />
        {alertAt("spend")}
      </div>

      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-2">
          <h4 className={H4}>{t("pm.gov.rgt.lines")}</h4>
          {lines.length ? (
            <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
              <table className={cn(TABLE, "min-w-[36rem]")} data-testid="budget-lines">
                <caption className="sr-only">{t("pm.gov.rgt.caption")}</caption>
                <thead className="bg-ws-surface-2 align-bottom">
                  <tr>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.rgt.col.title")}</th>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.rgt.col.amount")}</th>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.rgt.col.spend")}</th>
                    {!readOnly ? <th scope="col" className="p-2"><span className="sr-only">{t("pm.ui.remove")}</span></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((b) => (
                    <tr key={b.id} className="border-t border-ws-border align-middle" data-line={b.id}>
                      <th scope="row" className="p-2 font-normal">
                        {readOnly ? (
                          b.title
                        ) : (
                          <CommitText
                            bare
                            label={t("pm.gov.rgt.titleOf", { title: b.title })}
                            value={b.title}
                            onCommit={(v) => (clean(v) ? run({ type: "BUDGET_LINE_UPDATE", id: b.id, patch: { title: clean(v) } }, "lines") : warn("lines", "pm.err.TEXTO_VAZIO"))}
                            className="min-h-[var(--ws-control-sm)] min-w-[11rem] text-[length:var(--ws-text-body-sm)]"
                          />
                        )}
                      </th>
                      <td className="p-2">
                        {readOnly ? (
                          <span className="whitespace-nowrap tabular-nums">{fmt.money(intl, b.amount)}</span>
                        ) : (
                          <CommitNumber
                            bare
                            label={t("pm.gov.rgt.amountOf", { title: b.title })}
                            value={b.amount}
                            min={0}
                            onCommit={(v) => run({ type: "BUDGET_LINE_UPDATE", id: b.id, patch: { amount: v } }, "lines")}
                            className="min-h-[var(--ws-control-sm)] w-[8.5rem] min-w-[7rem] text-[length:var(--ws-text-body-sm)]"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {readOnly ? (
                          t(`pm.gov.rgt.short.${b.spend}`)
                        ) : (
                          <Select
                            aria-label={t("pm.gov.rgt.spendOf", { title: b.title })}
                            value={b.spend}
                            options={spendOptions}
                            onChange={(e) => run({ type: "BUDGET_LINE_UPDATE", id: b.id, patch: { spend: e.target.value as Spend } }, "lines")}
                            className="min-h-[var(--ws-control-sm)] min-w-[9rem] text-[length:var(--ws-text-body-sm)]"
                          />
                        )}
                      </td>
                      {!readOnly ? (
                        <td className="p-2 text-right">
                          <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: b.title })} onClick={() => run({ type: "BUDGET_LINE_REMOVE", id: b.id }, "lines")} className="min-h-0 px-2 py-0">
                            ×
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ws-border-strong bg-ws-surface-2">
                    <th scope="row" className="p-2 font-semibold">{t("pm.ui.total")}</th>
                    <td className="whitespace-nowrap p-2 font-semibold tabular-nums" data-testid="lines-total">{fmt.money(intl, total)}</td>
                    <td className="p-2" colSpan={readOnly ? 1 : 2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className={CAPTION}>{t("pm.gov.rgt.empty")}</p>
          )}
          {!readOnly ? <BudgetLineForm ctx={ctx} /> : null}
          {alertAt("lines")}
        </div>

        <div className="grid content-start gap-[var(--ws-space-3)]">
          <div className="grid gap-2" data-testid="rgt-distribution">
            <h4 className={H4}>{t("pm.gov.rgt.distribution")}</h4>
            {SPENDS.map((s) => (
              <PercentBar key={s} value={share(s)} tone={SPEND_TONE[s]} label={t("pm.gov.rgt.bar", { spend: t(`pm.spend.${s}`), amount: fmt.money(intl, sums[s]) })} />
            ))}
            <p className={CAPTION}>{t("pm.gov.rgt.reference")}</p>
          </div>
          <div className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]" data-testid="rgt-vs-tap">
            <p className="tabular-nums">{t("pm.gov.rgt.total", { total: fmt.money(intl, total) })}</p>
            <p className="tabular-nums">{t("pm.gov.rgt.tap", { tap: fmt.money(intl, tap) })}</p>
            {tap > 0 ? (
              diff > 0 ? (
                <Note tone="success">{t("pm.gov.rgt.within", { diff: fmt.money(intl, diff) })}</Note>
              ) : diff < 0 ? (
                <Note tone="danger">{t("pm.gov.rgt.over", { diff: fmt.money(intl, -diff) })}</Note>
              ) : (
                <Note tone="success">{t("pm.gov.rgt.equal")}</Note>
              )
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Note tone="warning">{t("pm.gov.rgt.noTap")}</Note>
                {goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("iniciacao")}>{t("pm.ui.goToTab", { tab: t("pm.tab.iniciacao") })}</Button> : null}
              </div>
            )}
          </div>
          <Theory refKey="RUN_GROW_TRANSFORM">{t("pm.gov.rgt.theory")}</Theory>
        </div>
      </div>
    </Card>
  );
}

/** Nova linha de orçamento: o comando valida (título vazio ou valor inválido voltam como recusa, mostrada aqui). */
function BudgetLineForm({ ctx }: { ctx: Ctx }) {
  const { run, t } = ctx;
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [spend, setSpend] = useState<Spend>("GROW");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (run({ type: "BUDGET_LINE_ADD", title, amount: parseAmount(amount), spend }, "lines")) {
      setTitle("");
      setAmount("");
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-dashed border-ws-border p-[var(--ws-space-3)] @xl:grid-cols-[minmax(0,1fr)_8rem] @xl:items-end" data-testid="line-form">
      <Field label={t("pm.gov.rgt.newTitle")}>{({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
      <Field label={t("pm.gov.rgt.newAmount")}>
        {({ id }) => <Input id={id} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />}
      </Field>
      <Field label={t("pm.gov.rgt.newSpend")} className="@xl:col-span-2">
        {({ id }) => <Select id={id} value={spend} onChange={(e) => setSpend(e.target.value as Spend)} options={SPENDS.map((s) => ({ value: s, label: t(`pm.spend.${s}`) }))} />}
      </Field>
      <div className="@xl:col-span-2">
        <Button type="submit" size="sm">{t("pm.gov.rgt.add")}</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- estrutura organizacional

function OrgStructureSection({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, t, alertAt } = ctx;
  const id = useId();
  const org = model.governance.orgStructure;
  const auth = PM_AUTHORITY[org];
  const weak = auth.authority === "NENHUMA" || auth.authority === "BAIXA";
  return (
    <Card as="section" aria-labelledby={id} className="grid content-start gap-[var(--ws-space-3)]">
      <SectionTitle id={id}>{t("pm.gov.org.title")}</SectionTitle>
      <RadioCards
        label={t("pm.gov.org.label")}
        value={org}
        columns={1}
        className="@xl:grid-cols-2"
        onValueChange={(v) => {
          if (v !== org) run({ type: "GOVERNANCE_UPDATE", patch: { orgStructure: v as OrgStructure } }, "org");
        }}
        options={ORG_STRUCTURES.map((o) => ({
          value: o,
          disabled: readOnly,
          label: t(`pm.org.${o}`),
          hint: t("pm.gov.org.cardHint", { authority: t(`pm.authority.${PM_AUTHORITY[o].authority}`), owner: t(`pm.budgetOwner.${PM_AUTHORITY[o].budgetOwner}`) }),
        }))}
      />
      {alertAt("org")}
      <p className={BODY_SM} data-testid="org-result">
        {t("pm.gov.org.current", { structure: t(`pm.org.${org}`), authority: t(`pm.authority.${auth.authority}`), owner: t(`pm.budgetOwner.${auth.budgetOwner}`) })}
      </p>
      {weak ? <Note tone="warning">{t("pm.gov.org.weak")}</Note> : null}
      <Theory refKey="ESTRUTURA_AUTORIDADE">{t("pm.gov.org.theory")}</Theory>
    </Card>
  );
}

// ---------------------------------------------------------------- ISO/IEC 38500

function IsoSection({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, t, alertAt } = ctx;
  const id = useId();
  const iso = model.governance.iso38500;
  const n = ISO_PRINCIPLES.filter((k) => iso[k]).length;
  const toggle = (k: IsoPrinciple, v: boolean) => {
    const next: Governance["iso38500"] = { ...iso };
    next[k] = v;
    run({ type: "GOVERNANCE_UPDATE", patch: { iso38500: next } }, "iso");
  };
  return (
    <Card as="section" aria-labelledby={id} className="grid content-start gap-[var(--ws-space-3)]">
      <SectionTitle id={id} actions={<Tag tone={n === 6 ? "success" : "warning"} className="tabular-nums">{t("pm.gov.iso.count", { n })}</Tag>}>
        {t("pm.gov.iso.title")}
      </SectionTitle>
      <ul className="grid gap-1" data-testid="iso">
        {ISO_PRINCIPLES.map((k) => (
          <li key={k} data-principle={k}>
            <Checkbox checked={iso[k] === true} disabled={readOnly} onCheckedChange={(v) => toggle(k, v)} label={t(`pm.iso.${k}`)} hint={t(`pm.gov.iso.hint.${k}`)} />
          </li>
        ))}
      </ul>
      {alertAt("iso")}
      {!iso.CONFORMIDADE ? <Note tone="warning">{t("pm.gov.iso.conformityGate")}</Note> : null}
      {!iso.COMPORTAMENTO_HUMANO ? <Note tone="warning">{t("pm.gov.iso.humanForgotten")}</Note> : null}
      <Theory refKey="ISO_38500">{t("pm.gov.iso.theory")}</Theory>
    </Card>
  );
}

// ---------------------------------------------------------------- decisões de governança no DECIA

function DeciaSection({ ctx }: { ctx: Ctx }) {
  const { model, readOnly, decia, t, intl } = ctx;
  const id = useId();
  const decided = model.gates.filter((g) => g.outcome !== "PENDENTE");
  const describe = (decisionId: string) => {
    const gate = model.gates.find((g) => g.decisionId === decisionId);
    if (gate) return t("pm.gov.decia.kind.gate", { phase: t(`pm.phase.${gate.phase}`) });
    const change = model.changes.find((c) => c.decisionId === decisionId);
    if (change) return t("pm.gov.decia.kind.change", { code: change.code });
    return t("pm.gov.decia.kind.other");
  };
  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-4)]">
      <div className="grid gap-1">
        <SectionTitle
          id={id}
          actions={
            decia && !readOnly ? (
              <Button size="sm" variant="spark" icon="sessao-decia" onClick={() => decia.openSelection()}>
                {t("pm.gov.decia.selection")}
              </Button>
            ) : null
          }
        >
          {t("pm.gov.decia.title")}
        </SectionTitle>
        <p className={BODY_SM}>{t("pm.gov.decia.subtitle")}</p>
        {!decia ? <p className={CAPTION} data-testid="no-decia">{t("pm.gov.decia.noDecia")}</p> : null}
      </div>
      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-2">
        <div className="grid content-start gap-2" data-testid="linked-decisions">
          <h4 className={H4}>{t("pm.gov.decia.linked")}</h4>
          {model.decisionIds.length ? (
            <ul className="grid gap-1.5">
              {model.decisionIds.map((decisionId) => {
                const what = describe(decisionId);
                const status = decia?.decisionStatus(decisionId);
                return (
                  <li key={decisionId} data-decision={decisionId} className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-sm)] bg-ws-surface-2 px-2 py-1.5 text-[length:var(--ws-text-body-sm)]">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{what}</span>
                      <span className="block font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{decisionId}</span>
                    </span>
                    {decia ? <Tag tone={status ? "info" : "neutral"}>{status ? t(`decia.status.${status}`) : t("pm.gov.decia.statusUnknown")}</Tag> : null}
                    {decia ? (
                      <Link href={decia.decisionHref(decisionId)} aria-label={t("pm.gov.decia.openOne", { what })}>
                        {t("pm.ui.openInDecia")}
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={CAPTION}>{t("pm.gov.decia.none")}</p>
          )}
        </div>
        <div className="grid content-start gap-2" data-testid="decided-gates">
          <h4 className={H4}>{t("pm.gov.decia.gates")}</h4>
          {decided.length ? (
            <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
              <table className={cn(TABLE, "min-w-[30rem]")}>
                <caption className="sr-only">{t("pm.gov.decia.gatesCaption")}</caption>
                <thead className="bg-ws-surface-2 align-bottom">
                  <tr>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.decia.col.phase")}</th>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.decia.col.outcome")}</th>
                    <th scope="col" className="p-2 font-semibold">{t("pm.gov.decia.col.record")}</th>
                  </tr>
                </thead>
                <tbody>
                  {decided.map((g) => (
                    <tr key={g.phase} className="border-t border-ws-border align-top" data-gate={g.phase}>
                      <th scope="row" className="p-2 font-medium">
                        {t(`pm.phase.${g.phase}`)}
                        {g.decidedAt ? <span className={cn("block font-normal tabular-nums", CAPTION)}>{fmt.date(intl, g.decidedAt)}</span> : null}
                        {g.notes ? <span className={cn("block font-normal", CAPTION)}>{g.notes}</span> : null}
                      </th>
                      <td className="p-2">
                        <Tag tone="accent">{t(`pm.gateOutcome.${g.outcome}`)}</Tag>
                      </td>
                      <td className="p-2">
                        {g.decisionId ? (
                          <span className="grid justify-items-start gap-1">
                            <Tag tone="success"><span aria-hidden>✓</span>{t("pm.gov.decia.recorded")}</Tag>
                            {decia ? (
                              <Link href={decia.decisionHref(g.decisionId)} aria-label={t("pm.gov.decia.openOne", { what: t("pm.gov.decia.kind.gate", { phase: t(`pm.phase.${g.phase}`) }) })}>
                                {t("pm.ui.openInDecia")}
                              </Link>
                            ) : null}
                          </span>
                        ) : (
                          <span className="grid justify-items-start gap-1">
                            <Tag tone="danger"><span aria-hidden>✕</span>{t("pm.gov.decia.notRecorded")}</Tag>
                            {decia && !readOnly ? (
                              <Button size="sm" variant="ghost" onClick={() => decia.openGate(g.phase)} aria-label={t("pm.gov.decia.registerGateLabel", { phase: t(`pm.phase.${g.phase}`) })}>
                                {t("pm.gov.decia.registerGate")}
                              </Button>
                            ) : null}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={CAPTION}>{t("pm.gov.decia.noGates")}</p>
          )}
          {decided.some((g) => !g.decisionId) ? <Note tone="danger">{t("pm.gov.decia.outsideDecia")}</Note> : null}
        </div>
      </div>
      <Theory refKey="GOVERNANCA_X_GESTAO">{t("pm.gov.decia.theory")}</Theory>
    </Card>
  );
}

// ---------------------------------------------------------------- calculadora AHP (estado local)

interface Criterion { id: string; name: string | null; def?: string }
const DEFAULT_CRITERIA = ["ALINHAMENTO", "VPL", "RISCO", "URGENCIA"] as const;
const MIN_CRITERIA = 3;
const MAX_CRITERIA = 5;
/** Escala de Saaty: a favor do critério da linha (9…2), igual (1) e a favor do da coluna (1/2…1/9). */
const FAVOR = [9, 8, 7, 6, 5, 4, 3, 2] as const;
const toSaaty = (s: string) => (s.startsWith("1/") ? 1 / Number(s.slice(2)) : Number(s));
const fromSaaty = (v: number) => (v >= 1 ? String(Math.round(v)) : `1/${Math.round(1 / v)}`);

function AhpCalculator() {
  const { t, intl } = useI18n();
  const id = useId();
  const [criteria, setCriteria] = useState<Criterion[]>(() => DEFAULT_CRITERIA.map((k) => ({ id: k, name: null, def: k })));
  const [judgments, setJudgments] = useState<Record<string, number>>({});
  const label = (c: Criterion, i: number) => {
    const typed = c.name?.trim();
    if (typed) return typed;
    return c.def ? t(`pm.gov.ahp.default.${c.def}`) : t("pm.gov.ahp.default.EXTRA", { n: i + 1 });
  };
  const names = criteria.map(label);
  const n = criteria.length;
  const pairs: { i: number; j: number; key: string }[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push({ i, j, key: `${criteria[i]!.id}|${criteria[j]!.id}` });
  const matrix = pairwiseMatrix(n, pairs.map((p) => ({ i: p.i, j: p.j, value: judgments[p.key] ?? 1 })));
  const result = ahp(matrix);
  const ri = RANDOM_INDEX[n] ?? 0;
  const fraction = (v: number) => (v >= 1 ? fmt.number(intl, v, 2) : `1/${fmt.number(intl, 1 / v, 2)}`);

  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-4)]" data-testid="ahp">
      <div className="grid gap-1">
        <SectionTitle id={id}>{t("pm.gov.ahp.title")}</SectionTitle>
        <p className={BODY_SM}>{t("pm.gov.ahp.subtitle")}</p>
      </div>
      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-2">
        <div className="grid content-start gap-[var(--ws-space-3)]">
          <div className="grid gap-1.5">
            <h4 className={H4}>{t("pm.gov.ahp.criteria")}</h4>
            <ol className="grid gap-1.5">
              {criteria.map((c, i) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span aria-hidden className="w-5 shrink-0 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{i + 1}</span>
                  <Input
                    aria-label={t("pm.gov.ahp.criterionName", { n: i + 1 })}
                    value={c.name ?? label(c, i)}
                    onChange={(e) => setCriteria((cs) => cs.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                    className="min-h-[var(--ws-control-sm)] text-[length:var(--ws-text-body-sm)]"
                  />
                  {n > MIN_CRITERIA ? (
                    <Button size="sm" variant="ghost" aria-label={t("pm.gov.ahp.removeCriterion", { name: names[i] ?? "" })} onClick={() => setCriteria((cs) => cs.filter((x) => x.id !== c.id))} className="min-h-0 px-2 py-0">
                      ×
                    </Button>
                  ) : null}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" disabled={n >= MAX_CRITERIA} onClick={() => setCriteria((cs) => [...cs, { id: newId("ahp"), name: null }])}>
                {t("pm.gov.ahp.addCriterion")}
              </Button>
              <span className={CAPTION}>{t("pm.gov.ahp.minMax", { min: MIN_CRITERIA, max: MAX_CRITERIA })}</span>
            </div>
          </div>
          <div className="grid gap-1.5">
            <h4 className={H4}>{t("pm.gov.ahp.pairs")}</h4>
            <p className={CAPTION}>{t("pm.gov.ahp.scale")}</p>
            <div className="grid gap-2 @2xl:grid-cols-2 @2xl:items-end">
              {pairs.map((p) => {
                const a = names[p.i] ?? "";
                const b = names[p.j] ?? "";
                return (
                  <Field key={p.key} label={t("pm.gov.ahp.pairLabel", { a, b })}>
                    {({ id: fieldId }) => (
                      <Select
                        id={fieldId}
                        value={fromSaaty(judgments[p.key] ?? 1)}
                        onChange={(e) => setJudgments((j) => ({ ...j, [p.key]: toSaaty(e.target.value) }))}
                        options={[
                          ...FAVOR.map((v) => ({ value: String(v), label: t("pm.gov.ahp.favors", { name: a, n: v, level: t(`pm.gov.ahp.level.${v}`) }) })),
                          { value: "1", label: t("pm.gov.ahp.equal") },
                          ...[...FAVOR].reverse().map((v) => ({ value: `1/${v}`, label: t("pm.gov.ahp.favors", { name: b, n: v, level: t(`pm.gov.ahp.level.${v}`) }) })),
                        ]}
                        className="text-[length:var(--ws-text-body-sm)]"
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid content-start gap-[var(--ws-space-3)]">
          <div className="grid gap-1.5">
            <h4 className={H4}>{t("pm.gov.ahp.matrix")}</h4>
            <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
              <table className={TABLE} data-testid="ahp-matrix">
                <caption className="sr-only">{t("pm.gov.ahp.matrixCaption")}</caption>
                <thead className="bg-ws-surface-2 align-bottom">
                  <tr>
                    <th scope="col" className="p-2"><span className="sr-only">{t("pm.gov.ahp.criteria")}</span></th>
                    {names.map((nm, j) => <th key={criteria[j]!.id} scope="col" className="p-2 text-center font-semibold">{nm}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={criteria[i]!.id} className="border-t border-ws-border">
                      <th scope="row" className="p-2 font-semibold">{names[i]}</th>
                      {row.map((v, j) => (
                        <td key={criteria[j]!.id} className={cn("p-2 text-center font-[family-name:var(--ws-font-mono)] tabular-nums", i === j && "text-ws-text-muted")}>{fraction(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid gap-2" data-testid="ahp-weights">
            <h4 className={H4}>{t("pm.gov.ahp.weights")}</h4>
            {result.weights.map((w, i) => (
              <PercentBar key={criteria[i]!.id} value={w * 100} showValue={false} label={t("pm.gov.ahp.weightLabel", { name: names[i] ?? "", pct: fmt.percent(intl, w, 1) })} />
            ))}
          </div>
          <dl className="grid grid-cols-3 gap-2">
            <Stat testId="ahp-lambda" label={t("pm.gov.ahp.lambda")} value={fmt.number(intl, result.lambdaMax, 3)} />
            <Stat testId="ahp-ci" label={t("pm.gov.ahp.ci")} value={fmt.number(intl, result.ci, 3)} />
            <Stat testId="ahp-cr" label={t("pm.gov.ahp.cr")} value={fmt.number(intl, result.cr, 3)} />
          </dl>
          <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.gov.ahp.formula", { ri: fmt.number(intl, ri, 2), n })}</p>
          <div className="grid gap-1" data-testid="ahp-verdict">
            <span>
              {result.consistent ? (
                <Tag tone="success"><span aria-hidden>✓</span>{t("pm.gov.ahp.consistentTag")}</Tag>
              ) : (
                <Tag tone="danger"><span aria-hidden>✕</span>{t("pm.gov.ahp.inconsistentTag")}</Tag>
              )}
            </span>
            <p className={BODY_SM}>{t(result.consistent ? "pm.gov.ahp.consistent" : "pm.gov.ahp.inconsistent")}</p>
          </div>
          <Theory refKey="AHP_SAATY">{t("pm.gov.ahp.theory")}</Theory>
        </div>
      </div>
    </Card>
  );
}
