"use client";
/**
 * Visão geral do projeto (`/projects/[id]`): resumo (objetivo, fase, área, abordagem, versão, origem do esquema com o crédito aos
 * modelos), indicadores do motor — término pelo caminho crítico, % concluído, prazo e estouro, IDC/IDP do valor agregado,
 * probabilidade do PERT, riscos abertos e achados do feedback — o ciclo de vida com a fase atual, as últimas versões e os
 * atalhos para a Mesa, o Simulador e o Espelho. Números do sistema (D-12); dados DEMO da aba até a API de projetos.
 */
import type { ReactNode } from "react";
import { Badge, Button, Card, EmptyState, LoadingState, PercentBar, Tag, cn } from "@/components/ui";
import { useMounted } from "@/components/decia";
import { RfPage } from "@/components/shell/RfPage";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { todayIso } from "@/lib/projects/autopilot/dates";
import { summarizeProject } from "@/lib/projects/autopilot/overview";
import { DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import { demoProjectRepository, useProject, type ProjectRepository } from "@/lib/projects/repository";
import { PROJECT_PHASES, type ProjectModel } from "@/lib/projects/types";
import { versionSummary } from "../common";
import { fmt, nameOf } from "../shared";

const PAGE = pageByRoute("/projects/[id]")!;

export function ProjectOverviewPage({ projectId, repo, today }: { projectId: string; repo?: ProjectRepository; today?: string }) {
  const { t } = useI18n();
  const mounted = useMounted();
  const model = useProject(projectId, repo ?? demoProjectRepository());
  const actions = (
    <>
      <Button variant="primary" icon="mesa" href={`/projects/${projectId}/edit`}>{t("pm.ws.openWorkspace")}</Button>
      <Button href={`/projects/${projectId}/simulate`} icon="hype">{t("projectPage.simulate")}</Button>
      <Button href={`/projects/${projectId}/mirror`} icon="insights-ia">{t("projectPage.mirror")}</Button>
    </>
  );
  return (
    <RfPage page={PAGE} subtitle={mounted && model ? model.title : projectId} actions={actions} noEmpty>
      {!mounted ? <LoadingState /> : model ? <ProjectOverview model={model} today={today ?? todayIso(new Date())} source={(repo ?? demoProjectRepository()).source} /> : (
        <EmptyState
          title={t("projectPage.notFound")}
          description={t("projectPage.notFoundDesc")}
          action={<div className="flex flex-wrap justify-center gap-2"><Button variant="primary" href={`/projects/${DEMO_PROJECT_ID}`}>{t("pm.ws.openDemo")}</Button><Button href="/projects/new">{t("projectPage.create")}</Button></div>}
        />
      )}
    </RfPage>
  );
}

export function ProjectOverview({ model, today, source = "DEMO" }: { model: ProjectModel; today: string; source?: "DEMO" | "API" }) {
  const { t, intl } = useI18n();
  const s = summarizeProject(model, today);
  const objective = model.charter.objectives[0]?.text || model.charter.product;
  const versions = [...model.versions].sort((a, b) => b.number - a.number).slice(0, 5);
  const when = new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" });
  const currentIdx = PROJECT_PHASES.indexOf(model.currentPhase);
  const indicator = (key: string, value: ReactNode, detail?: ReactNode) => (
    <div className="grid content-start gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" data-indicator={key}>
      <dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`projectPage.ind.${key}`)}</dt>
      <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-body-lg)] tabular-nums">{value}</dd>
      {detail ? <dd className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{detail}</dd> : null}
    </div>
  );
  return (
    <div className="grid gap-[var(--ws-space-5)]" data-project-overview={model.id}>
      <Card as="section" aria-labelledby="po-summary" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="po-summary" className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectPage.summary")}</h2>
          {source === "DEMO" ? <Badge tone="warning" title={t("pm.ws.demoHint")}>DEMO</Badge> : null}
        </div>
        {objective ? <p className="max-w-prose text-[length:var(--ws-text-body)]">{objective}</p> : <p className="text-ws-text-muted">{t("projectPage.noObjective")}</p>}
        <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
          <Tag tone="accent" filled>{t("pm.ws.phase", { phase: t(`pm.phase.${model.currentPhase}`) })}</Tag>
          <Tag tone="blue">{t(`tasks.area.${model.area ?? "SOFTWARE"}`)}</Tag>
          <Tag>{t(`pm.approach.${model.approach}`)}</Tag>
          <Tag>{t("pm.ws.version", { n: model.version })}</Tag>
        </div>
        {model.origin?.kind === "AUTOPILOTO" ? (
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]" data-origin="AUTOPILOTO">
            <Badge tone="spark"><span aria-hidden>✦ </span>{t("deskHome.card.fromAutopilot")}</Badge>
            <span>{t("pm.v.autopilotCreated", { source: model.origin.label ?? "—" })}</span>
          </p>
        ) : model.origin?.kind === "MODELO" ? <p className="text-[length:var(--ws-text-body-sm)]">{t("pm.v.projectFromTemplate", { template: model.origin.label ?? "—" })}</p> : null}
        {model.origin?.credits?.length ? (
          <div className="grid gap-1 text-[length:var(--ws-text-caption)]">
            <p className="font-semibold">{t("autopilot.scheme.credits")}</p>
            <ul className="flex flex-wrap gap-1.5">{model.origin.credits.map((c) => <li key={c.id}><Tag>{c.title}</Tag></li>)}</ul>
          </div>
        ) : null}
      </Card>

      <section aria-labelledby="po-indicators" className="grid gap-2">
        <h2 id="po-indicators" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectPage.indicators")}</h2>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectPage.indicatorsHint")}</p>
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid content-start gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" data-indicator="progress">
            <dt className="sr-only">{t("projectPage.ind.progress")}</dt>
            <dd><PercentBar value={s.progress} label={t("projectPage.ind.progress")} /></dd>
            <dd className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("deskHome.card.progress", { done: s.tasks.done, total: s.tasks.total })}</dd>
          </div>
          {indicator("finish", s.finish ? t("projectPage.ind.finishValue", { days: fmt.number(intl, s.finish.days, 1), date: fmt.date(intl, s.finish.date) }) : "—",
            s.finish?.criticalCodes.length ? t("projectPage.ind.criticalPath", { path: s.finish.criticalCodes.join(" → ") }) : t("projectPage.ind.noSchedule"))}
          {indicator("deadline", s.deadline ? fmt.date(intl, s.deadline) : "—",
            !s.deadline ? t("projectPage.ind.noDeadline") : s.overrunDays > 0 ? <span className="font-semibold text-ws-danger-ink">{t("projectPage.ind.overrun", { n: s.overrunDays })}</span> : t("projectPage.ind.fits"))}
          {indicator("nextMilestone", s.nextMilestone ? fmt.date(intl, s.nextMilestone.date) : "—", s.nextMilestone?.title ?? t("deskHome.card.noMilestone"))}
          {indicator("cpi", fmt.number(intl, s.cpi, 2), s.costVerdict ? t(`pm.costVerdict.${s.costVerdict}`) : t("projectPage.ind.noEvm"))}
          {indicator("spi", fmt.number(intl, s.spi, 2), s.scheduleVerdict ? t(`pm.scheduleVerdict.${s.scheduleVerdict}`) : t("projectPage.ind.noEvm"))}
          {indicator("probability", s.probability ? fmt.percent(intl, s.probability.value, 1) : "—",
            s.probability ? t("projectPage.ind.probabilityOf", { days: fmt.number(intl, s.probability.target, 1) }) : t("projectPage.ind.noUncertainty"))}
          {indicator("findings", t("projectPage.ind.findingsValue", { critical: s.findings.critical, attention: s.findings.attention }),
            <Button size="sm" variant="ghost" className="min-h-0 px-0 py-0" href={`/projects/${model.id}/edit`}>{t("projectPage.ind.findingsLink")}</Button>)}
        </dl>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectPage.ind.risks", { n: s.openRisks })}</p>
      </section>

      <section aria-labelledby="po-lifecycle" className="grid gap-2">
        <h2 id="po-lifecycle" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectPage.lifecycle")}</h2>
        <ol className="grid gap-1.5 sm:grid-cols-7">
          {PROJECT_PHASES.map((phase, i) => (
            <li key={phase} aria-current={i === currentIdx ? "step" : undefined}
              className={cn("rounded-[var(--ws-radius-md)] border px-2 py-1.5 text-[length:var(--ws-text-caption)]", i === currentIdx ? "border-ws-accent bg-ws-accent-soft font-semibold" : i < currentIdx ? "border-ws-border bg-ws-surface-2" : "border-dashed border-ws-border")}>
              <span className="block">{t(`pm.phase.${phase}`)}</span>
              <span className="block text-ws-text-muted">{i === currentIdx ? t("projectPage.phaseCurrent") : i < currentIdx ? t("projectPage.phaseDone") : t("projectPage.phaseNext")}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="po-versions" className="grid gap-2">
        <h2 id="po-versions" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectPage.versions")}</h2>
        <ol className="grid gap-1.5" aria-label={t("projectPage.versions")}>
          {versions.map((v) => (
            <li key={v.number} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 border-b border-ws-border pb-1.5 text-[length:var(--ws-text-body-sm)]" data-version={v.number}>
              <span className="font-[family-name:var(--ws-font-mono)] font-bold tabular-nums text-ws-text-muted">{t("pm.ctl.history.version", { n: v.number })}</span>
              <span className="break-words">{versionSummary(t, v)}</span>
              <span className="col-start-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{nameOf(DEMO_PEOPLE, v.actorId)} · <time dateTime={v.at}>{when.format(new Date(v.at))}</time></span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="po-shortcuts" className="grid gap-2">
        <h2 id="po-shortcuts" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectPage.shortcuts")}</h2>
        <div className="grid gap-2 md:grid-cols-3">
          {([
            ["edit", "mesa", "pm.ws.openWorkspace", "projectPage.shortcut.desk"],
            ["simulate", "hype", "projectPage.simulate", "projectPage.shortcut.simulate"],
            ["mirror", "insights-ia", "projectPage.mirror", "projectPage.shortcut.mirror"],
          ] as const).map(([path, glyph, label, hint]) => (
            <Card key={path} padding="sm" className="grid content-start gap-2">
              <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(hint)}</p>
              <div><Button size="sm" icon={glyph} href={`/projects/${model.id}/${path}`}>{t(label)}</Button></div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
