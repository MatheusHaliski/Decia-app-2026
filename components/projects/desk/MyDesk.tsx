"use client";
/**
 * Mesa de Trabalho do perfil (RF21): "Minha mesa" com os projetos desta aba (cartões com fase, % concluído, próximo marco e
 * versão), os rascunhos do Autopiloto ainda não salvos e o "criar projeto" (em branco, de modelo ou pelo Autopiloto); a prévia da
 * skin e da arte de fundo (RF22, RF38.CA08, RF23/RF3) continua no topo. "Mesa da equipe" mostra os projetos por fase (o quadro do
 * RF21.CA03), em leitura. Dados DEMO (memória desta aba) até existir a API de projetos.
 */
import { useEffect, useState } from "react";
import { BackgroundArt, Badge, Button, EmptyState, Link, LoadingState, Tag } from "@/components/ui";
import { useMounted } from "@/components/decia";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { todayIso } from "@/lib/projects/autopilot/dates";
import { discardProposalDraft, listProposalDrafts, proposalDraftHref, type ProposalDraft } from "@/lib/projects/autopilot/drafts";
import { demoProjectRepository, useProjects, type ProjectRepository } from "@/lib/projects/repository";
import { PROJECT_PHASES } from "@/lib/projects/types";
import { fmt } from "../shared";
import { CreateProject } from "./CreateProject";
import { ProjectCard } from "./ProjectCard";

export interface DeskProps { repo?: ProjectRepository; today?: string }

export function MyDesk({ repo, today }: DeskProps) {
  const { t, intl } = useI18n();
  const { prefs } = usePreferences();
  const mounted = useMounted();
  const store = repo ?? demoProjectRepository();
  const projects = useProjects(store);
  const [drafts, setDrafts] = useState<ProposalDraft[]>([]);
  useEffect(() => setDrafts(listProposalDrafts()), []);
  const day = today ?? todayIso(new Date());

  return (
    <div className="grid gap-[var(--ws-space-5)]" data-my-desk>
      <BackgroundArt skin={prefs.deskSkin} backgroundId={prefs.backgroundId} minHeight="10rem" className="shadow-ws-clay">
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="neutral" filled>{t(`deskSkin.${prefs.deskSkin}`)}</Tag>
            <Tag tone="accent">{t(`background.${prefs.backgroundId}`)}</Tag>
          </div>
          <p className="max-w-prose text-[length:var(--ws-text-body-sm)] font-medium">{t("deskHome.intro")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="spark" href="/autopilot"><span aria-hidden>✦</span> {t("deskHome.autopilot")}</Button>
            <Button size="sm" variant="primary" icon="criar-projeto" href="#desk-create">{t("deskHome.create")}</Button>
            <Button size="sm" href="/settings?tab=aparencia">{t("desk.changeInSettings")}</Button>
          </div>
        </div>
      </BackgroundArt>

      <section aria-labelledby="desk-projects" className="grid gap-[var(--ws-space-3)]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="desk-projects" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("deskHome.projects")}</h2>
          {store.source === "DEMO" ? <Badge tone="warning" title={t("pm.ws.demoHint")}>DEMO</Badge> : null}
        </div>
        {!mounted ? <LoadingState /> : projects.length ? (
          <div className="grid gap-[var(--ws-space-3)] md:grid-cols-2 2xl:grid-cols-3">
            {projects.map((p) => <ProjectCard key={p.id} model={p} today={day} people={DEMO_PEOPLE} />)}
          </div>
        ) : <EmptyState title={t("deskHome.empty")} description={t("deskHome.emptyDesc")} />}
      </section>

      {mounted && drafts.length ? (
        <section aria-labelledby="desk-drafts" className="grid gap-2">
          <h2 id="desk-drafts" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("deskHome.drafts.title")}</h2>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("deskHome.drafts.hint")}</p>
          <ul className="grid gap-2">
            {drafts.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-dashed border-ws-ai-spark bg-ws-surface-1 px-3 py-2" data-draft={d.id}>
                <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{d.proposal.title}</span>
                  <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">
                    {t("deskHome.drafts.line", { n: d.proposal.tasks.length, when: new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" }).format(new Date(d.updatedAt)) })}
                  </span>
                </span>
                <Button size="sm" variant="primary" href={proposalDraftHref(d.id)}>{t("deskHome.drafts.open")}</Button>
                <Button size="sm" variant="ghost" aria-label={t("deskHome.drafts.discardOf", { title: d.proposal.title })} onClick={() => {
                  discardProposalDraft(d.id);
                  setDrafts(listProposalDrafts());
                }}>{t("deskHome.drafts.discard")}</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="desk-create" aria-labelledby="desk-create-title" className="grid scroll-mt-4 gap-[var(--ws-space-3)]">
        <h2 id="desk-create-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("deskHome.create")}</h2>
        <CreateProject repo={store} />
      </section>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("deskHome.footnote", { date: fmt.date(intl, day) })}</p>
    </div>
  );
}

/** "Mesa da equipe" (RF21.CA03, visão Quadro): os projetos desta aba agrupados pela fase atual, em leitura. */
export function TeamBoard({ repo }: DeskProps) {
  const { t } = useI18n();
  const mounted = useMounted();
  const projects = useProjects(repo ?? demoProjectRepository());
  if (!mounted) return <LoadingState />;
  return (
    <section aria-labelledby="team-board" className="grid gap-[var(--ws-space-3)]" data-team-board>
      <h2 id="team-board" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("deskHome.team.title")}</h2>
      <p className="max-w-prose text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("deskHome.team.note")}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {PROJECT_PHASES.map((phase) => {
          const here = projects.filter((p) => p.currentPhase === phase);
          return (
            <section key={phase} aria-labelledby={`team-${phase}`} className="grid content-start gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2" data-team-phase={phase}>
              <h3 id={`team-${phase}`} className="flex items-center justify-between gap-2 text-[length:var(--ws-text-body-sm)] font-semibold">
                {t(`pm.phase.${phase}`)} <Tag>{here.length}</Tag>
              </h3>
              {here.length ? (
                <ul className="grid gap-1 text-[length:var(--ws-text-caption)]">
                  {here.map((p) => <li key={p.id}><Link href={`/projects/${p.id}`}>{p.title}</Link></li>)}
                </ul>
              ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("deskHome.team.none")}</p>}
            </section>
          );
        })}
      </div>
    </section>
  );
}
