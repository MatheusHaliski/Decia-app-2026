"use client";
/**
 * Aba "Encerramento" da Mesa de Trabalho (RF22) — aula de projetos, Tema 5, e transição de serviço do ITIL (aula de governança,
 * TE5). Encerrar é FORMALIZAR (aceite, contratos, recursos, relatório final, arquivamento), inclusive quando o projeto é cancelado;
 * o produto vira serviço com SLA × OLA × UC coerentes, catálogo, base de conhecimento e CMDB; o portão final é decidido no DECIA;
 * o relatório final é montado a partir do próprio modelo. Arquivar deixa o projeto somente leitura (RF22.CA06); reabrir continua
 * permitido — é o único comando que o núcleo aceita num projeto arquivado.
 */
import { useMemo, useState } from "react";
import { Button, Card, Checkbox, Dialog, Link, PercentBar, Tag, cn } from "@/components/ui";
import { CommitNumber, CommitText, GateChecklist, SectionTitle, Theory } from "@/components/projects/common";
import { fmt, type DeciaActions, type PanelProps, type PeopleDirectory } from "@/components/projects/shared";
import { useI18n } from "@/lib/i18n/useI18n";
import { agreementProblems } from "@/lib/projects/engine/methods";
import { offsetToDate } from "@/lib/projects/engine/schedule";
import { evaluateGate } from "@/lib/projects/metrics";
import { PROJECT_PHASES, type Closure, type ProjectModel } from "@/lib/projects/types";
import { evmView, timelineView, traceabilityView } from "@/lib/projects/views";
import { ErrorNote, LessonComposer, LessonsByPhase, TabMetrics, useSend } from "./ControlPanel";

type T = (key: string, vars?: Record<string, string | number>) => string;
type Dispatch = PanelProps["dispatch"];
type Service = NonNullable<Closure["service"]>;

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const LABEL = "font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted";
const BODY_SM = "text-[length:var(--ws-text-body-sm)]";

/** Os quatro passos do encerramento formal (o arquivamento é a ação final, à parte). */
const FORMAL_STEPS = ["acceptance", "contractsClosed", "resourcesReleased", "finalReport"] as const;
const AGREEMENTS = ["sla", "ola", "uc"] as const;
const HOURS_KEY = { sla: "slaHours", ola: "olaHours", uc: "ucHours" } as const;
const SERVICE_FLAGS = ["catalogEntry", "knowledgeBase", "cmdbUpdated"] as const;
const NO_SERVICE: Service = { catalogEntry: false, knowledgeBase: false, cmdbUpdated: false };

const closurePatch = (k: (typeof FORMAL_STEPS)[number], v: boolean) => ({ [k]: v }) as Partial<Closure>;
const servicePatch = (k: keyof Service, v: number | boolean) => ({ [k]: v }) as Partial<Service>;

// ------------------------------------------------------------------ encerramento formal e arquivamento

