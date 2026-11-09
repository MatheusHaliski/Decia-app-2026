"use client";
/**
 * Aba "Iniciação" da Mesa de Trabalho (RF22) — grupo de processos de iniciação (aula de projetos, Tema 2): é aqui que o projeto
 * nasce formalmente. Abordagem do ciclo de vida (Tema 1 §1.4), Termo de Abertura (TAP) com diagnóstico, objetivos SMART ligados à
 * cascata de objetivos, business case calculado pelo motor financeiro e o portão da Demanda.
 *
 * Toda edição é um comando (`dispatch`): textos e números só confirmam ao sair do campo/Enter (uma versão por confirmação), e
 * em `readOnly` nada é despachado. Recusas do comando (texto vazio, projeto arquivado…) aparecem junto do campo, sem quebrar.
 */
import { useId, useMemo, useState, type ReactNode } from "react";
import { Button, Card, Checkbox, Field, Input, Link, RadioCards, Select, Tag, cn } from "@/components/ui";
import { CommitNumber, CommitText, EditableList, GateChecklist, MetricStatusTag, SectionTitle, Theory, metricText } from "@/components/projects/common";
import { fmt, nameOf, type DeciaActions, type PanelProps, type PeopleDirectory } from "@/components/projects/shared";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ProjectCommand } from "@/lib/projects/commands";
import { businessCase, npv } from "@/lib/projects/engine/finance";
import type { GateCriterionId } from "@/lib/projects/lifecycle";
import { computeMetrics, evaluateGate, type WorkspaceTab } from "@/lib/projects/metrics";
import { APPROACHES, type Approach, type ProjectModel } from "@/lib/projects/types";

type T = (key: string, vars?: Record<string, string | number>) => string;

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const BODY_SM = "text-[length:var(--ws-text-body-sm)] text-ws-text";
const SUBTITLE = "font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold text-ws-text";
/** variável `{x}` que sobrou no texto do indicador (indicador sem dados vem sem as variáveis do detalhe) */
const UNRESOLVED_VAR = /\{\s*[A-Za-z0-9_]+\s*\}/;

/** Listas de texto simples do TAP (as outras — objetivos e marcos — têm linha própria). */
const PLAIN_LISTS = ["justification", "highLevelRequirements", "premises", "constraints", "highLevelRisks", "teamRoles"] as const;

/** Onde corrigir cada critério do portão da Demanda que não está nesta aba. */
const GATE_FIX_TAB: Partial<Record<GateCriterionId, WorkspaceTab>> = {
  ALINHAMENTO_ESTRATEGICO: "governanca",
  GUT_AVALIADA: "governanca",
  PARTES_INTERESSADAS_MAPEADAS: "canvas",
};

interface Notice { where: string; key: string }

/** Contexto comum das seções: modelo, despacho protegido por `readOnly` e o aviso de recusa junto do campo. */
interface Ctx {
  model: ProjectModel;
  people: PeopleDirectory;
  readOnly: boolean;
  goTo?: (tab: WorkspaceTab) => void;
  decia?: DeciaActions;
  t: T;
  intl: string;
  /** despacha o comando (nunca em `readOnly`); devolve se foi aceito e guarda a recusa para `alertAt(where)` */
  run: (cmd: ProjectCommand, where: string) => boolean;
  alertAt: (where: string) => ReactNode;
}

export function InitiationPanel({ model, dispatch, people, readOnly, goTo, decia }: PanelProps) {
  const { t, intl } = useI18n();
  const [notice, setNotice] = useState<Notice | null>(null);
  const run = (cmd: ProjectCommand, where: string): boolean => {
    if (readOnly) return false;
    const r = dispatch(cmd);
    setNotice(r.ok ? null : { where, key: `pm.err.${r.error}` });
    return r.ok;
  };
  const alertAt = (where: string) => (notice?.where === where ? <Alert>{t(notice.key)}</Alert> : null);
  const ctx: Ctx = { model, people, readOnly, goTo, decia, t, intl, run, alertAt };

  return (
    <div className="@container grid gap-[var(--ws-space-5)]" data-panel="iniciacao">
      <header className="grid gap-1">
        <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-[var(--ws-text-h2--lh)] text-ws-text">
          {t("pm.tab.iniciacao")}
        </h2>
        <p className={BODY_SM}>{t("pm.ini.subtitle")}</p>
      </header>
      <TabMetrics model={model} />
      <ApproachSection ctx={ctx} />
      <CharterSection ctx={ctx} />
      <ObjectivesSection ctx={ctx} />
      <BusinessCaseSection ctx={ctx} />
      <DemandGateSection ctx={ctx} />
    </div>
  );
}

// ---------------------------------------------------------------- peças pequenas

