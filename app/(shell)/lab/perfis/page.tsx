"use client";
// /lab/perfis — Simulador de Perfis e Governança (D-35): troque o perfil de visualização do app (Empregado, Empresa, Chefe, Curador,
// Admin, Visitante), compare dois perfis lado a lado com o porquê de cada permissão e siga os cenários guiados. Tudo lido da MESMA
// matriz do registro (lib/pages/registry.ts) que alimenta a sidebar, o middleware e o 403 das páginas. A matriz completa e a Matriz B
// (sub-abas do perfil) vêm embaixo; o wireframe docs/lab/perfis.html fica como referência.
import { Fragment } from "react";
import { Badge, Card, Link, cn } from "@/components/ui";
import { LabEmbed } from "@/components/shell/LabEmbed";
import { PageHeader } from "@/components/shell/PageHeader";
import { ViewerProfileSelect } from "@/components/shell/UserPanel";
import { CellTag, ProfileSimulator } from "@/components/lab/ProfileSimulator";
import { concreteHref, navGroupOf } from "@/components/lab/simulator";
import { useI18n } from "@/lib/i18n/useI18n";
import { NAV_GROUPS } from "@/lib/nav/matrix";
import { PAGES, PROFILE_TABS } from "@/lib/pages/registry";
import { VIEWER_PROFILES } from "@/lib/viewer/profiles";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const GROUPS = [...NAV_GROUPS.map((g) => ({ id: g.id as string, labelKey: g.labelKey })), { id: "outras", labelKey: "labSim.group.outras" }];

export default function PerfisLab() {
  const { t } = useI18n();
  const { profile, user } = useViewer();
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <PageHeader title={t("lab.perfis")} glyph="perfil" rfs={["RF14", "RF15", "RF16"]} description={t("labSim.pageDescription")} eyebrow={t("common.lab")} actions={<ViewerProfileSelect />} />
      <ProfileSimulator />
      <Card title={t("labSim.matrix.title")} eyebrow="lib/pages/registry.ts · ABAS_POR_PERFIL.md §2" padding="sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[length:var(--ws-text-caption)]" data-testid="sim-matrix">
            <caption className="sr-only">{t("labSim.matrix.caption")}</caption>
            <thead>
              <tr className="text-left">
                <th scope="col" className="p-2">{t("lab.item")}</th>
                <th scope="col" className="p-2">RF</th>
                {VIEWER_PROFILES.map((p) => <th key={p} scope="col" className={cn("p-2 text-center", p === profile && "bg-ws-accent-soft")}>{t(`profile.${p}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => {
                const pages = PAGES.filter((p) => (navGroupOf(p.route) ?? "outras") === g.id);
                if (!pages.length) return null;
                return (
                  <Fragment key={g.id}>
                    <tr><th scope="colgroup" colSpan={2 + VIEWER_PROFILES.length} className="p-2 pt-3 text-left font-[family-name:var(--ws-font-mono)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t(g.labelKey)}</th></tr>
                    {pages.map((pg) => (
                      <tr key={pg.route} className="border-t border-ws-border">
                        <th scope="row" className="p-2 text-left font-normal">
                          <Link href={concreteHref(pg.route, user)} variant="plain" className="hover:underline">{t(pg.titleKey)}</Link>
                          {pg.note === "proposal" ? <Badge tone="spark" className="ml-1">{t("common.proposal")}</Badge> : null}
                          <span className="block font-[family-name:var(--ws-font-mono)] text-ws-text-muted">{pg.route}</span>
                        </th>
                        <td className="p-2 font-[family-name:var(--ws-font-mono)]">{pg.rfs.slice(0, 3).join(" ")}</td>
                        {VIEWER_PROFILES.map((p) => (
                          <td key={p} className={cn("p-2 text-center", p === profile && "outline outline-1 outline-ws-accent")}><CellTag cell={pg.access[p]} /></td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title={t("lab.matrixB")} eyebrow="ABAS_POR_PERFIL.md §3" padding="sm">
        <ol className="grid gap-1 text-[length:var(--ws-text-body-sm)] sm:grid-cols-3">
          {PROFILE_TABS.map((tb) => (
            <li key={tb.slug} className="flex items-center gap-2 rounded-[var(--ws-radius-sm)] p-1">
              <Badge tone={tb.thirdParty ? "info" : "neutral"}>{tb.n}</Badge>
              <span className={cn(tb.hiddenFor?.includes(profile) && "line-through text-ws-text-faint")}>{t(tb.labelKey)}</span>
              {tb.hiddenFor?.includes(profile) ? <span className="sr-only">{t("labSim.cell.O")}</span> : null}
              {tb.thirdParty ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("lab.public")}</span> : null}
            </li>
          ))}
        </ol>
      </Card>
      <LabEmbed file="perfis.html" title={t("lab.perfis")} source="docs/lab/perfis.html" />
    </div>
  );
}
