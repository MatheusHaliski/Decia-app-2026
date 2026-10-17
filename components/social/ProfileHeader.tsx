"use client";
/**
 * Cabeçalho do perfil (Matriz B "Cabeçalho"; RF6.CA01, RF16.CA01/CA04/CA06): avatar, nome, cargo, empresa,
 * departamento (monograma), etiqueta institucional com atalho (chefe → /departments/[slug] RF14; EMPRESA →
 * /companies/[slug] RF15), contadores REAIS do view model — tarefas, projetos, decisões, seguidores, DECIA Points (só o
 * dono) e Hype (conforme hypeVisibility) — e o botão Seguir para terceiros.
 */
import { Avatar, Badge, Button, Card, Link, Monogram } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ProfileHeaderViewModel } from "@/lib/social/view-model";
import { FollowButton } from "./FollowButton";

export function SocialProfileHeader({ vm }: { vm: ProfileHeaderViewModel }) {
  const { t, intl } = useI18n();
  const p = vm.person;
  const fmt = new Intl.NumberFormat(intl);
  const role = p.profileType === "EMPRESA" ? t("social.profile.institutionalAccount") : p.jobTitle;
  return (
    <Card tone="clay" className="grid gap-[var(--ws-space-4)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center" data-testid="profile-header">
      <div className="flex min-w-0 items-start gap-[var(--ws-space-4)]">
        {p.profileType === "EMPRESA" ? <Monogram name={p.name} monogram={p.name.slice(0, 3).toUpperCase()} node="orange" size={64} /> : <Avatar name={p.name} node={p.node} size={64} />}
        <div className="grid min-w-0 gap-1">
          <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold leading-tight [overflow-wrap:anywhere]" data-testid="profile-name">{p.name}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted [overflow-wrap:anywhere]">@{p.username}{role ? ` · ${role}` : ""}</p>
          <div className="flex flex-wrap items-center gap-2">
            {vm.department ? (
              <Link href={`/departments/${vm.department.slug}`} variant="plain" className="inline-flex items-center gap-1.5 text-[length:var(--ws-text-caption)] hover:underline">
                <Monogram name={vm.department.acronym} monogram={vm.department.acronym.replace(/^SECID-/, "").slice(0, 3)} node={vm.department.color} size={24} />
                {vm.department.acronym}
              </Link>
            ) : null}
            {vm.company ? <Link href={`/companies/${vm.company.slug}`} variant="plain" className="text-[length:var(--ws-text-caption)] hover:underline">{vm.company.name}</Link> : null}
            {vm.institutional?.kind === "CHEFE" ? <Badge tone="orange" title={t("social.profile.headOfHint")}>{t("social.profile.headOf", { acronym: vm.institutional.acronym })}</Badge> : null}
            {vm.institutional?.kind === "EMPRESA" ? <Badge tone="info">{t("social.profile.institutional")}</Badge> : null}
            {!vm.isSelf ? <Badge tone="neutral">{t("profile.thirdPartyView")}</Badge> : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {!vm.isSelf ? <FollowButton targetType="USER" targetId={p.id} name={p.name} /> : null}
            {vm.institutional ? (
              <Button size="sm" variant="secondary" href={vm.institutional.href} data-testid="institutional-link">
                {vm.institutional.kind === "CHEFE" ? t("social.profile.openDepartment", { acronym: vm.institutional.acronym }) : t("social.profile.openCompany")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-center sm:grid-cols-7 md:min-w-[24rem]" data-testid="profile-counters">
        {vm.counters.map((c) => (
          <div key={c.key} className="min-w-0" data-counter={c.key}>
            <dt className="truncate text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t(`profile.counter.${c.key}`)}</dt>
            <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums">
              {c.value === null ? <><span aria-hidden>—</span><span className="sr-only">{t("social.profile.hiddenCounter")}</span></> : fmt.format(c.value)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
