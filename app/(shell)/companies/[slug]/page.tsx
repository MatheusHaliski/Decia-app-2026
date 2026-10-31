"use client";
// Página da EMPRESA (RF15/RF28; Matriz C, ABAS_POR_PERFIL §4): abas públicas + "Gestão" só da dona (§7.c, opção C).
// No laboratório (NEXT_PUBLIC_WS_LAB=on) e sem provedor de sessão: cabeçalho RF15.CA01 (contadores institucionais, Seguir) e projetos
// publicados em "Sobre", sobre o repositório DEMO social. Fora do laboratório, com sessão: dados reais
// (`components/institutional/CompanyPage`, `GET /api/companies/{slug}`).
import { useParams } from "next/navigation";
import { CompanyPageReal } from "@/components/institutional/CompanyPage";
import { CompanyHeader, PublishedProjects, useCompanyProjects, useSocial } from "@/components/social";
import { Badge, Card, Glyph, Link, Monogram } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { companyBySlug } from "@/lib/social/rules";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { labMode } from "@/lib/viewer/lab";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/companies/[slug]")!;
const GESTAO_ITEMS = ["departamentos", "pessoas", "chancelas", "beneficios", "planoAnual", "programas", "politicas", "dashboard", "insights", "dossies", "comunicados"] as const;

export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const session = useOptionalCurrentUser();
  if (session && !labMode()) return <CompanyPageReal page={PAGE} slug={slug} />;
  return <DemoCompanyPage slug={slug} />;
}

function DemoCompanyPage({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { profile, user } = useViewer();
  const owner = profile === "EMPRESA" && user.companySlug === slug;
  const { state } = useSocial();
  const known = !!companyBySlug(state, slug);
  const projects = useCompanyProjects(slug);
  return (
    <RfPage
      page={PAGE}
      subtitle={slug}
      actions={owner ? <><Badge tone="success">{t("company.owner")}</Badge></> : known ? <Badge tone="neutral" title={t("social.demoHint")}>{t("decia.demo")}</Badge> : undefined}
      renderTab={(tab) =>
        tab === "sobre" && known ? (
          <section aria-labelledby="company-projects" className="grid gap-3">
            <h2 id="company-projects" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("social.institution.projects")}</h2>
            <PublishedProjects projects={projects} />
          </section>
        ) : tab === "gestao" ? (
          <Card title={t("tabs.company.gestao")} eyebrow={t("common.proposal")}>
            <ul className="grid gap-1 sm:grid-cols-2">
              {GESTAO_ITEMS.map((k) => (
                <li key={k}>
                  <Link href={k === "departamentos" ? `/companies/${slug}/manage/departments` : k === "dashboard" ? "/issuer/dashboard" : k === "chancelas" ? "/seals" : k === "beneficios" ? "/benefits" : k === "dossies" ? "/handoffs" : k === "insights" ? "/insights?tab=equipe" : `/companies/${slug}?tab=${k === "planoAnual" ? "plano-anual" : k === "politicas" ? "gestao" : k}`} variant="nav">
                    <Glyph name="configuracoes" size={18} decorative />
                    {t(`company.gestao.${k}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : undefined
      }
    >
      {known ? <CompanyHeader slug={slug} /> : <Card tone="clay" className="flex flex-wrap items-center gap-[var(--ws-space-4)]">
        <Monogram name={slug} monogram={slug.slice(0, 3).toUpperCase()} node="orange" size={64} />
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold">{t("viewer.company.exemplo")}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">/companies/{slug} · {t("company.publicMetrics")}</p>
        </div>
      </Card>}
    </RfPage>
  );
}