function FormalSection({ model, dispatch, locked, reopenable }: { model: ProjectModel; dispatch: Dispatch; locked: boolean; reopenable: boolean }) {
  const { t } = useI18n();
  const { send, error } = useSend(dispatch);
  const [confirm, setConfirm] = useState(false);
  const c = model.closure;
  const done = FORMAL_STEPS.filter((s) => c[s]).length;
  const pending = evaluateGate(model, "ENCERRAMENTO").filter((x) => !x.ok);
  return (
    <Card as="section" aria-labelledby="close-formal" className="grid content-start gap-3">
      <SectionTitle id="close-formal" actions={c.cancelledReason ? <Tag tone="warning">{t("pm.close.cancel.tag")}</Tag> : null}>{t("pm.close.formal.title")}</SectionTitle>
      <PercentBar value={(done / FORMAL_STEPS.length) * 100} label={t("pm.close.formal.progress", { done, total: FORMAL_STEPS.length })} tone={done === FORMAL_STEPS.length ? "success" : "accent"} />
      <div className="grid gap-1">
        {FORMAL_STEPS.map((s) => (
          <Checkbox key={s} checked={c[s]} disabled={locked} label={t(`pm.close.formal.${s}`)} hint={t(`pm.close.formal.${s}Hint`)}
            onCheckedChange={(v) => send({ type: "CLOSURE_UPDATE", patch: closurePatch(s, v) })} />
        ))}
      </div>
      <CommitText
        multiline
        className="content-start"
        label={t("pm.close.cancel.label")}
        hint={t("pm.close.cancel.hint")}
        value={c.cancelledReason ?? ""}
        disabled={locked}
        onCommit={(v) => send({ type: "CLOSURE_UPDATE", patch: { cancelledReason: v.trim() || undefined } })}
      />

      <div className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)]" data-archived={c.archived}>
        <p className={cn(BODY_SM, "font-semibold")}>{t("pm.close.archive.title")}</p>
        <p className={BODY_SM}>{t(c.archived ? "pm.close.archive.archived" : "pm.close.archive.active")}</p>
        {!locked ? (
          <div>
            <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>{t("pm.close.archive.button")}</Button>
          </div>
        ) : null}
        {reopenable ? (
          <div className="grid gap-1">
            <div>
              <Button size="sm" variant="primary" onClick={() => send({ type: "CLOSURE_UPDATE", patch: { archived: false } })}>{t("pm.close.archive.reopen")}</Button>
            </div>
            <p className={CAPTION}>{t("pm.close.archive.reopenHint")}</p>
          </div>
        ) : null}
      </div>
      <ErrorNote error={error} />
      <Theory refKey="CLOSE_FORMAL">{t("pm.close.formal.theory")}</Theory>

      <Dialog open={confirm} onOpenChange={setConfirm} title={t("pm.close.archive.dialogTitle")} description={t("pm.close.archive.dialogBody")}>
        <div className="grid gap-3">
          {pending.length ? (
            <div className="grid gap-1">
              <p className={cn(BODY_SM, "font-semibold")}>{t("pm.close.archive.pending")}</p>
              <ul className="grid gap-0.5 text-[length:var(--ws-text-body-sm)]">
                {pending.map((x) => (
                  <li key={x.id} className="flex gap-1.5">
                    <span aria-hidden className="font-bold text-ws-danger-ink">✕</span>
                    {t(`pm.gate.${x.id}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={cn(BODY_SM, "text-ws-success-ink")}><span aria-hidden>✓ </span>{t("pm.close.archive.ready")}</p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setConfirm(false)}>{t("pm.ui.cancel")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                send({ type: "CLOSURE_UPDATE", patch: { archived: true } });
                setConfirm(false);
              }}
            >
              {t("pm.close.archive.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

// ------------------------------------------------------------------ portão do Encerramento (governança no DECIA)

function GateSection({ model, locked, decia }: { model: ProjectModel; locked: boolean; decia?: DeciaActions }) {
  const { t } = useI18n();
  const checks = evaluateGate(model, "ENCERRAMENTO");
  const ok = checks.filter((c) => c.ok).length;
  const gate = model.gates.find((g) => g.phase === "ENCERRAMENTO");
  const inPhase = model.currentPhase === "ENCERRAMENTO";
  const deciaStatus = gate?.decisionId ? decia?.decisionStatus(gate.decisionId) : undefined;
  const canReview = inPhase && !locked && decia && (!gate?.decisionId || gate.outcome === "SUSPENSO");
  return (
    <Card as="section" aria-labelledby="close-gate" className="grid content-start gap-3">
      <SectionTitle id="close-gate">{t("pm.close.gate.title")}</SectionTitle>
      <p className={CAPTION}>{t("pm.close.gate.count", { ok, total: checks.length })}</p>
      <GateChecklist model={model} phase="ENCERRAMENTO" />
      {gate ? <p className={BODY_SM}>{t("pm.close.gate.outcome", { outcome: t(`pm.gateOutcome.${gate.outcome}`) })}</p> : null}
      {gate?.decisionId ? (
        <div className="flex flex-wrap items-center gap-2">
          {decia ? <Link href={decia.decisionHref(gate.decisionId)}>{t("pm.ui.openInDecia")}</Link> : null}
          {deciaStatus ? <Tag tone="info">{t(`decia.status.${deciaStatus}`)}</Tag> : null}
        </div>
      ) : null}
      {canReview ? (
        <div>
          <Button variant="primary" icon="sessao-decia" onClick={() => decia?.openGate("ENCERRAMENTO")}>{t("pm.close.gate.review")}</Button>
        </div>
      ) : !inPhase ? (
        <p className={CAPTION}>{t("pm.close.gate.notYet", { phase: t(`pm.phase.${model.currentPhase}`) })}</p>
      ) : null}
      <Theory refKey="PORTAO_DE_FASE">{t("pm.close.gate.theory")}</Theory>
    </Card>
  );
}

// ------------------------------------------------------------------ transição para a operação (ITIL)

function ServiceSection({ model, dispatch, locked }: { model: ProjectModel; dispatch: Dispatch; locked: boolean }) {
  const { t, intl } = useI18n();
  const { send, error } = useSend(dispatch);
  const sv = model.closure.service;
  // CLOSURE_UPDATE troca o objeto `service` inteiro: mescla com o atual para não perder os outros campos
  const update = (patch: Partial<Service>) => send({ type: "CLOSURE_UPDATE", patch: { service: { ...(sv ?? NO_SERVICE), ...patch } } });
  const hours: Record<(typeof AGREEMENTS)[number], number | undefined> = { sla: sv?.slaHours, ola: sv?.olaHours, uc: sv?.ucHours };
  const problems = agreementProblems(hours.sla, hours.ola, hours.uc);
  const max = Math.max(1, ...AGREEMENTS.map((k) => hours[k] ?? 0));
  const h = (v: number | undefined) => (v === undefined ? "—" : fmt.number(intl, v, 1));
  const state = (k: (typeof AGREEMENTS)[number]) => {
    if (hours[k] === undefined) return "unset";
    if (k === "sla") return "reference";
    if (hours.sla === undefined) return "unknown";
    return problems.includes(k === "ola" ? "OLA_MENOS_RIGIDO_QUE_SLA" : "UC_MENOS_RIGIDO_QUE_SLA") ? "bad" : "good";
  };
  return (
    <Card as="section" aria-labelledby="close-service" className="grid gap-[var(--ws-space-4)]">
      <SectionTitle id="close-service">{t("pm.close.service.title")}</SectionTitle>
      <p className={cn(BODY_SM, "max-w-prose text-ws-text-muted")}>{t("pm.close.service.intro")}</p>
      {model.closure.cancelledReason ? <p className={cn(BODY_SM, "text-ws-warning-ink")}>{t("pm.close.service.cancelled")}</p> : null}
      <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-3">
          {AGREEMENTS.map((k) => (
            <CommitNumber key={k} label={t(`pm.close.service.${k}`)} hint={t(`pm.close.service.${k}Hint`)} value={hours[k]} min={0} suffix={t("pm.close.service.hoursUnit")}
              disabled={locked} className="content-start" onCommit={(v) => update(servicePatch(HOURS_KEY[k], v))} />
          ))}
        </div>
        <div className="grid content-start gap-3">
          <figure className="grid gap-2">
            <figcaption className={cn(CAPTION, "font-semibold")}>{t("pm.close.service.compareTitle")}</figcaption>
            <ul className="grid gap-1.5">
              {AGREEMENTS.map((k) => {
                const s = state(k);
                return (
                  <li key={k} data-agreement={k} data-state={s} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 sm:grid-cols-[3rem_minmax(0,1fr)_auto]">
                    <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] font-bold">{t(`pm.close.service.short.${k}`)}</span>
                    <span aria-hidden className="h-2.5 overflow-hidden rounded-[var(--ws-radius-pill)] bg-ws-surface-3">
                      <span
                        className={cn("block h-full rounded-[var(--ws-radius-pill)]", s === "bad" ? "bg-ws-danger" : s === "good" ? "bg-ws-success" : "bg-ws-accent")}
                        style={{ width: `${((hours[k] ?? 0) / max) * 100}%` }}
                      />
                    </span>
                    <span className={cn("col-start-2 text-[length:var(--ws-text-caption)] tabular-nums sm:col-start-auto", s === "bad" ? "font-semibold text-ws-danger-ink" : "text-ws-text-muted")}>
                      {t("pm.close.service.hoursValue", { h: h(hours[k]) })} · <span aria-hidden>{s === "bad" ? "✕ " : s === "good" ? "✓ " : ""}</span>
                      {t(`pm.close.service.state.${s}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </figure>
          {hours.sla === undefined ? (
            <p className={CAPTION}>{t("pm.close.service.noSla")}</p>
          ) : problems.length ? (
            <ul className="grid gap-1.5" data-agreement-problems>
              {problems.map((p) => (
                <li key={p} className="rounded-[var(--ws-radius-sm)] bg-ws-danger-soft px-2 py-1.5 text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">
                  <span aria-hidden>✕ </span>
                  {t(`pm.close.service.problem.${p}`, { sla: h(hours.sla), ola: h(hours.ola), uc: h(hours.uc) })}
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn(BODY_SM, "text-ws-success-ink")}><span aria-hidden>✓ </span>{t("pm.close.service.ok")}</p>
          )}
          <Theory refKey="SLA_OLA_UC">{t("pm.close.service.theory")}</Theory>
        </div>
      </div>
      <div className="grid gap-2 border-t border-ws-border pt-[var(--ws-space-3)]">
        <p className={LABEL}>{t("pm.close.service.handover")}</p>
        <div className="grid gap-x-4 md:grid-cols-3">
          {SERVICE_FLAGS.map((f) => (
            <Checkbox key={f} checked={sv?.[f] ?? false} disabled={locked} label={t(`pm.close.service.${f}`)} hint={t(`pm.close.service.${f}Hint`)} onCheckedChange={(v) => update(servicePatch(f, v))} />
          ))}
        </div>
        <Theory refKey="CLOSE_TRANSICAO">{t("pm.close.service.transitionTheory")}</Theory>
      </div>
      <ErrorNote error={error} />
    </Card>
  );
}

// ------------------------------------------------------------------ relatório final (montado a partir do modelo)

interface ReportPart { id: string; title: string; lines: string[] }

function finalReport(model: ProjectModel, t: T, intl: string): { heading: string; subtitle: string; sections: ReportPart[]; text: string } {
  const tl = timelineView(model);
  const e = evmView(model);
  const trace = traceabilityView(model);
  const num = (v: number) => fmt.number(intl, v, 1);
  const money = (v: number | null) => fmt.money(intl, v);
  const index = (v: number | null) => (v === null ? "—" : new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v));
  const yesNo = (b: boolean) => t(b ? "pm.close.report.yes" : "pm.close.report.no");
  const count = <X,>(xs: readonly X[], p: (x: X) => boolean) => xs.filter(p).length;

  const schedule = !tl.ok
    ? [t("pm.close.report.scheduleCycle")]
    : tl.baselineFinish === undefined
      ? [t("pm.close.report.scheduleNoBaseline", { finish: num(tl.finish), date: fmt.date(intl, tl.finishDate) })]
      : [t("pm.close.report.scheduleLine", {
          finish: num(tl.finish),
          date: fmt.date(intl, tl.finishDate),
          baseline: num(tl.baselineFinish),
          baselineDate: fmt.date(intl, offsetToDate(model.startDate, tl.baselineFinish)),
          delta: new Intl.NumberFormat(intl, { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(tl.finish - tl.baselineFinish),
        })];
  const cost = [
    t("pm.close.report.costLine", { ac: money(e.ac), bac: money(e.bac), eac: money(e.eac), vac: money(e.vac) }),
    t("pm.close.report.indexLine", {
      cpi: index(e.cpi), spi: index(e.spi),
      cost: e.cost ? t(`pm.costVerdict.${e.cost}`) : "—", schedule: e.schedule ? t(`pm.scheduleVerdict.${e.schedule}`) : "—",
    }),
  ];
  const ch = model.changes;
  const scope = [
    t("pm.close.report.requirements", { complete: count(trace.rows, (r) => r.complete), total: trace.rows.length }),
    t("pm.close.report.changes", {
      approved: count(ch, (c) => c.status === "APROVADA"),
      implemented: count(ch, (c) => c.status === "IMPLEMENTADA"),
      rejected: count(ch, (c) => c.status === "REJEITADA"),
      open: count(ch, (c) => c.status === "SOLICITADA" || c.status === "EM_ANALISE"),
    }),
  ];
  const rk = model.risks;
  const risks = [
    t("pm.close.report.riskLine", {
      occurred: count(rk, (r) => r.status === "OCORREU"), mitigated: count(rk, (r) => r.status === "MITIGADO"),
      open: count(rk, (r) => r.status === "ABERTO"), closed: count(rk, (r) => r.status === "ENCERRADO"),
    }),
  ];
  const ls = model.lessons;
  const lessons = [
    t("pm.close.report.lessonsLine", {
      total: ls.length, positive: count(ls, (l) => l.kind === "POSITIVA"), negative: count(ls, (l) => l.kind === "NEGATIVA"), phases: new Set(ls.map((l) => l.phase)).size,
    }),
    ...PROJECT_PHASES.flatMap((p) => ls.filter((l) => l.phase === p).map((l) => t("pm.close.report.lessonItem", { phase: t(`pm.phase.${p}`), kind: t(`pm.lessonKind.${l.kind}`), text: l.text }))),
  ];
  const c = model.closure;
  const sv = c.service;
  const hours = (v: number | undefined) => (v === undefined ? "—" : num(v));
  const closure = [
    t("pm.close.report.closureLine", { acceptance: yesNo(c.acceptance), contracts: yesNo(c.contractsClosed), resources: yesNo(c.resourcesReleased), report: yesNo(c.finalReport) }),
    ...(c.cancelledReason ? [t("pm.close.report.cancelled", { reason: c.cancelledReason })] : []),
    ...(sv
      ? [t("pm.close.report.serviceLine", {
          sla: hours(sv.slaHours), ola: hours(sv.olaHours), uc: hours(sv.ucHours),
          catalog: yesNo(sv.catalogEntry), knowledge: yesNo(sv.knowledgeBase), cmdb: yesNo(sv.cmdbUpdated),
        })]
      : []),
    ...(c.archived ? [t("pm.close.report.archived")] : []),
  ];
  const sections: ReportPart[] = [
    { id: "schedule", title: t("pm.close.report.schedule"), lines: schedule },
    { id: "cost", title: t("pm.close.report.cost"), lines: cost },
    { id: "scope", title: t("pm.close.report.scope"), lines: scope },
    { id: "risks", title: t("pm.close.report.risks"), lines: risks },
    { id: "lessons", title: t("pm.close.report.lessons"), lines: lessons },
    { id: "closure", title: t("pm.close.report.closure"), lines: closure },
  ];
  const heading = t("pm.close.report.heading", { title: model.title });
  const subtitle = t("pm.close.report.asOf", { date: fmt.date(intl, model.statusDate), phase: t(`pm.phase.${model.currentPhase}`) });
  const text = [heading, subtitle, "", ...sections.flatMap((s) => [s.title, ...s.lines.map((l) => `- ${l}`), ""])].join("\n").trim();
  return { heading, subtitle, sections, text };
}

function ReportSection({ model }: { model: ProjectModel }) {
  const { t, intl } = useI18n();
  const report = useMemo(() => finalReport(model, t, intl), [model, t, intl]);
  const [copy, setCopy] = useState<"idle" | "ok" | "fail">("idle");
  const copyReport = async () => {
    try {
      // jsdom e navegadores sem permissão não têm a área de transferência: cai no aviso para copiar à mão
      const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
      if (!clipboard?.writeText) throw new Error("clipboard");
      await clipboard.writeText(report.text);
      setCopy("ok");
    } catch {
      setCopy("fail");
    }
  };
  return (
    <Card as="section" aria-labelledby="close-report" className="grid gap-3">
      <SectionTitle id="close-report" actions={<Button size="sm" onClick={() => void copyReport()}>{t("pm.close.report.copy")}</Button>}>{t("pm.close.report.title")}</SectionTitle>
      <p className={CAPTION}>{t("pm.close.report.intro")}</p>
      <p role="status" aria-live="polite" className={cn(BODY_SM, copy === "fail" ? "text-ws-warning-ink" : "text-ws-success-ink")}>
        {copy === "ok" ? t("pm.close.report.copied") : copy === "fail" ? t("pm.close.report.copyFailed") : ""}
      </p>
      <article aria-label={report.heading} data-report className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-4)]">
        <header className="grid gap-0.5">
          <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body-lg)] font-semibold">{report.heading}</p>
          <p className={CAPTION}>{report.subtitle}</p>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          {report.sections.map((s) => (
            <section key={s.id} aria-label={s.title} data-report-section={s.id} className="grid content-start gap-1">
              <h4 className={LABEL}>{s.title}</h4>
              <ul className={cn(BODY_SM, "grid list-disc gap-0.5 pl-5 tabular-nums")}>
                {s.lines.map((l, i) => (
                  <li key={i} className="break-words">{l}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </Card>
  );
}

// ------------------------------------------------------------------ lições aprendidas (lista completa)

function LessonsSection({ model, dispatch, people, locked }: { model: ProjectModel; dispatch: Dispatch; people: PeopleDirectory; locked: boolean }) {
  const { t } = useI18n();
  return (
    <Card as="section" aria-labelledby="close-lessons" className="grid gap-3">
      <SectionTitle id="close-lessons">{t("pm.close.lessons.title")}</SectionTitle>
      <p className={CAPTION}>{t("pm.close.lessons.intro", { n: model.lessons.length })}</p>
      <LessonsByPhase model={model} people={people} splitByKind />
      {!locked ? <LessonComposer model={model} dispatch={dispatch} /> : null}
      <Theory refKey="LICOES_AO_LONGO">{t("pm.close.lessons.theory")}</Theory>
    </Card>
  );
}

// ------------------------------------------------------------------ painel

export interface ClosurePanelProps extends PanelProps {
  /**
   * Quem pode reabrir um projeto arquivado. A área de trabalho costuma passar `readOnly` também por causa do arquivamento
   * (RF22.CA06); reabrir continua permitido para quem tem edição — passe `canReopen` com essa permissão. Padrão: `!readOnly`.
   */
  canReopen?: boolean;
}

export function ClosurePanel({ canReopen, ...props }: ClosurePanelProps) {
  const { model, dispatch, people, readOnly, decia } = props;
  const { t } = useI18n();
  const archived = model.closure.archived;
  // arquivado = somente leitura (o núcleo recusa alteração estrutural); só "reabrir" continua disponível
  const locked = readOnly || archived;
  const reopenable = archived && (canReopen ?? !readOnly);
  return (
    <div className="grid gap-[var(--ws-space-5)]" data-panel="encerramento">
      <header className="grid gap-1">
        <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-[var(--ws-text-h2--lh)] text-ws-text">{t("pm.close.title")}</h2>
        <p className={cn(BODY_SM, "max-w-prose text-ws-text-muted")}>{t("pm.close.intro")}</p>
      </header>
      {locked ? (
        <p role="note" className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text">
          {t(archived ? "pm.close.archive.archived" : "pm.ui.readOnly")}
        </p>
      ) : null}
      <TabMetrics model={model} tab="encerramento" />
      <div className="grid gap-[var(--ws-space-5)] lg:grid-cols-2">
        <FormalSection model={model} dispatch={dispatch} locked={locked} reopenable={reopenable} />
        <GateSection model={model} locked={locked} decia={decia} />
      </div>
      <ServiceSection model={model} dispatch={dispatch} locked={locked} />
      <LessonsSection model={model} dispatch={dispatch} people={people} locked={locked} />
      <ReportSection model={model} />
    </div>
  );
}
