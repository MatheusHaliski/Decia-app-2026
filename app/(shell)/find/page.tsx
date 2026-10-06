"use client";
// Página-esqueleto da rota /find (RF47 Encontrar; ABAS_POR_PERFIL.md / docs/diagramas/RF47). Interface do card: Opção A
// (sub-aba Encontrar, palavra no contexto) + Opção C (sub-aba Extrair termos e entidades). Conteúdo real chega no RF47.
import { AreaPreview, EXTRACT_AREA_ITEMS, FIND_AREA_ITEMS } from "@/components/shell/AreaPreview";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/find")!;

export default function Page() {
  return (
    <RfPage
      page={PAGE}
      renderTab={(slug) => slug === "extrair"
        ? <AreaPreview testId="find-area-extrair" titleKey="find.area.extrair.title" descriptionKey="find.area.extrair.description" itemKeys={EXTRACT_AREA_ITEMS} />
        : <AreaPreview testId="find-area-encontrar" titleKey="find.area.encontrar.title" descriptionKey="find.area.encontrar.description" itemKeys={FIND_AREA_ITEMS} />}
    />
  );
}
