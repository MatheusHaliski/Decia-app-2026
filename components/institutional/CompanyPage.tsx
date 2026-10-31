"use client";
/**
 * Página da empresa/órgão com dados reais (RF15; auditoria Onda 1, 31/10/2026). Cabeçalho por `GET /api/companies/{slug}`: nome
 * (razão social), cor de destaque, site oficial (só `https://`), link para a conta institucional e contadores do servidor
 * (departamentos ativos, pessoas ativas, seguidores) com o botão Seguir. "Sobre" mostra o texto e o site; "Departamentos" lista os
 * ativos por `GET /api/companies/{slug}/departments` com link para cada página (RF14). Empresa inexistente, inativa ou com a conta dona
 * pendente → "empresa não encontrada" (404 uniforme); sem sessão → Entrar. A empresa não tem sigla no cadastro (V10): o monograma usa
 * as iniciais do nome. Sub-abas sem fonte real seguem com o aviso padrão; "Gestão" continua a proposta só para a dona.
 */
import { Badge, Card, EmptyState, ErrorState, Link, LoadingState, Monogram } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { companyHref, institutionApi, nodeColor, type CompanyPageView } from "@/lib/institutional/client";
import type { PageEntry } from "@/lib/pages/registry";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";
import { useInstitutionLoad } from "./DepartmentPage";
import { FollowInstitutionButton, useInstitutionFollow } from "./FollowInstitution";
import { DepartmentList, InstitutionCounters, InstitutionNotFound, SignInToSee } from "./shared";

function CompanyHeaderReal({ c }: { c: CompanyPageView }) {
  const { t } = useI18n();
  const follow = useInstitutionFollow({ kind: "company", slug: c.slug });
  return (
    <Card tone="clay" className="grid gap-[var(--ws-space-4)]" data-testid="company-header">
      <div className="grid gap-[var(--ws-space-4)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 items-start gap-[var(--ws-space-4)]">
          <Monogram name={c.name} node={nodeColor(c.accentColor) ?? "orange"} size={64} />
          <div className="grid min-w-0 gap-1">
            <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-tight [overflow-wrap:anywhere]" data-testid="company-name">{c.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
              {c.owner ? <Badge tone="success">{t("company.owner")}</Badge> : null}
              {c.websiteUrl ? <Link href={c.websiteUrl} data-testid="company-website">{t("social.institution.website")}<span className="sr-only"> {t("social.institution.opensNewTab")}</span></Link> : null}
              {c.account?.username ? <Link href={`/u/${encodeURIComponent(c.account.username)}`}>{t("social.institution.accountProfile")}</Link> : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-2"><FollowInstitutionButton name={c.name} state={follow} /></div>
          </div>
        </div>
        <InstitutionCounters items={[
          { key: "departments", label: t("social.institution.counter.departments"), value: c.departments },
          { key: "people", label: t("social.institution.counter.people"), value: c.people },
          { key: "followers", label: t("social.institution.counter.followers"), value: follow.view?.followers ?? c.followers },
        ]} />
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.institution.realCountersHint")}</p>
    </Card>
  );
}

function CompanyAbout({ c }: { c: CompanyPageView }) {
  const { t } = useI18n();
  if (!c.about?.trim() && !c.websiteUrl) return <EmptyState moji="vazio" title={t("social.institution.noAbout")} description={t("social.institution.noAboutHint")} />;
  return (
    <div className="grid gap-2">
      {c.about?.trim() ? <p className="max-w-prose whitespace-pre-line text-[length:var(--ws-text-body)] [overflow-wrap:anywhere]" data-testid="institution-about">{c.about}</p> : null}
      {c.websiteUrl ? <p className="text-[length:var(--ws-text-body-sm)]">{t("social.institution.website")}: <Link href={c.websiteUrl}>{c.websiteUrl}</Link></p> : null}
    </div>
  );
}

function CompanyDepartments({ slug }: { slug: string }) {
  const { t } = useI18n();
  const [state, retry] = useInstitutionLoad(slug, (signal) => institutionApi.companyDepartments(slug, signal));
  if (state.kind === "loading") return <LoadingState />;
  if (state.kind !== "ok") return <ErrorState title={t("social.institution.departmentsError")} description={state.kind === "error" ? state.message : t("social.institution.notFoundHint")} onRetry={retry} />;
  if (!state.data.length) return <EmptyState moji="vazio" title={t("social.institution.noDepartments")} description={t("social.institution.noDepartmentsHint")} />;
  return <DepartmentList departments={state.data} label={t("tabs.company.departamentos")} testId="company-departments" />;
}

function SignedInCompany({ page, slug }: { page: PageEntry; slug: string }) {
  const { t } = useI18n();
  const [state, retry] = useInstitutionLoad(slug, (signal) => institutionApi.company(slug, signal));
  if (state.kind === "loading") return <LoadingState />;
  if (state.kind === "notFound") return <InstitutionNotFound titleKey="social.institution.companyNotFound" hintKey="social.institution.notFoundHint" testId="company-not-found" />;
  if (state.kind === "signin") return <SignInToSee next={companyHref(slug)} titleKey="social.institution.signInTitle" hintKey="social.institution.signInHint" testId="company-sign-in" />;
  if (state.kind === "error") return <ErrorState title={t("social.institution.loadError")} description={state.message} onRetry={retry} />;
  const c = state.data;
  return (
    <RfPage
      page={page}
      subtitle={c.name}
      tabs={page.tabs?.filter((tab) => tab.slug !== "gestao" || c.owner)}
      renderTab={(tab) => (tab === "sobre" ? <CompanyAbout c={c} /> : tab === "departamentos" ? <CompanyDepartments slug={c.slug} /> : undefined)}
    >
      <CompanyHeaderReal c={c} />
    </RfPage>
  );
}

export function CompanyPageReal({ page, slug }: { page: PageEntry; slug: string }) {
  const { status } = useCurrentUser();
  if (status === "loading") return <LoadingState />;
  if (status !== "authenticated") {
    return <SignInToSee next={companyHref(slug)} titleKey="social.institution.signInTitle" hintKey="social.institution.signInHint" testId="company-sign-in" />;
  }
  return <SignedInCompany key={slug} page={page} slug={slug} />;
}
