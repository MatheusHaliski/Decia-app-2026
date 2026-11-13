"use client";
// /goals: Metas & objetivos. Sub-aba "Pactos de desbloqueio" (RF49, funcional com dados DEMO em lib/pacts) e "Metas coletivas"
// (RF35, ainda não implementadas — os CAs aparecem no bloco do RF abaixo).
import { Suspense } from "react";
import { PactsWorkspace } from "@/components/pacts/PactsWorkspace";
import { RfPage } from "@/components/shell/RfPage";
import { Badge, EmptyState, LoadingState, Tabs } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/goals")!;

function GoalsTabs() {
  const { t } = useI18n();
  return (
    <Tabs tabs={[{ slug: "pactos", label: t("goals.tab.pacts") }, { slug: "metas", label: t("goals.tab.goals") }]} label={t("goals.tabsLabel")} param="tab">
      {(active) =>
        active === "metas" ? (
          <EmptyState moji="vazio" title={t("goals.goalsEmpty.title")} description={t("goals.goalsEmpty.description")} />
        ) : (
          <PactsWorkspace />
        )
      }
    </Tabs>
  );
}

export default function Page() {
  const { t } = useI18n();
  return (
    <RfPage page={PAGE} noEmpty actions={<Badge tone="neutral" title={t("pacts.demoHint")}>{t("decia.demo")}</Badge>}>
      <Suspense fallback={<LoadingState />}>
        <GoalsTabs />
      </Suspense>
    </RfPage>
  );
}
