"use client";
/**
 * Meu perfil com a conta real (P19, RF6.CA01; auditoria 17/10/2026). O cabeçalho vem de `/api/me` e o Acervo Digital da API de
 * tarefas (`/api/tasks`): nada de "Pessoa Exemplo" nem de contadores de demonstração. Sem sessão (aba anônima, depois do logout)
 * a página pede para entrar. Seguidores, projetos, DP e Hype não aparecem até terem fonte real nas próximas ondas.
 */
import { Avatar, Badge, Button, Card, EmptyState, LoadingState } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { MyTasks, useMyTaskList } from "@/components/tasks/PersistedTasks";
import type { Me } from "@/lib/account/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { PROFILE_TABS, type PageEntry } from "@/lib/pages/registry";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";
import type { TaskView } from "@/lib/tasks/client";
import { workStatusOf } from "@/lib/tasks/status";

const isCompany = (me: Me) => me.profileType === "EMPRESA";

/** Sub-abas do dono conforme o tipo de conta (EMPRESA some com 5/9/13/14/15, ABAS_POR_PERFIL §7.d). */
export function ownProfileTabs(me: Me) {
  return PROFILE_TABS.filter((tab) => !(isCompany(me) && tab.hiddenFor?.includes("EMPRESA")));
}

/** Contadores do cabeçalho calculados só com as tarefas que a API devolveu; `null` enquanto carrega. */
export function ownCounters(tasks: readonly TaskView[] | null) {
  if (!tasks) return null;
  const of = (s: string) => tasks.filter((x) => workStatusOf(x.state ?? "RASCUNHO") === s).length;
  return { tasks: tasks.length, inProgress: of("EM_ANDAMENTO"), done: of("CONCLUIDO") };
}

function OwnProfileHeader({ me, tasks }: { me: Me; tasks: readonly TaskView[] | null }) {
  const { t, intl } = useI18n();
  const name = me.displayName?.trim() || me.fullName || me.username || "";
  const role = isCompany(me) ? t("social.profile.institutionalAccount") : me.jobTitle;
  const counters = ownCounters(tasks);
  const fmt = new Intl.NumberFormat(intl);
  const typeKey = `profileType.${me.profileType}`;
  const typeLabel = t(typeKey);
  return (
    <Card tone="clay" className="grid gap-[var(--ws-space-4)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center" data-testid="own-profile-header">
      <div className="flex min-w-0 items-start gap-[var(--ws-space-4)]">
        <Avatar name={name} src={me.avatarUrl || undefined} size={64} />
        <div className="grid min-w-0 gap-1">
          <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-tight [overflow-wrap:anywhere]" data-testid="profile-name">{name}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted [overflow-wrap:anywhere]" data-testid="profile-handle">@{me.username}{role ? ` · ${role}` : ""}</p>
          <div className="flex flex-wrap items-center gap-2">
            {me.profileType && typeLabel !== typeKey ? <Badge tone="info">{typeLabel}</Badge> : null}
            {me.verified ? <Badge tone="success">{t("ownProfile.verified")}</Badge> : null}
            {me.twoFactorEnabled
              ? <Badge tone="success" title={t("ownProfile.twoFactorOnHint")}>{t("ownProfile.twoFactorOn")}</Badge>
              : <Badge tone="warning" title={t("ownProfile.twoFactorOffHint")}>{t("ownProfile.twoFactorOff")}</Badge>}
          </div>
          <p className="max-w-prose text-[length:var(--ws-text-body-sm)] [overflow-wrap:anywhere]" data-testid="profile-bio">
            {me.bio?.trim() ? me.bio : <span className="text-ws-text-muted">{t("ownProfile.noBio")}</span>}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" href="/settings?tab=conta" data-testid="edit-profile">{t("ownProfile.edit")}</Button>
            {!me.twoFactorEnabled ? <Button size="sm" variant="ghost" href="/settings?tab=conta">{t("ownProfile.twoFactorEnable")}</Button> : null}
          </div>
        </div>
      </div>
      <div className="grid gap-2 md:min-w-[18rem]">
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-center" data-testid="profile-counters">
          {(["tasks", "inProgress", "done"] as const).map((key) => (
            <div key={key} className="min-w-0" data-counter={key}>
              <dt className="truncate text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t(`ownProfile.counter.${key}`)}</dt>
              <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums">
                {counters ? fmt.format(counters[key]) : <><span aria-hidden>—</span><span className="sr-only">{t("ownProfile.counterLoading")}</span></>}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("ownProfile.countersHint")}</p>
      </div>
    </Card>
  );
}

function SignedInProfile({ page, me }: { page: PageEntry; me: Me }) {
  const { t } = useI18n();
  const list = useMyTaskList();
  return (
    <RfPage
      page={page}
      subtitle={`@${me.username}`}
      tabs={ownProfileTabs(me)}
      tabLabel={(tab) => {
        const pt = PROFILE_TABS.find((x) => x.slug === tab.slug);
        return pt && isCompany(me) && pt.companyLabelKey ? t(pt.companyLabelKey) : t(tab.labelKey);
      }}
      renderTab={(slug) => (slug === "acervo" ? <MyTasks list={list} /> : undefined)}
    >
      <OwnProfileHeader me={me} tasks={list.tasks} />
    </RfPage>
  );
}

export function OwnProfile({ page }: { page: PageEntry }) {
  const { t } = useI18n();
  const { status, me } = useCurrentUser();
  if (status === "authenticated" && me) return <SignedInProfile page={page} me={me} />;
  // sem sessão o seletor de perfis do RfPage mostraria 403; aqui o caminho é entrar
  return status === "loading" ? <LoadingState /> : (
    <EmptyState
      moji="vazio"
      title={t("ownProfile.signInTitle")}
      description={t("ownProfile.signInHint")}
      action={<Button variant="primary" href="/login?next=%2Fprofile" data-testid="profile-sign-in">{t("nav.login")}</Button>}
    />
  );
}
