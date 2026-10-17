"use client";
/**
 * Perfil pessoal funcional sobre o repositório DEMO — próprio (`/profile`, RF6: Acervo Digital, Projetos, Projetos
 * salvos, Tarefas salvas, Decisões → DECIA, e "Delegadas a mim") e de terceiros (`/u/[username]`, RF16: sub-abas 1–5,
 * itens filtrados pela visibilidade, Seguir, ações sociais inline; contas institucionais com etiqueta e atalho para
 * RF14/RF15). As sub-abas ainda sem RF funcional mantêm o EmptyState do RfPage; os CAs continuam abaixo.
 * Fora do laboratório (`NEXT_PUBLIC_WS_LAB`), o próprio perfil usa a conta real: `components/account/OwnProfile` (P19), e o de
 * terceiros a API de pessoas: `components/people/PublicProfile` (RF16).
 */
import { useState } from "react";
import { Badge, Button, Card, EmptyState, LoadingState, Tabs } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { PROFILE_TABS, type PageEntry } from "@/lib/pages/registry";
import { itemOf, personById, personByUsername, profileProjects, profileTasks, savedListOf, toggleSave, titleOf } from "@/lib/social/rules";
import type { TaskState } from "@/lib/social/types";
import { WORK_STATUSES, workStatusOf, type WorkStatus } from "@/lib/tasks/status";
import { profileTabsFor, toProfileHeaderViewModel, toProjectCardViewModel, toTaskCardViewModel } from "@/lib/social/view-model";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { labMode, useViewer } from "@/lib/viewer/ViewerProvider";
import { OwnProfile } from "@/components/account/OwnProfile";
import { PublicProfile } from "@/components/people/PublicProfile";
import { AssignmentInbox, SocialNotifications } from "./AssignmentInbox";
import { useMounted, useSocial } from "./context";
import { SocialProfileHeader } from "./ProfileHeader";
import { ProjectCard } from "./ProjectCard";
import { CardGrid, CardList, TaskSchemeCard } from "./TaskSchemeCard";

function AcervoTab({ ownerId }: { ownerId: string }) {
  const { t } = useI18n();
  const { state, viewerId, now } = useSocial();
  // filtro pelo eixo de execução padronizado (A realizar · Em andamento · Bloqueado · Concluído · Arquivado) + publicados
  const [filter, setFilter] = useState<"todos" | WorkStatus | "PUBLICADO">("todos");
  const [view, setView] = useState<"grade" | "lista">("grade");
  const all = profileTasks(state, viewerId, ownerId);
  const groupOf = (state: TaskState) => workStatusOf(state) ?? "PUBLICADO";
  const groups = [...WORK_STATUSES, "PUBLICADO"] as const;
  const counts = Object.fromEntries(groups.map((g) => [g, all.filter((x) => groupOf(x.state) === g).length])) as Record<(typeof groups)[number], number>;
  const tasks = filter === "todos" ? all : all.filter((x) => groupOf(x.state) === filter);
  const filters = [{ slug: "todos", label: t("social.acervo.all"), badge: <Badge tone="neutral">{all.length}</Badge> }, ...groups.filter((g) => counts[g] > 0).map((g) => ({ slug: g, label: t(`social.workStatus.${g}`), badge: <Badge tone="neutral">{counts[g]}</Badge> }))];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-testid="tab-acervo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs tabs={filters} param={null} value={filter} onChange={(v) => setFilter(v as typeof filter)} label={t("social.acervo.filterByState")} look="pills" className="min-w-0 max-w-full flex-1 basis-64" />
        <div className="flex gap-1" role="group" aria-label={t("social.acervo.view")}>
          <Button size="sm" variant={view === "grade" ? "default" : "ghost"} aria-pressed={view === "grade"} onClick={() => setView("grade")} data-testid="view-grade">{t("social.acervo.grid")}</Button>
          <Button size="sm" variant={view === "lista" ? "default" : "ghost"} aria-pressed={view === "lista"} onClick={() => setView("lista")} data-testid="view-lista">{t("social.acervo.list")}</Button>
        </div>
      </div>
      {tasks.length === 0 ? (
        <EmptyState moji="vazio" title={t("social.acervo.emptyTitle")} description={t(viewerId === ownerId ? "social.acervo.emptySelf" : "social.acervo.emptyThird")} />
      ) : view === "grade" ? (
        <CardGrid label={t("tabs.profile.acervo")}>{tasks.map((x) => <li key={x.id}><TaskSchemeCard vm={toTaskCardViewModel(state, viewerId, x, now)} /></li>)}</CardGrid>
      ) : (
        <CardList label={t("tabs.profile.acervo")}>{tasks.map((x) => <li key={x.id}><TaskSchemeCard vm={toTaskCardViewModel(state, viewerId, x, now)} layout="list" /></li>)}</CardList>
      )}
    </div>
  );
}

function ProjectsTab({ ownerId }: { ownerId: string }) {
  const { t } = useI18n();
  const { state, viewerId } = useSocial();
  const projects = profileProjects(state, viewerId, ownerId);
  if (!projects.length) return <EmptyState moji="vazio" title={t("social.projects.emptyTitle")} description={t("social.projects.emptyDescription")} />;
  return <CardGrid label={t("tabs.profile.projetos")}>{projects.map((p) => <li key={p.id}><ProjectCard vm={toProjectCardViewModel(state, viewerId, p)} /></li>)}</CardGrid>;
}

