"use client";
/**
 * Parte institucional do próprio perfil (RF6; auditoria Onda 1, 31/10/2026), separada do portfólio (Acervo Digital e demais
 * sub-abas): `GET /api/me/institution`. Conta EMPRESA → a empresa da qual é dona, a situação, os departamentos ativos com link e os
 * totais devolvidos pela API (departamentos, pessoas ativas). Demais contas → a empresa e os departamentos da lotação vigente. Sem
 * vínculo, a conta EMPRESA vê o aviso de que a página institucional ainda não existe; as demais não veem nada. Erro de leitura não
 * derruba o perfil: a seção some.
 */
import { useEffect, useState } from "react";
import { Badge, Card, Link, Monogram } from "@/components/ui";
import { DepartmentList, InstitutionCounters } from "@/components/institutional/shared";
import { useI18n } from "@/lib/i18n/useI18n";
import { companyHref, institutionApi, nodeColor, type MyInstitutionView } from "@/lib/institutional/client";

export function useMyInstitution(enabled = true): MyInstitutionView | null | undefined {
  const [view, setView] = useState<MyInstitutionView | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    institutionApi.mine(ctrl.signal).then((v) => { if (!ctrl.signal.aborted) setView(v); }, () => { if (!ctrl.signal.aborted) setView(null); });
    return () => ctrl.abort();
  }, [enabled]);
  return view;
}

export function MyInstitution({ isCompany }: { isCompany: boolean }) {
  const { t } = useI18n();
  const view = useMyInstitution();
  if (!view) return null;
  const c = view.company;
  if (!c) {
    return isCompany ? (
      <Card as="section" title={t("ownProfile.institution.title")} eyebrow="RF6" data-testid="my-institution">
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("ownProfile.institution.noCompany")}</p>
      </Card>
    ) : null;
  }
  const title = view.owner ? t("ownProfile.institution.title") : t("ownProfile.institution.placement");
  return (
    <Card as="section" title={title} eyebrow="RF6" data-testid="my-institution">
      <div className="grid gap-[var(--ws-space-3)]">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Monogram name={c.name} node={nodeColor(c.accentColor) ?? "orange"} size={40} />
          <Link href={companyHref(c.slug)} className="min-w-0 font-semibold [overflow-wrap:anywhere]" data-testid="my-institution-company">{c.name}</Link>
          {view.owner ? <Badge tone="success">{t("company.owner")}</Badge> : null}
          {view.companyStatus && view.companyStatus !== "ATIVA" ? <Badge tone="warning">{t(`ownProfile.institution.status.${view.companyStatus}`)}</Badge> : null}
        </div>
        {view.owner ? (
          <InstitutionCounters testId="my-institution-counters" items={[
            { key: "departments", label: t("social.institution.counter.departments"), value: view.departments.length },
            ...(typeof view.people === "number" ? [{ key: "people", label: t("social.institution.counter.people"), value: view.people }] : []),
          ]} />
        ) : null}
        {view.departments.length
          ? <DepartmentList departments={view.departments} label={t("ownProfile.institution.departments")} testId="my-institution-departments" />
          : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(view.owner ? "ownProfile.institution.noDepartments" : "ownProfile.institution.noPlacement")}</p>}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("ownProfile.institution.hint")}</p>
      </div>
    </Card>
  );
}
