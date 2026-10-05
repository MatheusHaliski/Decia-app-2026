"use client";
// /lab/perfis: visibilidade das abas por perfil (ABAS_POR_PERFIL.md Matrizes A–E) com o perfil de VISUALIZAÇÃO do shell
// (D-32). A tabela lê a mesma matriz que a sidebar usa; o wireframe docs/lab/perfis.html vem embaixo como referência.
import { Fragment } from "react";
import { Badge, Card, Glyph, Link, cn } from "@/components/ui";
import { LabEmbed } from "@/components/shell/LabEmbed";
import { PageHeader } from "@/components/shell/PageHeader";
import { ViewerProfileSelect } from "@/components/shell/UserPanel";
import { useI18n } from "@/lib/i18n/useI18n";
import { NAV_GROUPS, resolveHref } from "@/lib/nav/matrix";
import { PAGES, PROFILE_TABS } from "@/lib/pages/registry";
import { VIEWER_PROFILES, type Access } from "@/lib/viewer/profiles";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const CELL: Record<Access, string> = { E: "bg-ws-success-soft text-ws-success-ink", V: "bg-ws-info-soft text-ws-info-ink", O: "bg-ws-surface-2 text-ws-text-faint" };

export default function PerfisLab() {
  const { t } = useI18n();
  const { profile, user } = useViewer();
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <PageHeader title={t("lab.perfis")} glyph="perfil" rfs={["RF14", "RF15", "RF16"]} description={t("lab.perfisDescription")} eyebrow={t("common.lab")} actions={<ViewerProfileSelect />} />
      <Card title={t("lab.matrixA")} eyebrow="ABAS_POR_PERFIL.md §2" padding="sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[length:var(--ws-text-caption)]">
            <thead>
              <tr className="text-left">
                <th className="p-2">{t("lab.item")}</th>
                <th className="p-2">RF</th>
                {VIEWER_PROFILES.map((p) => <th key={p} className={cn("p-2 text-center", p === profile && "bg-ws-accent-soft")}>{t(`profile.${p}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {NAV_GROUPS.map((g) => (
                <Fragment key={g.id}>
                  <tr><td colSpan={2 + VIEWER_PROFILES.length} className="p-2 pt-3 font-[family-name:var(--ws-font-mono)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{t(g.labelKey)}</td></tr>
                  {g.items.map((item) => (
                    <tr key={item.id} className="border-t border-ws-border">
                      <td className="p-2"><Link href={resolveHref(item, user)} variant="plain" className="inline-flex items-center gap-1.5 hover:underline"><Glyph name={item.glyph} size={16} decorative />{t(item.labelKey)}{item.proposal ? <Badge tone="spark">{t("common.proposal")}</Badge> : null}</Link></td>
                      <td className="p-2 font-[family-name:var(--ws-font-mono)]">{item.rfs.join(" ")}</td>
                      {VIEWER_PROFILES.map((p) => <td key={p} className={cn("p-2 text-center font-bold", CELL[item.access[p]], p === profile && "outline outline-1 outline-ws-accent")}>{item.access[p]}</td>)}
                    </tr>
                  ))}
                </Fragment>
              ))}
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
              {tb.thirdParty ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("lab.public")}</span> : null}
            </li>
          ))}
        </ol>
      </Card>
      <Card title={t("lab.pagesByProfile")} eyebrow="lib/pages/registry.ts" padding="sm">
        <ul className="grid gap-1 text-[length:var(--ws-text-caption)] sm:grid-cols-2 md:grid-cols-3">
          {PAGES.map((pg) => (
            <li key={pg.route} className={cn("flex items-center justify-between gap-2 rounded-[var(--ws-radius-sm)] px-2 py-1", CELL[pg.access[profile]])}>
              <Link href={pg.route.replace("[slug]", user.companySlug ?? "secretaria-exemplo").replace("[username]", "pessoa.exemplo").replace("[id]", "exemplo").replace("[sessionId]", "exemplo").replace("[conversationId]", "exemplo")} variant="plain" className="truncate font-[family-name:var(--ws-font-mono)] hover:underline">{pg.route}</Link>
              <span className="font-bold">{pg.access[profile]}</span>
            </li>
          ))}
        </ul>
      </Card>
      <LabEmbed file="perfis.html" title={t("lab.perfis")} source="docs/lab/perfis.html" />
    </div>
  );
}
