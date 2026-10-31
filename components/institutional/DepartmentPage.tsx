"use client";
/**
 * Página do departamento com dados reais (RF14; auditoria Onda 1, 31/10/2026). Cabeçalho por `GET /api/departments/{slug}`: sigla,
 * nome, cor e monograma, capa se houver, chefe (projeção pública com link para o perfil), empresa com link e contadores do servidor
 * (pessoas com lotação vigente, seguidores) com o botão Seguir. "Sobre" mostra o texto do departamento e "Equipe" as pessoas ativas
 * por `GET /api/departments/{slug}/members` (sem contato). Inexistente ou inativo → "departamento não encontrado" (404 uniforme do
 * servidor); sem sessão → Entrar. Sub-abas sem fonte real (projetos, sessões, chancelas…) seguem com o aviso padrão.
 */
import { useCallback, useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { Card, EmptyState, ErrorState, Link, LoadingState, Monogram } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { ApiError, describeError } from "@/lib/api/client";
import { useApiImage } from "@/lib/api/useApiImage";
import { useI18n } from "@/lib/i18n/useI18n";
import { companyHref, departmentHref, institutionApi, nodeColor, type DepartmentPageView, type PersonCard } from "@/lib/institutional/client";
import type { PageEntry } from "@/lib/pages/registry";
import { useCurrentUser } from "@/lib/session/CurrentUserProvider";
import { FollowInstitutionButton, useInstitutionFollow } from "./FollowInstitution";
import { InstitutionCounters, InstitutionNotFound, PersonList, SignInToSee, personName } from "./shared";

export type Load<T> = { kind: "loading" } | { kind: "ok"; data: T } | { kind: "notFound" } | { kind: "signin" } | { kind: "error"; message: string };

/**
 * Carrega um recurso da API com os estados da página (404 e 401 viram estados próprios). `key` identifica o recurso: só ele (e "tentar
 * de novo") dispara uma nova leitura.
 */
export function useInstitutionLoad<T>(key: string, load: (signal: AbortSignal) => Promise<T>): [Load<T>, () => void] {
  const [state, setState] = useState<Load<T>>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ kind: "loading" });
    load(ctrl.signal).then(
      (data) => { if (!ctrl.signal.aborted) setState({ kind: "ok", data }); },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 404) setState({ kind: "notFound" });
        else if (e instanceof ApiError && e.status === 401) setState({ kind: "signin" });
        else setState({ kind: "error", message: describeError(e) });
      },
    );
    return () => ctrl.abort();
  }, [key, attempt]); // `load` é recriada a cada render; o recurso é identificado por `key`
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return [state, retry];
}

function Cover({ url }: { url: string }) {
  const image = useApiImage(url);
  if (!image.src) return null;
  return (
    <div
      aria-hidden
      className="h-24 w-full rounded-[var(--ws-radius-md)] bg-cover bg-center sm:h-32"
      style={{ backgroundImage: `url("${image.src.replace(/"/g, "%22")}")` }}
      data-testid="department-cover"
    />
  );
}

function DepartmentHeaderReal({ d, company }: { d: DepartmentPageView; company: string | null }) {
  const { t } = useI18n();
  const acronym = d.acronym?.trim() || d.name;
  const follow = useInstitutionFollow({ kind: "department", slug: d.slug, company: company ?? d.company.slug });
  const head: PersonCard | null | undefined = d.head;
  return (
    <Card tone="clay" className="grid gap-[var(--ws-space-4)]" data-testid="department-header">
      {d.coverUrl ? <Cover url={d.coverUrl} /> : null}
      <div className="grid gap-[var(--ws-space-4)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 items-start gap-[var(--ws-space-4)]">
          <Monogram name={acronym} monogram={(d.monogram?.trim() || acronym).slice(0, 3).toUpperCase()} node={nodeColor(d.color)} size={64} />
          <div className="grid min-w-0 gap-1">
            <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-tight [overflow-wrap:anywhere]" data-testid="department-acronym">{acronym}</h2>
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted [overflow-wrap:anywhere]">
              {d.name} · <Link href={companyHref(d.company.slug)} data-testid="department-company">{d.company.name}</Link>
            </p>
            {head ? (
              <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-body-sm)]" data-testid="department-head">
                <ProfileAvatar name={personName(head)} src={head.avatarUrl} size={24} />
                <span>{t("social.institution.headLine", { acronym })}</span>
                {head.username ? <Link href={`/u/${encodeURIComponent(head.username)}`}>{personName(head)}</Link> : <span>{personName(head)}</span>}
                {head.jobTitle ? <span className="text-ws-text-muted">· {head.jobTitle}</span> : null}
              </p>
            ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("social.institution.noHead")}</p>}
            <div className="mt-1 flex flex-wrap gap-2"><FollowInstitutionButton name={acronym} state={follow} /></div>
          </div>
        </div>
        <InstitutionCounters items={[
          { key: "people", label: t("social.institution.counter.people"), value: d.members },
          { key: "followers", label: t("social.institution.counter.followers"), value: follow.view?.followers ?? d.followers },
        ]} />
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.institution.realCountersHint")}</p>
    </Card>
  );
}

