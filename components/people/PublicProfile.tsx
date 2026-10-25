"use client";
/**
 * Perfil de terceiros com dados reais (RF16; auditoria 17/10/2026). Cabeçalho por `GET /api/people/by-username/{username}`
 * (`PublicProfileView`, nunca e-mail nem telefone) e Acervo Digital por `GET /api/people/{id}/tasks` — o servidor já filtra pelo que
 * quem vê pode ver. Contadores só do que a API devolveu (tarefas visíveis); seguidores, DP e Hype ficam de fora até terem fonte real.
 * 404 do servidor (conta inexistente ou não ativa, recusa uniforme) → "perfil não encontrado" sem dizer se a conta existe. Sem
 * sessão → pedir para entrar. O próprio @usuário (ou `self` na resposta) vai para Meu perfil (`/profile`).
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { ownCounters } from "@/components/account/OwnProfile";
import { CardGrid } from "@/components/social/TaskSchemeCard";
import { PersistedTaskCard } from "@/components/tasks/PersistedTasks";
import { ApiError, describeError } from "@/lib/api/client";
import { loginUrl } from "@/lib/auth/next";
import { useI18n } from "@/lib/i18n/useI18n";
import { PROFILE_TABS, type PageEntry } from "@/lib/pages/registry";
import { peopleApi, PROFILE_TASKS_LIMIT, type PublicProfileView } from "@/lib/people/client";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";
import type { TaskView } from "@/lib/tasks/client";

const isCompany = (p: PublicProfileView) => p.profileType === "EMPRESA";
const sameUser = (a: string | undefined | null, b: string) => !!a && a.toLowerCase() === b.toLowerCase();

/** Sub-abas que terceiros veem (1–5); conta EMPRESA não tem "deliberativo" (ABAS_POR_PERFIL §7.d). */
export function publicProfileTabs(profileType?: string | null) {
  return PROFILE_TABS.filter((tab) => tab.thirdParty && !(profileType === "EMPRESA" && tab.hiddenFor?.includes("EMPRESA")));
}

type TaskList = { tasks: TaskView[] | null; error: string | null; reload: () => void };

function usePersonTasks(id: string | undefined): TaskList {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<TaskView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setError(null);
    setTasks(null);
    peopleApi.tasksOf(id, PROFILE_TASKS_LIMIT, ctrl.signal).then(
      (list) => { if (!ctrl.signal.aborted) setTasks(list ?? []); },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof ApiError && (e.status === 401 || e.status === 0) ? t("tasks.list.needSession") : describeError(e));
      },
    );
    return () => ctrl.abort();
  }, [id, attempt, t]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { tasks, error, reload };
}