/** Recusa do comando junto do campo (a área de trabalho já anuncia o erro num aviso; aqui ele fica visível no lugar). */
function Alert({ children }: { children: ReactNode }) {
  return (
    <p className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink" data-refusal>
      <span aria-hidden>✕ </span>
      {children}
    </p>
  );
}

type Severity = "OK" | "ATENCAO" | "CRITICO";
const SEVERITY_MARK: Record<Severity, string> = { OK: "✓", ATENCAO: "!", CRITICO: "✕" };
const SEVERITY_INK: Record<Severity, string> = { OK: "text-ws-success-ink", ATENCAO: "text-ws-warning-ink", CRITICO: "text-ws-danger-ink" };

/** Item de diagnóstico: marca + texto (o texto já diz o problema; a cor nunca fala sozinha). */
function DiagItem({ severity, children, action }: { severity: Severity; children: ReactNode; action?: ReactNode }) {
  return (
    <li className="flex items-start gap-2" data-severity={severity}>
      <span aria-hidden className={cn("mt-px font-bold", SEVERITY_INK[severity])}>{SEVERITY_MARK[severity]}</span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span>{children}</span>
        {action ? <span>{action}</span> : null}
      </span>
    </li>
  );
}

/** Formulário de inclusão que deixa o comando validar (texto vazio volta como recusa e aparece junto do campo). */
function AddForm({ label, onAdd }: { label: string; onAdd: (text: string) => boolean }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (onAdd(draft)) setDraft("");
      }}
    >
      <Input aria-label={label} placeholder={t("pm.ui.newItemPlaceholder")} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <Button type="submit" size="sm">{t("pm.ui.add")}</Button>
    </form>
  );
}

function Stat({ label, value, formula, testId }: { label: string; value: string; formula?: string; testId?: string }) {
  return (
    <div className="grid content-start gap-0.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" data-testid={testId}>
      <dt className={CAPTION}>{label}</dt>
      <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums text-ws-text">{value}</dd>
      {formula ? <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{formula}</dd> : null}
    </div>
  );
}

