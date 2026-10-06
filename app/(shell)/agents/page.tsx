"use client";
// Página-esqueleto da rota /agents (RF48 Agentes — Copilot de testes; ABAS_POR_PERFIL.md / docs/diagramas/RF48): catálogo
// por fase + as entradas "Encontrar no dossiê" e "Extrair do dossiê" (Opções A e C do RF47 com o escopo do dossiê,
// RF48.CA13/CA14). Conteúdo real chega no RF48.
import { AreaPreview, EXTRACT_AREA_ITEMS } from "@/components/shell/AreaPreview";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/agents")!;

export default function Page() {
  return (
    <RfPage
      page={PAGE}
      renderTab={(slug) => {
        if (slug === "encontrar-no-dossie") return <AreaPreview testId="agents-area-encontrar" titleKey="agents.area.encontrar.title" descriptionKey="agents.area.encontrar.description" itemKeys={["find.area.encontrar.contexto", "find.area.encontrar.agrupar", "agents.area.encontrar.vincular"]} />;
        if (slug === "extrair-do-dossie") return <AreaPreview testId="agents-area-extrair" titleKey="agents.area.extrair.title" descriptionKey="agents.area.extrair.description" itemKeys={EXTRACT_AREA_ITEMS} />;
        return undefined;
      }}
    />
  );
}
