"use client";
// Página-esqueleto da rota /find (RF47 Encontrar; ABAS_POR_PERFIL.md / docs/diagramas/RF47). Ferramentas do card: A busca com
// palavra no contexto · B leitor com mapa · C extrair termos e entidades · lista de termos — as mesmas do dossiê do RF48
// (RF47.CA14). "Testar esta contratação" abre a aba Agentes (RF48). Conteúdo real chega no RF47.
import { AreaPreview, EXTRACT_AREA_ITEMS, FIND_AREA_ITEMS, LIST_AREA_ITEMS, READ_AREA_ITEMS } from "@/components/shell/AreaPreview";
import { RfPage } from "@/components/shell/RfPage";
import { Link } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/find")!;

export default function Page() {
  const { t } = useI18n();
  return (
    <RfPage
      page={PAGE}
      actions={<Link href="/agents" data-testid="find-test-contract">{t("find.testContract")}</Link>}
      renderTab={(slug) => {
        if (slug === "ler") return <AreaPreview testId="find-area-ler" titleKey="find.area.ler.title" descriptionKey="find.area.ler.description" itemKeys={[...READ_AREA_ITEMS, "find.area.ler.vincular"]} />;
        if (slug === "extrair") return <AreaPreview testId="find-area-extrair" titleKey="find.area.extrair.title" descriptionKey="find.area.extrair.description" itemKeys={EXTRACT_AREA_ITEMS} />;
        if (slug === "lista") return <AreaPreview testId="find-area-lista" titleKey="find.area.lista.title" descriptionKey="find.area.lista.description" itemKeys={LIST_AREA_ITEMS} />;
        return <AreaPreview testId="find-area-encontrar" titleKey="find.area.encontrar.title" descriptionKey="find.area.encontrar.description" itemKeys={FIND_AREA_ITEMS} />;
      }}
    />
  );
}