/** Indicadores (de `computeMetrics`) que apontam para esta aba — os mesmos do "Feedback da IA". */
function TabMetrics({ model }: { model: ProjectModel }) {
  const { t, intl } = useI18n();
  const id = useId();
  const metrics = useMemo(() => {
    const all = computeMetrics(model);
    return [...all.quality, ...all.governance, ...all.group].filter((m) => m.tab === "iniciacao");
  }, [model]);
  if (!metrics.length) return null;
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={id} className={SUBTITLE}>{t("pm.ini.metrics")}</h3>
        <p className={CAPTION}>{t("pm.ini.metricsHint")}</p>
      </div>
      <ul className="grid gap-2 @2xl:grid-cols-2">
        {metrics.map((m) => {
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

// ---------------------------------------------------------------- abordagem do ciclo de vida

function ApproachSection({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, goTo, t, alertAt } = ctx;
  const id = useId();
  const agileLike = model.approach === "AGIL" || model.approach === "ITERATIVO";
  const mismatch =
    agileLike && model.boardModel !== "SCRUM"
      ? t("pm.ini.approach.mismatchAgile", { approach: t(`pm.approach.${model.approach}`), board: t(`pm.boardModel.${model.boardModel}`) })
      : model.approach === "PREDITIVO" && model.boardModel === "SCRUM"
        ? t("pm.ini.approach.mismatchPredictive")
        : null;
  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-3)]">
      <SectionTitle id={id}>{t("pm.ini.approach.title")}</SectionTitle>
      <RadioCards
        label={t("pm.ini.approach.label")}
        value={model.approach}
        columns={1}
        className="@2xl:grid-cols-2 @6xl:grid-cols-4"
        onValueChange={(v) => {
          if (v !== model.approach) run({ type: "SET_APPROACH", approach: v as Approach }, "approach");
        }}
        options={APPROACHES.map((a) => ({
          value: a,
          disabled: readOnly,
          label: t(`pm.approach.${a}`),
          hint: (
            <>
              <span className="block">{t(`pm.ini.approach.when.${a}`)}</span>
              <span className="mt-1 block text-ws-text">{t(`pm.ini.approach.effect.${a}`)}</span>
            </>
          ),
        }))}
      />
      {alertAt("approach")}
      <div className="flex flex-wrap items-center gap-2">
        <p className={BODY_SM}>{t("pm.ini.approach.board", { board: t(`pm.boardModel.${model.boardModel}`) })}</p>
        {goTo ? (
          <Button size="sm" variant="ghost" onClick={() => goTo("quadro")}>
            {t("pm.ui.goToTab", { tab: t("pm.tab.quadro") })}
          </Button>
        ) : null}
      </div>
      {mismatch ? (
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-warning-ink" data-testid="approach-mismatch">
          <span aria-hidden>! </span>
          {mismatch}
        </p>
      ) : null}
      <Theory refKey="CICLOS_DE_VIDA">{t("pm.ini.approach.theory")}</Theory>
    </Card>
  );
}

// ---------------------------------------------------------------- Termo de Abertura (TAP)

function CharterSection({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, people, t, intl, alertAt } = ctx;
  const id = useId();
  const blockedId = useId();
  const c = model.charter;
  const same = Boolean(c.sponsorId && c.sponsorId === c.managerId);
  const canApprove = Boolean(c.sponsorId) && !same;
  const linesTotal = model.budgetLines.reduce((s, b) => s + b.amount, 0);
  const options = (current?: string) => {
    const base = [
      { value: "", label: t("pm.ini.tap.noPerson") },
      ...model.team.map((m) => ({ value: m.userId, label: t("pm.ini.tap.memberOption", { name: nameOf(people, m.userId), role: t(`pm.role.${m.role}`) }) })),
    ];
    // pessoa fora da equipe (dado antigo): continua visível para poder ser trocada
    return current && !model.team.some((m) => m.userId === current) ? [...base, { value: current, label: nameOf(people, current) }] : base;
  };
  const person = (key: "managerId" | "sponsorId", label: string) => (
    <Field label={label}>
      {({ id: fieldId }) => (
        <Select
          id={fieldId}
          value={c[key] ?? ""}
          disabled={readOnly}
          options={options(c[key])}
          onChange={(e) => {
            const v = e.target.value || undefined;
            run({ type: "CHARTER_UPDATE", patch: key === "managerId" ? { managerId: v } : { sponsorId: v } }, "tap");
          }}
        />
      )}
    </Field>
  );

  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-4)]">
      <div className="grid gap-1">
        <SectionTitle id={id}>{t("pm.ini.tap.title")}</SectionTitle>
        <p className={BODY_SM}>{t("pm.ini.tap.subtitle")}</p>
      </div>
      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-[var(--ws-space-3)]">
          <CommitText
            label={t("pm.ini.tap.product")}
            hint={t("pm.ini.tap.productHint")}
            value={c.product}
            disabled={readOnly}
            onCommit={(v) => run({ type: "CHARTER_UPDATE", patch: { product: v.replace(/\s+/g, " ").trim() } }, "tap")}
          />
          <div className="grid gap-3 @xl:grid-cols-2">
            {person("managerId", t("pm.ini.tap.manager"))}
            {person("sponsorId", t("pm.ini.tap.sponsor"))}
          </div>
          <div className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)]" data-testid="tap-approval">
            <p className="font-semibold text-ws-text">{t("pm.ini.tap.approval")}</p>
            <p className={BODY_SM}>
              {c.approvedBySponsorAt ? t("pm.ini.tap.approvedAt", { date: fmt.date(intl, c.approvedBySponsorAt) }) : t("pm.ini.tap.notApproved")}
              {c.approvedBySponsorAt && c.approvedBy ? ` · ${t("pm.ini.tap.registeredBy", { name: nameOf(people, c.approvedBy) })}` : null}
            </p>
            {!readOnly ? (
              <div className="flex flex-wrap gap-2">
                {c.approvedBySponsorAt ? (
                  <Button size="sm" onClick={() => run({ type: "CHARTER_UPDATE", patch: { approvedBySponsorAt: undefined } }, "tap")}>
                    {t("pm.ini.tap.unapprove")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!canApprove}
                    aria-describedby={canApprove ? undefined : blockedId}
                    onClick={() => run({ type: "CHARTER_UPDATE", patch: { approvedBySponsorAt: new Date().toISOString() } }, "tap")}
                  >
                    {t("pm.ini.tap.approve")}
                  </Button>
                )}
              </div>
            ) : null}
            {!c.approvedBySponsorAt && !canApprove ? (
              <p id={blockedId} className={CAPTION}>{c.sponsorId ? t("pm.ini.tap.approveBlockedSame") : t("pm.ini.tap.approveBlockedNoSponsor")}</p>
            ) : null}
          </div>
          <CommitNumber
            label={t("pm.ini.tap.summaryBudget")}
            hint={t("pm.ini.tap.summaryBudgetHint")}
            value={c.summaryBudget}
            min={0}
            disabled={readOnly}
            className="max-w-[22rem]"
            onCommit={(v) => run({ type: "CHARTER_UPDATE", patch: { summaryBudget: v } }, "tap")}
          />
          <p className={CAPTION} data-testid="tap-budget-compare">
            {t("pm.ini.tap.linesTotal", { tap: fmt.money(intl, c.summaryBudget), lines: fmt.money(intl, linesTotal) })}
          </p>
          {alertAt("tap")}
        </div>
        <CharterDiagnosis ctx={ctx} />
      </div>

      <div className="grid gap-[var(--ws-space-4)] @2xl:grid-cols-2">
        {PLAIN_LISTS.map((list) => (
          <div key={list} className="grid content-start gap-1.5" data-list={list}>
            <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t(`pm.ini.tap.list.${list}`)}</h4>
            <p className={CAPTION}>{t(`pm.ini.tap.hint.${list}`)}</p>
            <EditableList
              items={c[list]}
              readOnly={readOnly}
              label={t("pm.ini.tap.newItem", { list: t(`pm.ini.tap.list.${list}`) })}
              onAdd={(text) => run({ type: "CHARTER_LIST_ADD", list, text }, `list-${list}`)}
              onRemove={(index) => run({ type: "CHARTER_LIST_REMOVE", list, index }, `list-${list}`)}
            />
            {alertAt(`list-${list}`)}
          </div>
        ))}
        <MilestonesList ctx={ctx} />
      </div>

      <div className="grid gap-[var(--ws-space-3)] @2xl:grid-cols-2">
        <Theory refKey="TAP_PATROCINADOR">{t("pm.ini.tap.theorySponsor")}</Theory>
        <Theory refKey="TAP_CONTEUDO">{t("pm.ini.tap.theoryPlan")}</Theory>
      </div>
    </Card>
  );
}

