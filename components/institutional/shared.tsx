"use client";
/**
 * Peças comuns das páginas institucionais reais (RF14, RF15, RF6): contadores só com números do servidor, lista de pessoas (projeção
 * pública, sem contato, foto por `ProfileAvatar`), lista de departamentos com link, e os estados "entre para ver" e "não encontrado".
 */
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { Badge, Button, EmptyState, Link, Monogram } from "@/components/ui";
import { loginUrl } from "@/lib/auth/next";
import { useI18n } from "@/lib/i18n/useI18n";
import { departmentHref, nodeColor, type DepartmentSummary, type PersonCard } from "@/lib/institutional/client";

export interface CounterItem { key: string; label: string; value: number | null | undefined }

/** `dl` de contadores; traço com texto para leitor de tela enquanto o número não chegou. */
export function InstitutionCounters({ items, testId = "institution-counters" }: { items: readonly CounterItem[]; testId?: string }) {
  const { t, intl } = useI18n();
  const fmt = new Intl.NumberFormat(intl);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-center sm:grid-cols-3" data-testid={testId}>
      {items.map((c) => (
        <div key={c.key} className="min-w-0" data-counter={c.key}>
          <dt className="truncate text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted" title={c.label}>{c.label}</dt>
          <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums">
            {typeof c.value === "number" ? fmt.format(c.value) : <><span aria-hidden>—</span><span className="sr-only">{t("ownProfile.counterLoading")}</span></>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export const personName = (p: PersonCard) => p.name?.trim() || `@${p.username ?? ""}`;

/** Pessoas na projeção pública: foto (ou iniciais), nome com link para o perfil, cargo e papel na lotação. */
export function PersonList({ people, label, testId }: { people: readonly PersonCard[]; label: string; testId?: string }) {
  const { t } = useI18n();
  return (
    <ul aria-label={label} className="grid gap-2 sm:grid-cols-2" data-testid={testId}>
      {people.map((p) => (
        <li key={p.id} className="flex min-w-0 items-center gap-3 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3">
          <ProfileAvatar name={personName(p)} src={p.avatarUrl} size={40} />
          <span className="grid min-w-0 gap-0.5">
            {p.username ? <Link href={`/u/${encodeURIComponent(p.username)}`} className="truncate font-semibold">{personName(p)}</Link> : <span className="truncate font-semibold">{personName(p)}</span>}
            {p.jobTitle ? <span className="truncate text-[length:var(--ws-text-caption)] text-ws-text-muted">{p.jobTitle}</span> : null}
          </span>
          {p.role && p.role !== "MEMBRO" ? <Badge tone={p.role === "CHEFE" ? "accent" : "info"} className="ml-auto shrink-0">{t(`social.institution.role.${p.role}`)}</Badge> : null}
        </li>
      ))}
    </ul>
  );
}

/** Departamentos com sigla, nome, pessoas com lotação vigente e link para a página (RF14). */
export function DepartmentList({ departments, label, testId }: { departments: readonly DepartmentSummary[]; label: string; testId?: string }) {
  const { t, intl } = useI18n();
  const fmt = new Intl.NumberFormat(intl);
  return (
    <ul aria-label={label} className="grid gap-2 sm:grid-cols-2" data-testid={testId}>
      {departments.map((d) => {
        const acronym = d.acronym?.trim() || d.name;
        return (
          <li key={d.id} className="flex min-w-0 items-center gap-3 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3">
            <Monogram name={acronym} monogram={(d.monogram?.trim() || acronym).slice(0, 3).toUpperCase()} node={nodeColor(d.color)} size={40} />
            <span className="grid min-w-0 gap-0.5">
              <Link href={departmentHref(d.slug, d.companySlug)} className="truncate font-semibold">{acronym}</Link>
              <span className="truncate text-[length:var(--ws-text-caption)] text-ws-text-muted">{d.name}</span>
            </span>
            <span className="ml-auto shrink-0 text-[length:var(--ws-text-caption)] text-ws-text-muted tabular-nums">{t("social.institution.peopleCount", { n: fmt.format(d.members) })}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function SignInToSee({ next, titleKey, hintKey, testId }: { next: string; titleKey: string; hintKey: string; testId: string }) {
  const { t } = useI18n();
  return (
    <EmptyState
      moji="vazio"
      title={t(titleKey)}
      description={t(hintKey)}
      action={<Button variant="primary" href={loginUrl(next)} data-testid={testId}>{t("nav.login")}</Button>}
    />
  );
}

export function InstitutionNotFound({ titleKey, hintKey, testId }: { titleKey: string; hintKey: string; testId: string }) {
  const { t } = useI18n();
  return (
    <div data-testid={testId}>
      <EmptyState moji="vazio" title={t(titleKey)} description={t(hintKey)} action={<Button href="/search">{t("social.institution.search")}</Button>} />
    </div>
  );
}