function SavedTab({ type }: { type: "TASK" | "PROJECT" }) {
  const { t } = useI18n();
  const { state, viewerId, now, run } = useSocial();
  const list = savedListOf(state, viewerId, type);
  if (!list.length) return <EmptyState moji="vazio" title={t("social.saved.emptyTitle")} description={t("social.saved.emptyDescription")} />;
  return (
    <CardGrid label={t(type === "TASK" ? "tabs.profile.tarefasSalvas" : "tabs.profile.projetosSalvos")}>
      {list.map(({ saved, available }) => {
        const item = itemOf(state, { type, id: saved.targetId });
        if (!item || !available) {
          return (
            <li key={saved.id}>
              <Card tone="soft" className="grid content-start gap-2" data-testid="saved-unavailable">
                <Badge tone="neutral" className="justify-self-start">{t("social.saved.unavailable")}</Badge>
                <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("social.saved.unavailableHint")}</p>
                {item ? <p className="sr-only">{titleOf(item)}</p> : null}
                <Button size="sm" className="justify-self-start" onClick={() => run((s, v, at) => toggleSave(s, v, { type, id: saved.targetId }, at), "social.toast.unsaved")}>{t("social.saved.remove")}</Button>
              </Card>
            </li>
          );
        }
        return (
          <li key={saved.id}>
            {item.kind === "TASK" ? <TaskSchemeCard vm={toTaskCardViewModel(state, viewerId, item.task, now)} /> : <ProjectCard vm={toProjectCardViewModel(state, viewerId, item.project)} />}
          </li>
        );
      })}
    </CardGrid>
  );
}

function DecisionsTab({ ownerId }: { ownerId: string }) {
  const { t } = useI18n();
  const { state, viewerId } = useSocial();
  const owner = personById(state, ownerId);
  const self = viewerId === ownerId;
  return (
    <Card title={t("social.decisions.title", { n: owner?.decisionsCount ?? 0 })} eyebrow="RF29 · DECIA" data-testid="tab-decisoes">
      <p className="mb-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(self ? "social.decisions.self" : "social.decisions.third", { name: owner?.fullName ?? "" })}</p>
      {self ? <Button variant="primary" href="/decia?tab=decisoes">{t("social.decisions.open")}</Button> : <Button href="/decia">{t("social.decisions.openDecia")}</Button>}
    </Card>
  );
}

export function ProfileView({ page, username }: { page: PageEntry; username?: string }) {
  const { t } = useI18n();
  const { profile } = useViewer();
  const { state, viewerId } = useSocial();
  const mounted = useMounted();
  const owner = username ? personByUsername(state, decodeURIComponent(username)) : personById(state, viewerId);
  const ownerId = owner?.id ?? null;
  const self = !!ownerId && ownerId === viewerId;
  const header = mounted && ownerId ? toProfileHeaderViewModel(state, viewerId, ownerId) : null;
  const tabs = ownerId ? profileTabsFor(state, viewerId, ownerId) : PROFILE_TABS.filter((x) => x.thirdParty);
  // P19: `/profile` mostra a conta logada (API real); o repositório DEMO fica para o laboratório e para os testes sem provider
  const session = useOptionalCurrentUser();
  if (!username && session && !labMode()) return <OwnProfile page={page} />;
  // RF16: `/u/[username]` fora do laboratório lê a pessoa da API (busca de pessoas → perfil); o DEMO segue no laboratório e nos testes
  if (username && session && !labMode()) return <PublicProfile page={page} username={username} />;

  return (
    <RfPage
      page={page}
      subtitle={username ? `@${decodeURIComponent(username)}` : undefined}
      tabs={tabs}
      actions={<Badge tone="neutral" title={t("social.demoHint")}>{t("decia.demo")}</Badge>}
      tabLabel={(tb) => {
        const pt = PROFILE_TABS.find((x) => x.slug === tb.slug);
        const company = self ? profile === "EMPRESA" : owner?.profileType === "EMPRESA";
        return pt && company && pt.companyLabelKey ? t(pt.companyLabelKey) : t(tb.labelKey);
      }}
      renderTab={(slug) => {
        if (!mounted) return <LoadingState />;
        if (!ownerId) return undefined;
        if (slug === "acervo") return <AcervoTab ownerId={ownerId} />;
        if (slug === "projetos") return <ProjectsTab ownerId={ownerId} />;
        if (slug === "decisoes") return <DecisionsTab ownerId={ownerId} />;
        if (self && slug === "tarefas-salvas") return <SavedTab type="TASK" />;
        if (self && slug === "projetos-salvos") return <SavedTab type="PROJECT" />;
        return undefined;
      }}
    >
      {!mounted ? <LoadingState /> : header ? (
        <div className="grid gap-[var(--ws-space-4)]">
          <SocialProfileHeader vm={header} />
          {self ? <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><AssignmentInbox /><SocialNotifications /></div> : null}
        </div>
      ) : (
        <EmptyState moji="vazio" title={t("social.profile.noAccount")} description={t("social.profile.noAccountHint")} />
      )}
    </RfPage>
  );
}
