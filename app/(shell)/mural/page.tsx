"use client";
// /mural (RF27.CA01/CA02/CA06): Mural da empresa · Vitrine de projetos · Seguindo, com a barra social inline (RF18/RF19).
// Dados DEMO no repositório em memória da rede social (lib/social/repository.ts) — a API do Mural ainda não existe.
import { MuralFeed } from "@/components/social";
import { RfPage } from "@/components/shell/RfPage";
import { Badge } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import type { MuralTab } from "@/lib/social/rules";

const PAGE = pageByRoute("/mural")!;

export default function Page() {
  const { t } = useI18n();
  return (
    <RfPage
      page={PAGE}
      actions={<Badge tone="neutral" title={t("social.demoHint")}>{t("decia.demo")}</Badge>}
      renderTab={(slug) => <MuralFeed tab={(slug === "vitrine" || slug === "seguindo" ? slug : "empresa") as MuralTab} />}
    />
  );
}
