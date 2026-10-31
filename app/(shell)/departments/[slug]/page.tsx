"use client";
// Página do DEPARTAMENTO / CHEFE (RF14/RF28; Matriz D, ABAS_POR_PERFIL §5). Equipe = público; "Minha equipe" = gestão (§7.b).
// No laboratório (NEXT_PUBLIC_WS_LAB=on) e sem provedor de sessão: cabeçalho RF14.CA01 (contadores, chefe, Seguir) e projetos publicados
// (RF14.CA02) sobre o repositório DEMO da rede social. Fora do laboratório, com sessão: dados reais (`components/institutional/
// DepartmentPage`, `GET /api/departments/{slug}`; `?company=` desambigua o slug, que só é único dentro da empresa).
import { useParams, useSearchParams } from "next/navigation";
import { DepartmentPageReal } from "@/components/institutional/DepartmentPage";
import { DepartmentHeader, PublishedProjects, useDepartmentProjects, useSocial } from "@/components/social";
import { Badge, Button, Card, Monogram } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { departmentBySlug } from "@/lib/social/rules";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { labMode } from "@/lib/viewer/lab";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/departments/[slug]")!;

export default function DepartmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const company = useSearchParams()?.get("company") ?? null;
  const session = useOptionalCurrentUser();
  if (session && !labMode()) return <DepartmentPageReal page={PAGE} slug={slug} company={company} />;
  return <DemoDepartmentPage slug={slug} />;
}

function DemoDepartmentPage({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { profile, user } = useViewer();
  const head = profile === "CHEFE" && user.departmentSlug === slug;
  const { state } = useSocial();
  const known = !!departmentBySlug(state, slug);
  const projects = useDepartmentProjects(slug);
  return (
    <RfPage
      page={PAGE}
      subtitle={slug}
      actions={head ? <Badge tone="success">{t("department.head")}</Badge> : known ? <Badge tone="neutral" title={t("social.demoHint")}>{t("decia.demo")}</Badge> : <Button size="sm">{t("common.follow")}</Button>}
      renderTab={(tab) =>
        tab === "projetos" && known ? <PublishedProjects projects={projects} /> : tab === "minha-equipe" ? (
          <Card title={t("tabs.department.minhaEquipe")} eyebrow={t("common.proposal")} actions={<Button size="sm" variant="primary" href={`/departments/${slug}/team?mode=manage`}>{t("department.openManage")}</Button>}>
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("department.manageHint")}</p>
          </Card>
        ) : undefined
      }
    >
      {known ? <DepartmentHeader slug={slug} /> : <Card tone="clay" className="flex flex-wrap items-center gap-[var(--ws-space-4)]">
        <Monogram name={slug} monogram={slug.replace(/^secid-/, "").slice(0, 3).toUpperCase()} node="blue" size={64} />
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold">{slug.toUpperCase()}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("viewer.company.exemplo")} · /departments/{slug}</p>
        </div>
      </Card>}
    </RfPage>
  );
}