function MilestonesList({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, t, intl, alertAt } = ctx;
  const milestones = model.charter.milestones;
  return (
    <div className="grid content-start gap-1.5" data-list="milestones">
      <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("pm.ini.tap.list.milestones")}</h4>
      <p className={CAPTION}>{t("pm.ini.tap.hint.milestones")}</p>
      {milestones.length ? (
        <ul className="grid gap-1">
          {milestones.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 rounded-[var(--ws-radius-sm)] bg-ws-surface-2 px-2 py-1 text-[length:var(--ws-text-body-sm)]">
              <span className="min-w-0 flex-1 break-words">{m.title}</span>
              <Tag tone={m.date ? "info" : "neutral"} className="tabular-nums">{m.date ? fmt.date(intl, m.date) : t("pm.ini.tap.noDate")}</Tag>
              {!readOnly ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t("pm.ui.removeItem", { item: m.title })}
                  onClick={() => run({ type: "CHARTER_LIST_REMOVE", list: "milestones", index: i }, "list-milestones")}
                  className="min-h-0 px-2 py-0"
                >
                  ×
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={CAPTION}>{t("pm.ui.noneYet")}</p>
      )}
      {!readOnly ? (
        <AddForm label={t("pm.ini.tap.newItem", { list: t("pm.ini.tap.list.milestones") })} onAdd={(text) => run({ type: "CHARTER_LIST_ADD", list: "milestones", text }, "list-milestones")} />
      ) : null}
      {alertAt("list-milestones")}
    </div>
  );
}

/** Textos dos objetivos numa frase (sem o ponto final de cada um, que a frase já fecha). */
const listOf = (objectives: readonly { text: string }[]) => objectives.map((o) => o.text.replace(/[\s.;]+$/, "")).join("; ");

