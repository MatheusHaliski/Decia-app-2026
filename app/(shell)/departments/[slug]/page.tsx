"use client";
// Página do DEPARTAMENTO / CHEFE (RF14/RF28; Matriz D, ABAS_POR_PERFIL §5). Equipe = público; "Minha equipe" = gestão (§7.b).
import { useParams } from "next/navigation";
import { Badge, Button, Card, Monogram } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/departments/[slug]")!;

export default function DepartmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { profile, user } = useViewer();
  const head = profile === "CHEFE" && user.departmentSlug === slug;
  return (
    <RfPage
      page={PAGE}
      subtitle={slug}
      actions={head ? <Badge tone="success">{t("department.head")}</Badge> : <Button size="sm">{t("common.follow")}</Button>}
      renderTab={(tab) =>
        tab === "minha-equipe" ? (
          <Card title={t("tabs.department.minhaEquipe")} eyebrow={t("common.proposal")} actions={<Button size="sm" variant="primary" href={`/departments/${slug}/team?mode=manage`}>{t("department.openManage")}</Button>}>
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("department.manageHint")}</p>
          </Card>
        ) : undefined
      }
    >
      <Card tone="clay" className="flex flex-wrap items-center gap-[var(--ws-space-4)]">
        <Monogram name={slug} monogram={slug.replace(/^secid-/, "").slice(0, 3).toUpperCase()} node="blue" size={64} />
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold">{slug.toUpperCase()}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("viewer.company.exemplo")} · /departments/{slug}</p>
        </div>
      </Card>
    </RfPage>
  );
}
