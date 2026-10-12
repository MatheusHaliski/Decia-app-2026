"use client";
/**
 * Cabeçalhos institucionais em nível CA01 — departamento (RF14.CA01: sigla, nome, cor, monograma, chefe com link para o
 * perfil pessoal RF16, empresa → RF15, contadores e Seguir) e empresa (RF15.CA01: nome, contadores institucionais —
 * sem cargo/Hype/DP — e Seguir) — mais a lista de projetos publicados visíveis ao viewer (RF14.CA02/RF15.CA02).
 */
import { Avatar, Button, Card, EmptyState, Link, LoadingState, Monogram } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { canView, companyBySlug, departmentBySlug, followersCount, personById } from "@/lib/social/rules";
import type { SocialProject, SocialState, ViewerId } from "@/lib/social/types";
import { toProjectCardViewModel } from "@/lib/social/view-model";
import { useMounted, useSocial } from "./context";
import { FollowButton } from "./FollowButton";
import { ProjectCard } from "./ProjectCard";
import { CardGrid } from "./TaskSchemeCard";

const PUBLISHED = new Set(["PUBLICADO", "EM_DECISAO", "APROVADO", "EM_EXECUCAO", "CONCLUIDO"]);

function Counters({ items }: { items: { key: string; value: number }[] }) {
  const { t, intl } = useI18n();
  const fmt = new Intl.NumberFormat(intl);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-center sm:grid-cols-4" data-testid="institution-counters">
      {items.map((c) => (
        <div key={c.key} className="min-w-0">
          <dt className="truncate text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t(`social.institution.counter.${c.key}`)}</dt>
          <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums">{fmt.format(c.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

const visiblePublished = (s: SocialState, viewer: ViewerId, filter: (p: SocialProject) => boolean) =>
  s.projects.filter((p) => filter(p) && PUBLISHED.has(p.status) && canView(s, viewer, { kind: "PROJECT", project: p }));

export function PublishedProjects({ projects }: { projects: SocialProject[] }) {
  const { t } = useI18n();
  const { state, viewerId } = useSocial();
  const mounted = useMounted();
  if (!mounted) return <LoadingState />;
  if (!projects.length) return <EmptyState moji="vazio" title={t("social.institution.noProjects")} description={t("social.institution.noProjectsHint")} />;
  return <CardGrid label={t("social.institution.projects")}>{projects.map((p) => <li key={p.id}><ProjectCard vm={toProjectCardViewModel(state, viewerId, p)} /></li>)}</CardGrid>;
}

export function useDepartmentProjects(slug: string) {
  const { state, viewerId } = useSocial();
  const d = departmentBySlug(state, slug);
  return d ? visiblePublished(state, viewerId, (p) => p.departmentId === d.id) : [];
}

export function useCompanyProjects(slug: string) {
  const { state, viewerId } = useSocial();
  const c = companyBySlug(state, slug);
  return c ? visiblePublished(state, viewerId, (p) => p.companyId === c.id) : [];
}

export function DepartmentHeader({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { state, viewerId } = useSocial();
  const mounted = useMounted();
  const d = departmentBySlug(state, slug);
  if (!mounted) return <LoadingState />;
  if (!d) return null;
  const head = personById(state, d.headUserId);
  const company = state.companies.find((c) => c.id === d.companyId);
  const members = state.people.filter((p) => p.departmentId === d.id).length;
  const decisions = state.people.filter((p) => p.departmentId === d.id).reduce((n, p) => n + p.decisionsCount, 0);
  return (
    <Card tone="clay" className="grid gap-[var(--ws-space-4)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center" data-testid="department-header">
      <div className="flex min-w-0 items-start gap-[var(--ws-space-4)]">
        <Monogram name={d.acronym} monogram={d.acronym.replace(/^SECID-/, "").slice(0, 3)} node={d.color} size={64} />
        <div className="grid min-w-0 gap-1">
          <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-tight">{d.acronym}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted [overflow-wrap:anywhere]">{d.name}{company ? <> · <Link href={`/companies/${company.slug}`}>{company.legalName}</Link></> : null}</p>
          {head ? (
            <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-body-sm)]">
              <Avatar name={head.fullName} node={d.color} size={24} />
              <span>{t("social.institution.headLine", { acronym: d.acronym })}</span>
              <Link href={`/u/${head.username}`} data-testid="head-profile-link">{head.fullName}</Link>
            </p>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("social.institution.noHead")}</p>}
          <div className="mt-1 flex flex-wrap gap-2">
            <FollowButton targetType="DEPARTMENT" targetId={d.id} name={d.acronym} />
            {head && viewerId === head.id ? <Button size="sm" href={`/departments/${slug}/team?mode=manage`}>{t("department.openManage")}</Button> : null}
          </div>
        </div>
      </div>
      <Counters items={[
        { key: "people", value: members },
        { key: "projects", value: visiblePublished(state, viewerId, (p) => p.departmentId === d.id).length },
        { key: "decisions", value: decisions },
        { key: "followers", value: followersCount(state, "DEPARTMENT", d.id) },
      ]} />
    </Card>
  );
}

export function CompanyHeader({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { state, viewerId } = useSocial();
  const mounted = useMounted();
  const c = companyBySlug(state, slug);
  if (!mounted) return <LoadingState />;
  if (!c) return null;
  const owner = personById(state, c.ownerUserId);
  return (
    <Card tone="clay" className="grid gap-[var(--ws-space-4)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center" data-testid="company-header">
      <div className="flex min-w-0 items-start gap-[var(--ws-space-4)]">
        <Monogram name={c.legalName} monogram={c.slug.slice(0, 3).toUpperCase()} node="orange" size={64} />
        <div className="grid min-w-0 gap-1">
          <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-tight [overflow-wrap:anywhere]">{c.legalName}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">/companies/{c.slug} · {t("company.publicMetrics")}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <FollowButton targetType="COMPANY" targetId={c.id} name={c.legalName} />
            {owner ? <Button size="sm" variant="ghost" href={`/u/${owner.username}`}>{t("social.institution.accountProfile")}</Button> : null}
          </div>
        </div>
      </div>
      <Counters items={[
        { key: "departments", value: state.departments.filter((d) => d.companyId === c.id).length },
        { key: "people", value: state.people.filter((p) => p.companyId === c.id && p.profileType !== "EMPRESA").length },
        { key: "projects", value: visiblePublished(state, viewerId, (p) => p.companyId === c.id).length },
        { key: "followers", value: followersCount(state, "COMPANY", c.id) },
      ]} />
    </Card>
  );
}