/** O que a teoria diz que está errado ou ausente no TAP, com o caminho para corrigir. */
function CharterDiagnosis({ ctx }: { ctx: Ctx }) {
  const { model, people, goTo, t } = ctx;
  const id = useId();
  const c = model.charter;
  const goals = model.governance.goals;
  const same = Boolean(c.sponsorId && c.sponsorId === c.managerId);
  const notSmart = c.objectives.filter((o) => !o.smart);
  const noGoal = c.objectives.filter((o) => !(o.goalId && goals.some((g) => g.id === o.goalId)));

  const items: ReactNode[] = [];
  if (same) items.push(<DiagItem key="same" severity="CRITICO">{t("pm.ini.diag.sameSponsor", { name: nameOf(people, c.sponsorId) })}</DiagItem>);
  if (!c.sponsorId) items.push(<DiagItem key="noSponsor" severity="CRITICO">{t("pm.ini.diag.noSponsor")}</DiagItem>);
  if (!c.managerId) items.push(<DiagItem key="noManager" severity="ATENCAO">{t("pm.ini.diag.noManager")}</DiagItem>);
  if (c.approvedBySponsorAt && (same || !c.sponsorId)) items.push(<DiagItem key="approvedInvalid" severity="CRITICO">{t("pm.ini.diag.approvedInvalid")}</DiagItem>);
  if (!c.approvedBySponsorAt) items.push(<DiagItem key="notApproved" severity="ATENCAO">{t("pm.ini.diag.notApproved")}</DiagItem>);
  if (!c.objectives.length) items.push(<DiagItem key="noObjectives" severity="ATENCAO">{t("pm.ini.diag.noObjectives")}</DiagItem>);
  if (notSmart.length) {
    items.push(
      <DiagItem key="notSmart" severity="ATENCAO">
        {t("pm.ini.diag.notSmart", { n: notSmart.length, list: listOf(notSmart) })}
      </DiagItem>,
    );
  }
  if (noGoal.length) {
    items.push(
      <DiagItem
        key="noGoal"
        severity="ATENCAO"
        action={goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("governanca")}>{t("pm.ini.diag.openCascade")}</Button> : null}
      >
        {t("pm.ini.diag.noGoal", { n: noGoal.length, list: listOf(noGoal) })}
      </DiagItem>,
    );
  }
  if (!items.length) items.push(<DiagItem key="ok" severity="OK">{t("pm.ini.diag.allGood")}</DiagItem>);

  const content: { key: string; ok: boolean }[] = [
    { key: "justification", ok: c.justification.length > 0 },
    { key: "objectives", ok: c.objectives.length > 0 && notSmart.length === 0 },
    { key: "requirements", ok: c.highLevelRequirements.length > 0 },
    { key: "premisesConstraints", ok: c.premises.length > 0 && c.constraints.length > 0 },
    { key: "risks", ok: c.highLevelRisks.length > 0 },
    { key: "milestones", ok: c.milestones.length > 0 },
    { key: "budget", ok: c.summaryBudget > 0 },
    { key: "stakeholders", ok: model.stakeholders.length > 0 },
    { key: "manager", ok: Boolean(c.managerId) },
    { key: "sponsor", ok: Boolean(c.sponsorId) && !same },
  ];
  const filled = content.filter((x) => x.ok).length;

  return (
    <div className="grid content-start gap-[var(--ws-space-3)] rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)]">
      <section aria-labelledby={id} className="grid gap-2" data-testid="tap-diagnosis">
        <h4 id={id} className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("pm.ini.diag.title")}</h4>
        <ul className={cn("grid gap-1.5", BODY_SM)}>{items}</ul>
      </section>
      <div className="grid gap-1.5" data-testid="tap-content">
        <h4 className="flex flex-wrap items-baseline justify-between gap-2 text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">
          <span>{t("pm.ini.content.title")}</span>
          <span className="font-[family-name:var(--ws-font-mono)] font-normal tabular-nums text-ws-text-muted">{t("pm.ini.content.count", { filled, total: content.length })}</span>
        </h4>
        <ul className="grid gap-1 text-[length:var(--ws-text-caption)] @xl:grid-cols-2">
          {content.map((x) => (
            <li key={x.key} className="flex items-start gap-1.5" data-ok={x.ok}>
              <span aria-hidden className={cn("mt-px font-bold", x.ok ? "text-ws-success-ink" : "text-ws-danger-ink")}>{x.ok ? "✓" : "✕"}</span>
              <span className="min-w-0 flex-1 text-ws-text">{t(`pm.ini.content.${x.key}`)}</span>
              <span className="sr-only">{t(x.ok ? "pm.ui.ok" : "pm.ui.pending")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- objetivos SMART

function ObjectivesSection({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, goTo, t, alertAt } = ctx;
  const id = useId();
  const objectives = model.charter.objectives;
  const goals = model.governance.goals;
  const goalOptions = [
    { value: "", label: t("pm.ini.obj.noGoal") },
    ...goals.map((g) => ({ value: g.id, label: t("pm.ini.obj.goalOption", { code: g.code, text: g.text }) })),
  ];
  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-3)]">
      <div className="grid gap-1">
        <SectionTitle id={id}>{t("pm.ini.obj.title")}</SectionTitle>
        <p className={BODY_SM}>{t("pm.ini.obj.subtitle")}</p>
      </div>
      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-2">
          {objectives.length ? (
            <ul className="grid gap-2">
              {objectives.map((o, i) => {
                const goal = o.goalId ? goals.find((g) => g.id === o.goalId) : undefined;
                return (
                  <li key={o.id} data-objective={o.id} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 break-words font-medium text-ws-text">{o.text}</p>
                      {!readOnly ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t("pm.ui.removeItem", { item: o.text })}
                          onClick={() => run({ type: "CHARTER_LIST_REMOVE", list: "objectives", index: i }, "objectives")}
                          className="min-h-0 px-2 py-0"
                        >
                          ×
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {o.smart ? (
                        <Tag tone="success"><span aria-hidden>✓</span>{t("pm.ini.obj.tagSmart")}</Tag>
                      ) : (
                        <Tag tone="warning"><span aria-hidden>!</span>{t("pm.ini.obj.tagNotSmart")}</Tag>
                      )}
                      {goal ? (
                        <Tag tone="success"><span aria-hidden>✓</span>{t("pm.ini.obj.tagAligned", { code: goal.code })}</Tag>
                      ) : (
                        <Tag tone="warning"><span aria-hidden>!</span>{t("pm.ini.obj.tagNoGoal")}</Tag>
                      )}
                    </div>
                    <div className="grid gap-2 @xl:grid-cols-[auto_minmax(0,1fr)] @xl:items-center">
                      <Checkbox
                        checked={o.smart}
                        disabled={readOnly}
                        onCheckedChange={(v) => run({ type: "OBJECTIVE_UPDATE", id: o.id, smart: v }, "objectives")}
                        label={
                          <>
                            {t("pm.ini.obj.smart")}
                            <span className="sr-only"> — {o.text}</span>
                          </>
                        }
                      />
                      <Select
                        aria-label={t("pm.ini.obj.goalOf", { objective: o.text })}
                        value={goal?.id ?? ""}
                        disabled={readOnly}
                        options={goalOptions}
                        onChange={(e) => run({ type: "OBJECTIVE_UPDATE", id: o.id, goalId: e.target.value || null }, "objectives")}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={CAPTION}>{t("pm.ui.noneYet")}</p>
          )}
          {!goals.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className={CAPTION}>{t("pm.ini.obj.noGoalsYet")}</p>
              {goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("governanca")}>{t("pm.ui.goToTab", { tab: t("pm.tab.governanca") })}</Button> : null}
            </div>
          ) : null}
          {!readOnly ? <AddForm label={t("pm.ini.obj.new")} onAdd={(text) => run({ type: "CHARTER_LIST_ADD", list: "objectives", text }, "objectives")} /> : null}
          {alertAt("objectives")}
        </div>
        <div className="grid content-start gap-2">
          <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("pm.ini.smart.title")}</h4>
          <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)] text-ws-text">
            {(["S", "M", "A", "R", "T"] as const).map((l) => (
              <li key={l} className="flex items-start gap-2">
                <span aria-hidden className="w-5 shrink-0 font-[family-name:var(--ws-font-mono)] font-bold text-ws-accent-ink">{l}</span>
                <span className="min-w-0 flex-1">{t(`pm.ini.smart.${l}`)}</span>
              </li>
            ))}
          </ul>
          <Theory refKey="META_SMART">{t("pm.ini.obj.theory")}</Theory>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- business case

function BusinessCaseSection({ ctx }: { ctx: Ctx }) {
  const { model, run, readOnly, t, intl, alertAt } = ctx;
  const id = useId();
  const bc = model.businessCase;
  const flows = bc.cashflows;
  const result = useMemo(() => businessCase(bc.rate, flows), [bc.rate, flows]);
  // por ano, pelo próprio motor: acumulado simples (VPL a 0 %), valor presente do fluxo e acumulado descontado
  const rows = useMemo(
    () =>
      flows.map((cf, year) => ({
        year,
        cf,
        cumulative: npv(0, flows.slice(0, year + 1)),
        present: npv(bc.rate, [...Array<number>(year).fill(0), cf]),
        discounted: npv(bc.rate, flows.slice(0, year + 1)),
      })),
    [bc.rate, flows],
  );
  const enough = flows.length >= 2;
  const setFlows = (cashflows: number[]) => run({ type: "BUSINESS_CASE_UPDATE", patch: { cashflows } }, "bc");
  const years = (v: number | null) => (v === null ? t("pm.ini.bc.noPayback") : t("pm.ini.bc.years", { n: fmt.number(intl, v, 2) }));
  const rateText = fmt.percent(intl, bc.rate, 2);

  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-4)]">
      <div className="grid gap-1">
        <SectionTitle id={id}>{t("pm.ini.bc.title")}</SectionTitle>
        <p className={BODY_SM}>{t("pm.ini.bc.subtitle")}</p>
      </div>
      <div className="grid gap-[var(--ws-space-4)] @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-[var(--ws-space-3)]">
          <CommitNumber
            label={t("pm.ini.bc.rate")}
            hint={t("pm.ini.bc.rateHint")}
            value={Math.round(bc.rate * 10000) / 100}
            min={0}
            max={1000}
            suffix="%"
            disabled={readOnly}
            className="max-w-[22rem]"
            onCommit={(v) => run({ type: "BUSINESS_CASE_UPDATE", patch: { rate: v / 100 } }, "bc")}
          />
          <div className="grid gap-2">
            <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("pm.ini.bc.flows")}</h4>
            <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border">
              <table className="w-full min-w-[38rem] border-collapse text-left text-[length:var(--ws-text-body-sm)]" data-testid="bc-table">
                <caption className="sr-only">{t("pm.ini.bc.caption")}</caption>
                <thead className="bg-ws-surface-2 align-bottom">
                  <tr>
                    <th scope="col" className="p-2 font-semibold">{t("pm.ini.bc.col.year")}</th>
                    <th scope="col" className="p-2 font-semibold">{t("pm.ini.bc.col.flow")}</th>
                    <th scope="col" className="p-2 text-right font-semibold">{t("pm.ini.bc.col.cum")}</th>
                    <th scope="col" className="p-2 text-right font-semibold">{t("pm.ini.bc.col.pv")}</th>
                    <th scope="col" className="p-2 text-right font-semibold">{t("pm.ini.bc.col.cumDisc")}</th>
                    {!readOnly ? <th scope="col" className="p-2"><span className="sr-only">{t("pm.ui.remove")}</span></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.year} className="border-t border-ws-border align-middle">
                      <th scope="row" className="whitespace-nowrap p-2 font-medium">{r.year === 0 ? t("pm.ini.bc.year0") : t("pm.ini.bc.yearN", { n: r.year })}</th>
                      <td className="p-2">
                        {readOnly ? (
                          <span className="whitespace-nowrap tabular-nums">{fmt.money(intl, r.cf)}</span>
                        ) : (
                          <CommitNumber
                            bare
                            label={t("pm.ini.bc.flowOf", { n: r.year })}
                            value={r.cf}
                            onCommit={(v) => setFlows(flows.map((x, i) => (i === r.year ? v : x)))}
                            className="min-h-[var(--ws-control-sm)] w-[8.5rem] min-w-[7rem]"
                          />
                        )}
                      </td>
                      <td className={cn("whitespace-nowrap p-2 text-right tabular-nums", r.cumulative < 0 ? "text-ws-danger-ink" : "text-ws-text")}>{fmt.money(intl, r.cumulative)}</td>
                      <td className="whitespace-nowrap p-2 text-right tabular-nums">{fmt.money(intl, r.present)}</td>
                      <td className={cn("whitespace-nowrap p-2 text-right tabular-nums", r.discounted < 0 ? "text-ws-danger-ink" : "text-ws-text")}>{fmt.money(intl, r.discounted)}</td>
                      {!readOnly ? (
                        <td className="p-2 text-right">
                          {r.year > 0 ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={t("pm.ini.bc.removeYear", { n: r.year })}
                              onClick={() => setFlows(flows.filter((_, i) => i !== r.year))}
                              className="min-h-0 px-2 py-0"
                            >
                              ×
                            </Button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!readOnly ? (
              <div>
                <Button size="sm" onClick={() => setFlows([...flows, 0])}>{t("pm.ini.bc.addYear")}</Button>
              </div>
            ) : null}
            {flows.length > 0 && (flows[0] ?? 0) >= 0 ? <p className="text-[length:var(--ws-text-caption)] text-ws-warning-ink"><span aria-hidden>! </span>{t("pm.ini.bc.year0Positive")}</p> : null}
            {alertAt("bc")}
          </div>
          <div className="grid gap-1.5">
            <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("pm.ini.bc.benefits")}</h4>
            <EditableList
              items={bc.benefits}
              readOnly={readOnly}
              label={t("pm.ini.bc.newBenefit")}
              onAdd={(text) => {
                const clean = text.replace(/\s+/g, " ").trim();
                if (clean) run({ type: "BUSINESS_CASE_UPDATE", patch: { benefits: [...bc.benefits, clean] } }, "benefits");
              }}
              onRemove={(index) => run({ type: "BUSINESS_CASE_UPDATE", patch: { benefits: bc.benefits.filter((_, i) => i !== index) } }, "benefits")}
            />
            {alertAt("benefits")}
          </div>
        </div>

        <section aria-label={t("pm.ini.bc.result")} className="grid content-start gap-[var(--ws-space-3)]" data-testid="bc-result">
          <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("pm.ini.bc.result")}</h4>
          {enough ? (
            <>
              <dl className="grid gap-2 @md:grid-cols-2">
                <Stat testId="bc-npv" label={t("pm.ini.bc.npv")} value={fmt.money(intl, result.npv)} formula={t("pm.ini.bc.formula.npv")} />
                <Stat testId="bc-irr" label={t("pm.ini.bc.irr")} value={result.irr === null ? t("pm.ini.bc.noIrr") : fmt.percent(intl, result.irr, 1)} formula={t("pm.ini.bc.formula.irr")} />
                <Stat testId="bc-payback" label={t("pm.ini.bc.payback")} value={years(result.payback)} formula={t("pm.ini.bc.formula.payback")} />
                <Stat testId="bc-dpayback" label={t("pm.ini.bc.discountedPayback")} value={years(result.discountedPayback)} formula={t("pm.ini.bc.formula.discountedPayback")} />
                <Stat testId="bc-roi" label={t("pm.ini.bc.roi")} value={fmt.percent(intl, result.roi, 1)} formula={t("pm.ini.bc.formula.roi")} />
              </dl>
              <div className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]" data-testid="bc-verdict">
                <span>
                  {result.viable ? (
                    <Tag tone="success"><span aria-hidden>✓</span>{t("pm.ini.bc.viableTag")}</Tag>
                  ) : (
                    <Tag tone="danger"><span aria-hidden>✕</span>{t("pm.ini.bc.notViableTag")}</Tag>
                  )}
                </span>
                <p>{result.viable ? t("pm.ini.bc.viable") : t("pm.ini.bc.notViable", { rate: rateText })}</p>
                {result.irr !== null ? (
                  <p className="text-ws-text-muted">
                    {t(result.irr > bc.rate ? "pm.ini.bc.irrAbove" : "pm.ini.bc.irrBelow", { irr: fmt.percent(intl, result.irr, 1), rate: rateText })}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-warning-ink"><span aria-hidden>! </span>{t("pm.ini.bc.needTwo")}</p>
          )}
          <Theory refKey="BUSINESS_CASE_VPL">{t("pm.ini.bc.theory")}</Theory>
        </section>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- portão da Demanda

function DemandGateSection({ ctx }: { ctx: Ctx }) {
  const { model, goTo, decia, t, intl } = ctx;
  const id = useId();
  const checks = evaluateGate(model, "DEMANDA");
  const missing = checks.filter((c) => !c.ok);
  const passed = checks.length - missing.length;
  const gate = model.gates.find((g) => g.phase === "DEMANDA");
  const decided = Boolean(gate && gate.outcome !== "PENDENTE");
  return (
    <Card as="section" aria-labelledby={id} className="grid gap-[var(--ws-space-3)]">
      <div className="grid gap-1">
        <SectionTitle
          id={id}
          actions={
            <Tag tone={missing.length ? "warning" : "success"} className="tabular-nums">
              <span aria-hidden>{missing.length ? "!" : "✓"}</span>
              {t("pm.ini.gate.count", { passed, total: checks.length })}
            </Tag>
          }
        >
          {t("pm.ini.gate.title")}
        </SectionTitle>
        <p className={BODY_SM}>{t("pm.ini.gate.subtitle")}</p>
      </div>
      <div className="grid gap-[var(--ws-space-4)] @2xl:grid-cols-2">
        <div className="grid content-start gap-1.5">
          <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("pm.ini.gate.criteria")}</h4>
          <GateChecklist model={model} phase="DEMANDA" />
        </div>
        <div className="grid content-start gap-1.5" data-testid="gate-missing">
          <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{t("pm.ini.gate.missing")}</h4>
          {missing.length ? (
            <ul className={cn("grid gap-1.5", BODY_SM)}>
              {missing.map((c) => {
                const tab = GATE_FIX_TAB[c.id];
                return (
                  <DiagItem
                    key={c.id}
                    severity="ATENCAO"
                    action={tab && goTo ? <Button size="sm" variant="ghost" onClick={() => goTo(tab)}>{t("pm.ui.goToTab", { tab: t(`pm.tab.${tab}`) })}</Button> : null}
                  >
                    {t(`pm.ini.gate.fix.${c.id}`)}
                  </DiagItem>
                );
              })}
            </ul>
          ) : (
            <p className={BODY_SM}>{t("pm.ini.gate.allOk")}</p>
          )}
        </div>
      </div>
      <div className="grid gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]" data-testid="gate-decision">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ws-text">{t("pm.ini.gate.decision")}</span>
          <Tag tone={decided ? "accent" : "neutral"}>{t(`pm.gateOutcome.${gate?.outcome ?? "PENDENTE"}`)}</Tag>
          {gate?.decidedAt ? <span className={cn(CAPTION, "tabular-nums")}>{fmt.date(intl, gate.decidedAt)}</span> : null}
        </div>
        {gate?.notes ? <p className="text-ws-text-muted">{gate.notes}</p> : null}
        {decided && !gate?.decisionId ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ws-danger-ink"><span aria-hidden>✕ </span>{t("pm.ini.gate.noRecord")}</p>
            {goTo ? <Button size="sm" variant="ghost" onClick={() => goTo("governanca")}>{t("pm.ui.goToTab", { tab: t("pm.tab.governanca") })}</Button> : null}
          </div>
        ) : null}
        {gate?.decisionId ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ws-success-ink"><span aria-hidden>✓ </span>{t("pm.ini.gate.recorded")}</p>
            {decia ? <Link href={decia.decisionHref(gate.decisionId)}>{t("pm.ui.openInDecia")}</Link> : null}
          </div>
        ) : null}
        {!decided && !gate?.decisionId ? <p className="text-ws-text-muted">{t("pm.ini.gate.notDecided")}</p> : null}
      </div>
      <Theory refKey="PORTAO_DE_FASE">{t("pm.ini.gate.theory")}</Theory>
    </Card>
  );
}