function PublicProfileHeader({ person, tasks }: { person: PublicProfileView; tasks: readonly TaskView[] | null }) {
  const { t, intl } = useI18n();
  const username = person.username ?? "";
  const name = person.name?.trim() || person.fullName?.trim() || username;
  const role = isCompany(person) ? t("social.profile.institutionalAccount") : person.jobTitle?.trim();
  const counters = ownCounters(tasks);
  const capped = !!tasks && tasks.length >= PROFILE_TASKS_LIMIT;
  const fmt = new Intl.NumberFormat(intl);
  const typeKey = `profileType.${person.profileType}`;
  const typeLabel = t(typeKey);
  const labels = { tasks: t("social.profile.visibleTasks"), inProgress: t("ownProfile.counter.inProgress"), done: t("ownProfile.counter.done") };
  return (
    <Card tone="clay" className="grid gap-[var(--ws-space-4)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center" data-testid="public-profile-header">
      <div className="flex min-w-0 items-start gap-[var(--ws-space-4)]">
        <ProfileAvatar name={name} src={person.avatarUrl} size={64} shape={isCompany(person) ? "monitor" : "circle"} />
        <div className="grid min-w-0 gap-1">
          <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-tight [overflow-wrap:anywhere]" data-testid="profile-name">{name}</h2>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted [overflow-wrap:anywhere]" data-testid="profile-handle">@{username}{role ? ` · ${role}` : ""}</p>
          <div className="flex flex-wrap items-center gap-2">
            {person.profileType && typeLabel !== typeKey ? <Badge tone="info">{typeLabel}</Badge> : null}
            {person.verified ? <Badge tone="success">{t("ownProfile.verified")}</Badge> : null}
            <Badge tone="neutral" title={t("social.profile.thirdPartyHint")}>{t("social.profile.thirdParty")}</Badge>
          </div>
          <p className="max-w-prose text-[length:var(--ws-text-body-sm)] [overflow-wrap:anywhere]" data-testid="profile-bio">
            {person.bio?.trim() ? person.bio : <span className="text-ws-text-muted">{t("social.profile.noBio")}</span>}
          </p>
        </div>
      </div>
      <div className="grid gap-2 md:min-w-[18rem]">
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-center" data-testid="profile-counters">
          {(["tasks", "inProgress", "done"] as const).map((key) => (
            <div key={key} className="min-w-0" data-counter={key}>
              <dt className="truncate text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted" title={labels[key]}>{labels[key]}</dt>
              <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums">
                {counters ? `${fmt.format(counters[key])}${capped && key === "tasks" ? "+" : ""}` : <><span aria-hidden>—</span><span className="sr-only">{t("ownProfile.counterLoading")}</span></>}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
          {t("social.profile.countersHint")}{capped ? ` ${t("social.profile.tasksCapped", { n: PROFILE_TASKS_LIMIT })}` : ""}
        </p>
      </div>
    </Card>
  );
}

function PublicAcervo({ person, list }: { person: PublicProfileView; list: TaskList }) {
  const { t } = useI18n();
  const name = person.name?.trim() || person.fullName?.trim() || `@${person.username ?? ""}`;
  if (list.error) return <ErrorState title={t("tasks.list.error")} description={list.error} onRetry={list.reload} />;
  if (!list.tasks) return <LoadingState />;
  if (!list.tasks.length) return <EmptyState moji="vazio" title={t("social.acervo.emptyTitle")} description={t("social.profile.noVisibleTasks", { name })} />;
  return (
    <div data-testid="public-profile-tasks">
      <CardGrid label={t("tabs.profile.acervo")}>{list.tasks.map((x) => <li key={x.id}><PersistedTaskCard task={x} /></li>)}</CardGrid>
    </div>
  );
}

function SignInToSee({ username }: { username: string }) {
  const { t } = useI18n();
  return (
    <EmptyState
      moji="vazio"
      title={t("social.profile.signInTitle")}
      description={t("social.profile.signInHint")}
      action={<Button variant="primary" href={loginUrl(`/u/${encodeURIComponent(username)}`)} data-testid="public-profile-sign-in">{t("nav.login")}</Button>}
    />
  );
}

function ProfileNotFound() {
  const { t } = useI18n();
  return (
    <div data-testid="public-profile-not-found">
      <EmptyState
        moji="vazio"
        title={t("social.profile.notFound")}
        description={t("social.profile.notFoundHint")}
        action={<Button href="/search?tab=pessoas">{t("social.profile.searchPeople")}</Button>}
      />
    </div>
  );
}

type Load =
  | { kind: "loading" }
  | { kind: "ok"; person: PublicProfileView }
  | { kind: "notFound" }
  | { kind: "signin" }
  | { kind: "error"; message: string };

function SignedInPublicProfile({ page, username }: { page: PageEntry; username: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoad({ kind: "loading" });
    peopleApi.byUsername(username, ctrl.signal).then(
      (person) => { if (!ctrl.signal.aborted) setLoad({ kind: "ok", person }); },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 404) setLoad({ kind: "notFound" });
        else if (e instanceof ApiError && e.status === 401) setLoad({ kind: "signin" });
        else setLoad({ kind: "error", message: describeError(e) });
      },
    );
    return () => ctrl.abort();
  }, [username, attempt]);

  const person = load.kind === "ok" ? load.person : null;
  const self = !!person?.self;
  useEffect(() => { if (self) router.replace("/profile"); }, [self, router]);
  const list = usePersonTasks(person && !self ? person.id : undefined);

  if (load.kind === "loading" || self) return <LoadingState />;
  if (load.kind === "notFound") return <ProfileNotFound />;
  if (load.kind === "signin") return <SignInToSee username={username} />;
  if (load.kind === "error") return <ErrorState title={t("social.profile.loadError")} description={load.message} onRetry={() => setAttempt((n) => n + 1)} />;
  const p = load.person;
  return (
    <RfPage
      page={page}
      subtitle={`@${p.username ?? username}`}
      tabs={publicProfileTabs(p.profileType)}
      tabLabel={(tab) => {
        const pt = PROFILE_TABS.find((x) => x.slug === tab.slug);
        return pt && isCompany(p) && pt.companyLabelKey ? t(pt.companyLabelKey) : t(tab.labelKey);
      }}
      renderTab={(slug) => (slug === "acervo" ? <PublicAcervo person={p} list={list} /> : undefined)}
    >
      <PublicProfileHeader person={p} tasks={list.tasks} />
    </RfPage>
  );
}

export function PublicProfile({ page, username }: { page: PageEntry; username: string }) {
  const router = useRouter();
  const { status, me } = useCurrentUser();
  // o próprio @usuário não precisa de ida à API: vai direto para Meu perfil
  const own = status === "authenticated" && sameUser(me?.username, username);
  useEffect(() => { if (own) router.replace("/profile"); }, [own, router]);
  if (status === "loading" || own) return <LoadingState />;
  if (status !== "authenticated") return <SignInToSee username={username} />;
  return <SignedInPublicProfile key={username} page={page} username={username} />;
}