function About({ text }: { text?: string | null }) {
  const { t } = useI18n();
  return text?.trim()
    ? <p className="max-w-prose whitespace-pre-line text-[length:var(--ws-text-body)] [overflow-wrap:anywhere]" data-testid="institution-about">{text}</p>
    : <EmptyState moji="vazio" title={t("social.institution.noAbout")} description={t("social.institution.noAboutHint")} />;
}

function Team({ d, company }: { d: DepartmentPageView; company: string | null }) {
  const { t } = useI18n();
  const slug = d.slug;
  const companySlug = company ?? d.company.slug;
  const [state, retry] = useInstitutionLoad(`${slug}|${companySlug}`, (signal) => institutionApi.members(slug, companySlug, signal));
  if (state.kind === "loading") return <LoadingState />;
  if (state.kind !== "ok") return <ErrorState title={t("social.institution.teamError")} description={state.kind === "error" ? state.message : t("social.institution.notFoundHint")} onRetry={retry} />;
  if (!state.data.length) return <EmptyState moji="vazio" title={t("social.institution.noTeam")} description={t("social.institution.noTeamHint")} />;
  return (
    <div className="grid gap-2">
      <PersonList people={state.data} label={t("tabs.department.equipe")} testId="department-team" />
      {state.data.length < d.members ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("social.institution.teamHiddenHint")}</p> : null}
    </div>
  );
}

function SignedInDepartment({ page, slug, company }: { page: PageEntry; slug: string; company: string | null }) {
  const { t } = useI18n();
  const [state, retry] = useInstitutionLoad(`${slug}|${company ?? ""}`, (signal) => institutionApi.department(slug, company, signal));
  if (state.kind === "loading") return <LoadingState />;
  if (state.kind === "notFound") return <InstitutionNotFound titleKey="social.institution.departmentNotFound" hintKey="social.institution.notFoundHint" testId="department-not-found" />;
  if (state.kind === "signin") return <SignInToSee next={departmentHref(slug, company)} titleKey="social.institution.signInTitle" hintKey="social.institution.signInHint" testId="department-sign-in" />;
  if (state.kind === "error") return <ErrorState title={t("social.institution.loadError")} description={state.message} onRetry={retry} />;
  const d = state.data;
  return (
    <RfPage
      page={page}
      subtitle={d.acronym?.trim() || d.name}
      renderTab={(tab) => (tab === "sobre" ? <About text={d.about} /> : tab === "equipe" ? <Team d={d} company={company} /> : undefined)}
    >
      <DepartmentHeaderReal d={d} company={company} />
    </RfPage>
  );
}

export function DepartmentPageReal({ page, slug, company }: { page: PageEntry; slug: string; company: string | null }) {
  const { status } = useCurrentUser();
  if (status === "loading") return <LoadingState />;
  if (status !== "authenticated") {
    return <SignInToSee next={departmentHref(slug, company)} titleKey="social.institution.signInTitle" hintKey="social.institution.signInHint" testId="department-sign-in" />;
  }
  return <SignedInDepartment key={`${slug}|${company ?? ""}`} page={page} slug={slug} company={company} />;
}
